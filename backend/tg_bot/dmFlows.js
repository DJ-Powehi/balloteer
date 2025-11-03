// backend/dmFlows.js
// Handles DM conversations for proposal creation and weight management
const bot = require("./bot");
const {
  pendingCustomWeight,
  pendingSetWeight,
  draftProposal,
} = require("./state");
const { isPrivateChat } = require("./utils");
const { InlineKeyboard } = require("grammy");
const {
  getCommunity,
  getAllCommunitiesForAdmin,
  getVoter,
  approveVoter,
  setVoterWeight,
  getApprovedVotersInCommunity,
  createProposal,
} = require("./db");

// Publish draft proposal to group and notify voters
async function publishDraft(adminId, chatId, draft) {
  const comm = await getCommunity(chatId);
  if (!comm) return;

  // Generate unique proposal ID: chatId_timestamp
  const proposalId = `c${chatId}_p${Date.now()}`;

  // Create proposal in database
  const newProposal = await createProposal(
    proposalId,
    chatId,
    draft.title,
    draft.description || "",
    draft.options,
    adminId
  );

  if (!newProposal) {
    try {
      await bot.api.sendMessage(adminId, "❌ Failed to create proposal.");
    } catch (e) {}
    return;
  }

  // 1. Announce in group
  const announce =
    `🗳 Voting is now OPEN: "${newProposal.title}"\n\n` +
    newProposal.options.map((opt, idx) => `• ${idx + 1}. ${opt}`).join("\n") +
    "\n\nI will DM approved voters now.";
  
  try {
    await bot.api.sendMessage(chatId, announce);
  } catch (e) {
    console.error("Failed to announce in group:", e);
  }

  // 2. DM approved voters
  const { formatProposalForDM, buildVoteDMKeyboard } = require("./proposalFlows");
  const voters = await getApprovedVotersInCommunity(chatId);
  
  for (const voter of voters) {
    if (!voter.approved || !voter.weight) continue;
    
    const introDM = formatProposalForDM(newProposal, voter.weight);
    try {
      await bot.api.sendMessage(voter.telegram_id, introDM, {
        reply_markup: buildVoteDMKeyboard(proposalId, newProposal.options),
      });
    } catch (e) {
      console.error(`Failed to DM voter ${voter.telegram_id}:`, e);
    }
  }

  // 3. Confirm to admin
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

    // (1) /setweight flow
    if (privateChat && pendingSetWeight[fromId]) {
      const flow = pendingSetWeight[fromId];

      // ASK_WEIGHT step
      if (flow.step === "ASK_WEIGHT" && isText) {
        const newWeight = parseInt(ctx.message.text.trim(), 10);
        if (isNaN(newWeight) || newWeight <= 0) {
          return ctx.reply("Weight must be positive. Try again.");
        }
        flow.newWeight = newWeight;
        flow.step = "ASK_REASON";
        return ctx.reply("Reason for this change? (or 'skip')");
      }

      // ASK_REASON step
      if (flow.step === "ASK_REASON" && isText) {
        const reasonRaw = ctx.message.text.trim();
        const reason = reasonRaw.toLowerCase() === "skip" ? "unspecified" : reasonRaw;
        const { groupId, targetUserId, newWeight } = flow;
        
        const comm = await getCommunity(groupId);
        if (!comm || comm.admin_id !== fromId) {
          delete pendingSetWeight[fromId];
          return ctx.reply("Flow cancelled (not admin anymore).");
        }
        
        const voter = await getVoter(groupId, targetUserId);
        if (!voter) {
          delete pendingSetWeight[fromId];
          return ctx.reply("User not found.");
        }

        // Update weight
        await setVoterWeight(groupId, targetUserId, newWeight);
        delete pendingSetWeight[fromId];

        await ctx.reply(
          `✅ Updated ${voter.username || voter.first_name || 'user'} in "${comm.title}". New weight: ${newWeight}. Reason: ${reason}`
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

    // (2) Custom weight flow (first approval)
    if (isText && pendingCustomWeight[fromId]) {
      const { groupId, targetUserId } = pendingCustomWeight[fromId];
      const comm = await getCommunity(groupId);
      
      if (!comm || comm.admin_id !== fromId) {
        delete pendingCustomWeight[fromId];
      } else {
        const wNum = parseInt(ctx.message.text.trim(), 10);
        if (!isNaN(wNum) && wNum > 0) {
          const voter = await getVoter(groupId, targetUserId);
          if (voter && !voter.approved) {
            await approveVoter(groupId, targetUserId);
            await setVoterWeight(groupId, targetUserId, wNum);

            await ctx.reply(
              `✅ Approved ${voter.username || voter.first_name || 'user'} in "${comm.title}" with weight ${wNum}.`
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

    // (3) /new flow (draft proposal)
    if (privateChat && draftProposal[fromId]) {
      const draft = draftProposal[fromId];

      // TITLE step
      if (draft.step === "TITLE" && isText) {
        draft.title = ctx.message.text.trim();
        draft.step = "OPTIONS";
        return ctx.reply(
          "Now send options separated by comma.\nExample:\nPizza, Sushi, Burger"
        );
      }

      // OPTIONS step
      if (draft.step === "OPTIONS" && isText) {
        const opts = ctx.message.text
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
        if (opts.length < 2) {
          return ctx.reply("Need at least 2 options.");
        }
        draft.options = opts;
        draft.step = "CHOOSE_COMMUNITY";
        
        // Get admin communities
        const adminComms = await getAllCommunitiesForAdmin(fromId);
        if (!adminComms || adminComms.length === 0) {
          delete draftProposal[fromId];
          return ctx.reply("You are not admin of any community anymore.");
        }

        const kb = new InlineKeyboard();
        for (const comm of adminComms) {
          kb.text(`Publish to: ${comm.title}`, `publish_${comm.chat_id}`).row();
        }
        return ctx.reply("Which community should receive this proposal?", {
          reply_markup: kb,
        });
      }
    }
  });

  // Callback: publish proposal to community
  bot.callbackQuery(/publish_(-?\d+)/, async (ctx) => {
    const chatId = Number(ctx.match[1]);
    const adminId = ctx.from.id;
    const draft = draftProposal[adminId];
    
    if (!draft || draft.step !== "CHOOSE_COMMUNITY") {
      return ctx.answerCallbackQuery({ text: "No active draft.", show_alert: true });
    }

    await ctx.answerCallbackQuery({ text: "Publishing..." });
    delete draftProposal[adminId];

    await publishDraft(adminId, chatId, draft);
  });
}

module.exports = {
  registerDMMessageHandler,
};
