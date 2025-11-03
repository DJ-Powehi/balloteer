// backend/proposalFlows.js
const { InlineKeyboard } = require("grammy");
const bot = require("./bot");
const {
  communities,
  adminsCommunities,
  draftProposal,
  waitingMyVoteSelection,
} = require("./state");
const {
  isPrivateChat,
  popup,
  safeDM,
} = require("./utils");
const {
  isAdmin,
  autoCloseExpiredProposals,
  isProposalOpenForVoting,
} = require("./community");

// format DM proposal
function formatProposalForDM(proposal, voterWeight) {
  const deadlineText = proposal.endsAt
    ? `Voting closes at: ${new Date(proposal.endsAt).toISOString()}\n`
    : "";
  const weightText = voterWeight != null ? `Your voting weight: ${voterWeight}\n` : "";
  return (
    `🗳 Proposal #${proposal.id}: "${proposal.title}"\n\n` +
    deadlineText +
    weightText +
    "Tap to cast or change your vote:\n"
  );
}

function buildVoteDMKeyboard(groupId, proposal) {
  const kb = new InlineKeyboard();
  proposal.options.forEach((opt, idx) => {
    kb.text(opt, `dmvote_${groupId}_${proposal.id}_${idx}`).row();
  });
  return kb;
}

// /new
function registerNewCommand() {
  bot.command("new", async (ctx) => {
    if (!isPrivateChat(ctx)) {
      return ctx.reply("Run /new in DM.");
    }

    const adminId = ctx.from.id;
    const adminComms = adminsCommunities[adminId];
    if (!adminComms || adminComms.size === 0) {
      return ctx.reply("You are not admin of any community.");
    }

    draftProposal[adminId] = {
      step: "TITLE",
      title: "",
      options: [],
      quorumWeight: null,
      endsAt: null,
      attachmentFileId: null,
      attachmentFileName: null,
    };

    await ctx.reply("📝 Proposal title?");
  });
}

// /close
function registerCloseCommand() {
  bot.command("close", async (ctx) => {
    if (!isPrivateChat(ctx)) {
      return ctx.reply("Run /close in DM.");
    }

    const adminId = ctx.from.id;
    const adminComms = adminsCommunities[adminId];
    if (!adminComms || adminComms.size === 0) {
      return ctx.reply("You don't administer any community.");
    }

    const kb = new InlineKeyboard();
    let foundAny = false;

    for (const [gidStr, meta] of adminComms.entries()) {
      const gid = Number(gidStr);
      const comm = communities[gid];
      if (!comm) continue;
      if (!isAdmin(comm, adminId)) continue;

      await autoCloseExpiredProposals(gid);

      comm.proposals.forEach((p) => {
        if (isProposalOpenForVoting(p)) {
          foundAny = true;
          kb.text(`Close #${p.id} (${meta.title})`, `admclose_${gid}_${p.id}`).row();
        }
      });
    }

    if (!foundAny) {
      return ctx.reply("No open proposals to close.");
    }

    await ctx.reply("Which proposal do you want to close?", {
      reply_markup: kb,
    });
  });

  // callback close
  bot.callbackQuery(/admclose_(-?\d+)_(-?\d+)/, async (ctx) => {
    const groupId = Number(ctx.match[1]);
    const proposalId = Number(ctx.match[2]);

    const comm = communities[groupId];
    if (!comm) return popup(ctx, "Community not found.");
    if (!isAdmin(comm, ctx.from.id)) return popup(ctx, "Not admin.");

    await autoCloseExpiredProposals(groupId);

    const proposal = comm.proposals.find((p) => p.id === proposalId);
    if (!proposal) return popup(ctx, "Proposal not found.");
    if (proposal.status === "closed") return popup(ctx, "Already closed.");

    // reusa finalize do community
    const { finalizeProposal } = require("./community");
    await ctx.answerCallbackQuery({ text: "Closing..." });
    await finalizeProposal(comm, groupId, proposal);

    await safeDM(
      ctx.from.id,
      `🔒 Proposal #${proposal.id} (“${proposal.title}”) closed.`
    );
  });
}

// /myvote
function registerMyVoteCommand() {
  bot.command("myvote", async (ctx) => {
    if (!isPrivateChat(ctx)) {
      return ctx.reply("Use /myvote in DM.");
    }

    const txt = ctx.message.text.trim();
    const parts = txt.split(/\s+/);

    if (parts.length >= 2) {
      const proposalId = Number(parts[1]);
      if (isNaN(proposalId)) {
        return ctx.reply("Usage:\n/myvote\nor\n/myvote <proposalId>");
      }
      await handleMyVoteDetail(ctx, ctx.from.id, proposalId);
      return;
    }

    const kb = buildMyVoteKeyboardForUser(ctx.from.id);
    if (!kb) {
      return ctx.reply("No open proposals for you right now.");
    }

    waitingMyVoteSelection[ctx.from.id] = true;
    await ctx.reply("Choose a proposal to review/change:", {
      reply_markup: kb,
    });
  });

  // callback myvote
  bot.callbackQuery(/myvote_(-?\d+)_(-?\d+)/, async (ctx) => {
    const groupId = Number(ctx.match[1]);
    const proposalId = Number(ctx.match[2]);
    const userId = ctx.from.id;

    if (!waitingMyVoteSelection[userId]) {
      return popup(ctx, "Run /myvote first.");
    }

    await ctx.answerCallbackQuery();
    await handleMyVoteDetail(ctx, userId, proposalId);
  });
}

function buildMyVoteKeyboardForUser(userId) {
  const { communities } = require("./state");
  const kb = new InlineKeyboard();
  let foundAny = false;

  for (const [gidStr, comm] of Object.entries(communities)) {
    const gid = Number(gidStr);
    const voter = comm.voters[userId];
    if (!voter || !voter.approved || !voter.weight) continue;

    comm.proposals.forEach((p) => {
      if (isProposalOpenForVoting(p)) {
        foundAny = true;
        kb.text(`#${p.id} ${p.title}`, `myvote_${gid}_${p.id}`).row();
      }
    });
  }

  return foundAny ? kb : null;
}

async function handleMyVoteDetail(ctx, userId, proposalId) {
  const { communities } = require("./state");
  let foundComm = null;
  let foundProposal = null;
  let foundGroupId = null;

  for (const [gidStr, comm] of Object.entries(communities)) {
    const gid = Number(gidStr);
    const voter = comm.voters[userId];
    if (!voter || !voter.approved || !voter.weight) continue;

    const p = comm.proposals.find((x) => x.id === proposalId);
    if (!p) continue;

    foundComm = comm;
    foundProposal = p;
    foundGroupId = gid;
    break;
  }

  if (!foundProposal) {
    return ctx.reply("Proposal not found for you.");
  }

  await autoCloseExpiredProposals(foundGroupId);
  if (!isProposalOpenForVoting(foundProposal)) {
    return ctx.reply("This proposal is closed.");
  }

  const voter = foundComm.voters[userId];
  const weight = voter.weight || 0;
  const currentIdx = foundProposal.voterMap[userId];
  const currentChoice = currentIdx !== undefined
    ? foundProposal.options[currentIdx]
    : "(no vote yet)";

  const kb = new InlineKeyboard();
  foundProposal.options.forEach((opt, idx) => {
    kb.text(opt, `dmvote_${foundGroupId}_${foundProposal.id}_${idx}`).row();
  });

  await ctx.reply(
    `Proposal #${foundProposal.id}: "${foundProposal.title}"\n` +
      `Your current vote: ${currentChoice}\n` +
      `Your weight: ${weight}\n\n` +
      "Tap to change:",
    { reply_markup: kb }
  );
}

// votar mesmo (callback)
function registerDMVoteCallback() {
  const {
    communities,
  } = require("./state");
  const {
    autoCloseExpiredProposals,
    isProposalOpenForVoting,
  } = require("./community");

  bot.callbackQuery(/dmvote_(-?\d+)_(-?\d+)_(\d+)/, async (ctx) => {
    const groupId = Number(ctx.match[1]);
    const proposalId = Number(ctx.match[2]);
    const optionIdx = Number(ctx.match[3]);
    const userId = ctx.from.id;

    const comm = communities[groupId];
    if (!comm) return popup(ctx, "Community not found.");

    await autoCloseExpiredProposals(groupId);

    const proposal = comm.proposals.find((p) => p.id === proposalId);
    if (!proposal) return popup(ctx, "Proposal not found.");
    if (!isProposalOpenForVoting(proposal)) return popup(ctx, "Voting closed.");

    const voter = comm.voters[userId];
    if (!voter || !voter.approved || !voter.weight) {
      return popup(ctx, "You are not approved here.");
    }

    // remove voto anterior
    if (proposal.voterMap[userId] !== undefined) {
      const oldIdx = proposal.voterMap[userId];
      proposal.votes[oldIdx] =
        (proposal.votes[oldIdx] || 0) - voter.weight;
      if (proposal.votes[oldIdx] < 0) proposal.votes[oldIdx] = 0;
    }

    // adiciona novo
    proposal.voterMap[userId] = optionIdx;
    proposal.votes[optionIdx] =
      (proposal.votes[optionIdx] || 0) + voter.weight;

    await ctx.answerCallbackQuery({ text: "✅ Vote counted" });

    await safeDM(
      userId,
      `✅ Your vote for "${proposal.title}" was recorded.\nWeight: ${voter.weight}\n(Your choice stays hidden)`
    );
  });
}

module.exports = {
  registerNewCommand,
  registerCloseCommand,
  registerMyVoteCommand,
  registerDMVoteCallback,
  formatProposalForDM,
  buildVoteDMKeyboard,
};
