// backend/dmFlows.js
const bot = require("./bot");
const {
  pendingCustomWeight,
  pendingSetWeight,
  draftProposal,
  adminsCommunities,
  communities,
} = require("./state");
const {
  isPrivateChat,
} = require("./utils");
const {
  isAdmin,
} = require("./community");
const { InlineKeyboard } = require("grammy");

// publica a proposal no grupo e DM votantes
async function publishDraft(adminId, groupId, draft) {
  const comm = communities[groupId];
  if (!comm) return;

  const newProposal = {
    id: comm.proposalCounter++,
    title: draft.title,
    options: draft.options,
    votes: {},
    voterMap: {},
    status: "open",
    quorumWeight: draft.quorumWeight,
    endsAt: draft.endsAt,
    createdBy: adminId,
    attachmentFileId: draft.attachmentFileId,
    attachmentFileName: draft.attachmentFileName,
  };
  comm.proposals.push(newProposal);

  // 1. attachment
  if (newProposal.attachmentFileId) {
    try {
      await bot.api.sendDocument(groupId, newProposal.attachmentFileId, {
        caption:
          `📎 Reference for Proposal #${newProposal.id}: "${newProposal.title}"\n` +
          (newProposal.attachmentFileName ? `(${newProposal.attachmentFileName})` : ""),
      });
    } catch (e) {}
  }

  // 2. announce
  const announce =
    `🗳 Voting is now OPEN: "${newProposal.title}"\n\n` +
    newProposal.options.map((opt, idx) => `• ${idx + 1}. ${opt}`).join("\n") +
    "\n\n" +
    (newProposal.endsAt
      ? "⏳ Closes at: " + new Date(newProposal.endsAt).toISOString() + "\n"
      : "") +
    (newProposal.quorumWeight !== null
      ? `Quorum required: ${newProposal.quorumWeight}\n`
      : "") +
    "\nI will DM approved voters now.";
  try {
    await bot.api.sendMessage(groupId, announce);
  } catch (e) {}

  // 3. DM voters
  const { formatProposalForDM, buildVoteDMKeyboard } = require("./proposalFlows");
  for (const [uidStr, voter] of Object.entries(comm.voters)) {
    const uid = Number(uidStr);
    if (!voter.approved || !voter.weight) continue;
    const introDM = formatProposalForDM(newProposal, voter.weight);
    try {
      await bot.api.sendMessage(uid, introDM, {
        reply_markup: buildVoteDMKeyboard(groupId, newProposal),
      });
    } catch (e) {}
  }

  // 4. DM admin confirm
  try {
    await bot.api.sendMessage(
      adminId,
      `✅ Proposal published to "${comm.title}".`
    );
  } catch (e) {}
}

function registerDMMessageHandler() {
  bot.on("message", async (ctx) => {
    const privateChat = isPrivateChat(ctx);
    const fromId = ctx.from?.id;
    if (!fromId) return;

    const isDoc = !!ctx.message?.document;
    const isText = typeof ctx.message?.text === "string";

    // (1) fluxo /setweight
    if (privateChat && pendingSetWeight[fromId]) {
      const flow = pendingSetWeight[fromId];

      // ASK_WEIGHT
      if (flow.step === "ASK_WEIGHT" && isText) {
        const newWeight = parseInt(ctx.message.text.trim(), 10);
        if (isNaN(newWeight) || newWeight <= 0) {
          return ctx.reply("Weight must be positive. Try again.");
        }
        flow.newWeight = newWeight;
        flow.step = "ASK_REASON";
        return ctx.reply("Reason for this change? (or 'skip')");
      }

      // ASK_REASON
      if (flow.step === "ASK_REASON" && isText) {
        const reasonRaw = ctx.message.text.trim();
        const reason = reasonRaw.toLowerCase() === "skip" ? "unspecified" : reasonRaw;
        const { groupId, targetUserId, newWeight } = flow;
        const comm = communities[groupId];
        if (!comm || !isAdmin(comm, fromId)) {
          delete pendingSetWeight[fromId];
          return ctx.reply("Flow cancelled (not admin anymore).");
        }
        const voter = comm.voters[targetUserId];
        if (!voter) {
          delete pendingSetWeight[fromId];
          return ctx.reply("User not found.");
        }

        voter.approved = true;
        voter.weight = newWeight;
        voter.processed = true;
        voter.lastChangeReason = reason;
        voter.lastModifiedAt = new Date().toISOString();

        delete pendingSetWeight[fromId];

        await ctx.reply(
          `✅ Updated ${voter.username} in "${comm.title}". New weight: ${newWeight}. Reason: ${reason}`
        );

        try {
          await bot.api.sendMessage(
            targetUserId,
            `ℹ️ Your voting weight in "${comm.title}" was updated.\nNew weight: ${newWeight}\nReason: ${reason}`
          );
        } catch (e) {}
        return;
      }
    }

    // (2) fluxo de custom weight primeira aprovação
    if (isText && pendingCustomWeight[fromId]) {
      const { groupId, targetUserId } = pendingCustomWeight[fromId];
      const comm = communities[groupId];
      if (!comm || !isAdmin(comm, fromId)) {
        delete pendingCustomWeight[fromId];
      } else {
        const wNum = parseInt(ctx.message.text.trim(), 10);
        if (!isNaN(wNum) && wNum > 0) {
          const voter = comm.voters[targetUserId];
          if (voter && !voter.processed) {
            voter.approved = true;
            voter.weight = wNum;
            voter.processed = true;
            voter.lastChangeReason = "initial approval (custom)";
            voter.lastModifiedAt = new Date().toISOString();

            await ctx.reply(
              `✅ Approved ${voter.username} in "${comm.title}" with weight ${wNum}.`
            );

            try {
              await bot.api.sendMessage(
                targetUserId,
                `🎉 You are approved to vote in "${comm.title}". Weight: ${wNum}.`
              );
            } catch (e) {}
          } else {
            await ctx.reply("User not found or already processed.");
          }
          delete pendingCustomWeight[fromId];
          return;
        } else {
          return ctx.reply("Weight must be a positive number. Try again.");
        }
      }
    }

    // (3) fluxo /new (draft)
    if (privateChat && draftProposal[fromId]) {
      const draft = draftProposal[fromId];

      // TITLE
      if (draft.step === "TITLE" && isText) {
        draft.title = ctx.message.text.trim();
        draft.step = "OPTIONS";
        return ctx.reply(
          "Now send options separated by comma.\nExample:\nPizza, Sushi, Burger"
        );
      }

      // OPTIONS
      if (draft.step === "OPTIONS" && isText) {
        const opts = ctx.message.text
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
        if (opts.length < 2) {
          return ctx.reply("Need at least 2 options.");
        }
        draft.options = opts;
        draft.step = "QUORUM";
        return ctx.reply(
          "Quorum (total weight) or 'skip'?\nExample: 30"
        );
      }

      // QUORUM
      if (draft.step === "QUORUM" && isText) {
        const txt = ctx.message.text.trim().toLowerCase();
        if (txt === "skip") {
          draft.quorumWeight = null;
        } else {
          const q = parseInt(txt, 10);
          if (isNaN(q) || q <= 0) {
            return ctx.reply("Quorum must be number or 'skip'.");
          }
          draft.quorumWeight = q;
        }
        draft.step = "DURATION";
        return ctx.reply("Duration (minutes)? Example: 60");
      }

      // DURATION
      if (draft.step === "DURATION" && isText) {
        const dur = parseInt(ctx.message.text.trim(), 10);
        if (isNaN(dur) || dur <= 0) {
          return ctx.reply("Duration must be positive minutes.");
        }
        draft.endsAt = Date.now() + dur * 60 * 1000;
        draft.step = "ATTACHMENT";
        return ctx.reply("Send attachment now or 'skip'.");
      }

      // ATTACHMENT
      if (draft.step === "ATTACHMENT") {
        if (isDoc) {
          draft.attachmentFileId = ctx.message.document.file_id;
          draft.attachmentFileName = ctx.message.document.file_name || null;
        } else if (isText && ctx.message.text.trim().toLowerCase() === "skip") {
          draft.attachmentFileId = null;
          draft.attachmentFileName = null;
        } else {
          return ctx.reply("Send a file or type 'skip'.");
        }

        // escolher comunidade
        const adminComms = adminsCommunities[fromId];
        if (!adminComms || adminComms.size === 0) {
          delete draftProposal[fromId];
          return ctx.reply("You are not admin of any community anymore.");
        }

        draft.step = "CHOOSE_COMMUNITY";
        const kb = new InlineKeyboard();
        for (const [gid, meta] of adminComms.entries()) {
          kb.text(`Publish to: ${meta.title}`, `publish_${gid}`).row();
        }
        return ctx.reply("Which community should receive this proposal?", {
          reply_markup: kb,
        });
      }
    }
  });

  // callback publish
  bot.callbackQuery(/publish_(-?\d+)/, async (ctx) => {
    const groupId = Number(ctx.match[1]);
    const adminId = ctx.from.id;
    const draft = draftProposal[adminId];
    if (!draft || draft.step !== "CHOOSE_COMMUNITY") {
      return ctx.answerCallbackQuery({ text: "No active draft.", show_alert: true });
    }

    await ctx.answerCallbackQuery({ text: "Publishing..." });
    delete draftProposal[adminId];

    await publishDraft(adminId, groupId, draft);
  });
}

module.exports = {
  registerDMMessageHandler,
};
