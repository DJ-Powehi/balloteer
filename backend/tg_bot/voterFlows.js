// backend/voterFlows.js
// Handles voter registration, approval, and weight management
const { InlineKeyboard } = require("grammy");
const bot = require("./bot");
const { pendingCustomWeight, pendingSetWeight } = require("./state");
const { getChatId, isPrivateChat, popup, safeDM } = require("./utils");
const {
  createCommunity,
  getCommunity,
  updateCommunityAdmin,
  getAllCommunitiesForAdmin,
  addVoter,
  getVoter,
  approveVoter,
  setVoterWeight,
  getAllVotersInCommunity,
  getApprovedVotersInCommunity,
  getVotersByTelegramId,
} = require("./db");

// /start
function registerStartCommand() {
  bot.command("start", async (ctx) => {
    // Check for wallet creation callback payload first
    const payload = ctx.match?.trim();
    if (payload === "wallet_ok") {
      return ctx.reply(
        "✅ Solana wallet created successfully!\n\n" +
        "Your wallet is ready to vote. Now you can:\n\n" +
        "• /connect - View your wallet (if you want to see it again)\n" +
        "• /join - Request voting access in a group\n" +
        "• /myvote - See open votes\n" +
        "• /help - See all commands"
      );
    }

    const chatId = getChatId(ctx);
    if (chatId === null) return;

    if (!isPrivateChat(ctx)) {
      // Group chat
      const groupTitle = ctx.chat?.title || `Community ${chatId}`;
      
      // Create or get community
      let comm = await getCommunity(chatId);
      let justAssignedAdmin = false;
      
      if (!comm) {
        // New community - create it and assign first admin
        comm = await createCommunity(chatId, groupTitle, ctx.from.id);
        justAssignedAdmin = true;
      } else if (!comm.admin_id) {
        // Existing community but no admin - assign one
        await updateCommunityAdmin(chatId, ctx.from.id);
        comm.admin_id = ctx.from.id;
        justAssignedAdmin = true;
      }

      // Add the user as a voter (if not already)
      await addVoter(
        chatId,
        ctx.from.id,
        ctx.from.username || null,
        ctx.from.first_name || null
      );

      await ctx.reply(
        "👋 Balloteer activated here.\n" +
          "• Members: DM me and send /join to request voting access.\n" +
          "• Admin: create votes in DM with /new.\n" +
          "• Final results are posted here.\n\n" +
          "If you didn't get a DM yet, open DM with me and send /start."
      );

      if (justAssignedAdmin) {
        await safeDM(
          ctx.from.id,
          `You are ADMIN ✅ of "${comm.title}".\n\n` +
            "Create proposal: /new\n" +
            "Close: /close\n" +
            "Change weight: /setweight\n"
        );
      }

      return;
    }

    // Private chat
    await ctx.reply(
      "👋 I'm Balloteer.\n" +
        "• /connect → view or create your Solana wallet\n" +
        "• /join → ask to vote in groups I'm in\n" +
        "• /myvote → see open votes for you\n" +
        "• admin: /new, /close, /setweight\n"
    );
  });
}

// /join - Request voting access
function registerJoinCommand() {
  bot.command("join", async (ctx) => {
    if (!isPrivateChat(ctx)) {
      await safeDM(
        ctx.from.id,
        "To request voting, send /join here in DM."
      );
      return;
    }

    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name || "User";
    
    try {
      // Get all communities where this user is registered
      const voterRows = await getVotersByTelegramId(userId);
      
      if (voterRows.length === 0) {
        return ctx.reply(
          "❌ You're not registered in any community yet.\n\n" +
          "To join:\n" +
          "1. Ask admin to add me to your group\n" +
          "2. Have admin send /start in the group\n" +
          "3. Try /join again"
        );
      }
      
      let notifiedAny = false;
      
      for (const voterRow of voterRows) {
        const chatId = voterRow.chat_id;
        
        // Skip if already approved
        if (voterRow.approved) continue;
        
        const comm = await getCommunity(chatId);
        if (!comm || !comm.admin_id) continue;
        
        // Send approval request to admin
        const kb = new InlineKeyboard()
          .text("Approve (1)", `approve_${chatId}_${userId}_1`).row()
          .text("Approve (3)", `approve_${chatId}_${userId}_3`).row()
          .text("Approve (custom)", `custom_${chatId}_${userId}`).row()
          .text("Reject", `reject_${chatId}_${userId}`);
        
        await safeDM(
          comm.admin_id,
          "🔔 New voter request:\n" +
            `Community: ${comm.title} (id ${chatId})\n` +
            `User: ${ctx.from.username ? "@" + ctx.from.username : username}\n` +
            `ID: ${userId}\n\nChoose:`,
          { reply_markup: kb }
        );
        notifiedAny = true;
      }
      
      if (notifiedAny) {
        await ctx.reply("✅ Request sent to admins. You'll be notified if approved.");
      } else {
        await ctx.reply(
          "ℹ️ You're already approved in all groups, or admins haven't been set yet.\n\n" +
          "Use /myvote to see open proposals."
        );
      }
      
    } catch (error) {
      console.error("Error in /join command:", error);
      await ctx.reply("❌ An error occurred. Please try again later.");
    }
  });
}

// Approve/Reject voter callbacks
function registerApproveRejectCallbacks() {
  // Approve with fixed weight
  bot.callbackQuery(/approve_(-?\d+)_(-?\d+)_(\d+)/, async (ctx) => {
    const groupId = Number(ctx.match[1]);
    const targetUserId = Number(ctx.match[2]);
    const weight = Number(ctx.match[3]);

    const comm = await getCommunity(groupId);
    if (!comm) return popup(ctx, "Community not found.");
    // Convert to Number for comparison (admin_id from DB might be string)
    if (Number(comm.admin_id) !== Number(ctx.from.id)) {
      return popup(ctx, "Not admin.");
    }

    const voter = await getVoter(groupId, targetUserId);
    if (!voter) return popup(ctx, "User not found.");
    if (voter.approved) return popup(ctx, "Already processed.");

    // Approve voter and set weight
    await approveVoter(groupId, targetUserId);
    await setVoterWeight(groupId, targetUserId, weight);

    await ctx.answerCallbackQuery({ text: "Approved" });
    await ctx.reply(
      `✅ Approved ${voter.username || voter.first_name || 'user'} in "${comm.title}" with weight ${weight}.`
    );

    await safeDM(
      targetUserId,
      `🎉 You can vote in "${comm.title}". Weight: ${weight}.`
    );
  });

  // Custom weight callback
  bot.callbackQuery(/custom_(-?\d+)_(-?\d+)/, async (ctx) => {
    const groupId = Number(ctx.match[1]);
    const targetUserId = Number(ctx.match[2]);

    const comm = await getCommunity(groupId);
    if (!comm) return popup(ctx, "Community not found.");
    // Convert to Number for comparison (admin_id from DB might be string)
    if (Number(comm.admin_id) !== Number(ctx.from.id)) {
      return popup(ctx, "Not admin.");
    }

    const voter = await getVoter(groupId, targetUserId);
    if (!voter) return popup(ctx, "User not found.");
    if (voter.approved) return popup(ctx, "Already processed.");

    pendingCustomWeight[ctx.from.id] = { groupId, targetUserId };

    await ctx.answerCallbackQuery();
    await safeDM(
      ctx.from.id,
      `Send custom weight for ${voter.username || voter.first_name || 'user'} in "${comm.title}". Example: 5`
    );
  });

  // Reject callback
  bot.callbackQuery(/reject_(-?\d+)_(-?\d+)/, async (ctx) => {
    const groupId = Number(ctx.match[1]);
    const targetUserId = Number(ctx.match[2]);

    const comm = await getCommunity(groupId);
    if (!comm) return popup(ctx, "Community not found.");
    // Convert to Number for comparison (admin_id from DB might be string)
    if (Number(comm.admin_id) !== Number(ctx.from.id)) {
      return popup(ctx, "Not admin.");
    }

    const voter = await getVoter(groupId, targetUserId);
    if (!voter) return popup(ctx, "User not found.");
    if (voter.approved) return popup(ctx, "Already processed.");

    // Mark as rejected (weight = 0, not approved)
    await setVoterWeight(groupId, targetUserId, 0);

    await ctx.answerCallbackQuery({ text: "Rejected" });
    await ctx.reply(
      `❌ Rejected ${voter.username || voter.first_name || 'user'} in "${comm.title}".`
    );

    await safeDM(
      targetUserId,
      `❌ Your request to vote in "${comm.title}" was rejected.`
    );
  });
}

// /setweight - Change voter weight
function registerSetWeightFlow() {
  bot.command("setweight", async (ctx) => {
    if (!isPrivateChat(ctx)) {
      return ctx.reply("Use /setweight here in DM.");
    }

    const adminId = ctx.from.id;
    const adminComms = await getAllCommunitiesForAdmin(adminId);
    
    if (!adminComms || adminComms.length === 0) {
      return ctx.reply("You don't administer any community.");
    }

    pendingSetWeight[adminId] = {
      step: "CHOOSE_COMMUNITY",
      groupId: null,
      targetUserId: null,
      newWeight: null,
    };

    const kb = new InlineKeyboard();
    for (const comm of adminComms) {
      kb.text(comm.title, `sw_comm_${comm.chat_id}`).row();
    }

    await ctx.reply("Which community?", { reply_markup: kb });
  });

  // Choose community
  bot.callbackQuery(/sw_comm_(-?\d+)/, async (ctx) => {
    const adminId = ctx.from.id;
    const flow = pendingSetWeight[adminId];
    if (!flow) return popup(ctx, "No active /setweight flow.");

    const groupId = Number(ctx.match[1]);
    const comm = await getCommunity(groupId);
    if (!comm) return popup(ctx, "Community not found.");
    if (Number(comm.admin_id) !== Number(adminId)) return popup(ctx, "Not admin.");

    flow.groupId = groupId;
    flow.step = "CHOOSE_USER";

    const voters = await getApprovedVotersInCommunity(groupId);
    const kb = new InlineKeyboard();
    
    if (voters.length === 0) {
      await ctx.answerCallbackQuery();
      await bot.api.sendMessage(adminId, "No approved voters there.");
      delete pendingSetWeight[adminId];
      return;
    }

    for (const voter of voters) {
      const displayName = voter.username || voter.first_name || `User ${voter.telegram_id}`;
      kb.text(`${displayName} (wt ${voter.weight})`, `sw_user_${voter.telegram_id}`).row();
    }

    await ctx.answerCallbackQuery();
    await bot.api.sendMessage(
      adminId,
      `Who to update in "${comm.title}"?`,
      { reply_markup: kb }
    );
  });

  // Choose user
  bot.callbackQuery(/sw_user_(-?\d+)/, async (ctx) => {
    const adminId = ctx.from.id;
    const flow = pendingSetWeight[adminId];
    if (!flow || flow.step !== "CHOOSE_USER") {
      return popup(ctx, "No active /setweight flow.");
    }

    const targetUserId = Number(ctx.match[1]);
    flow.targetUserId = targetUserId;
    flow.step = "ASK_WEIGHT";

    await ctx.answerCallbackQuery();
    await bot.api.sendMessage(
      adminId,
      "Send NEW weight (number). Example: 5"
    );
  });
}

function registerHelpText() {
  bot.command("help", async (ctx) => {
    const isDM = ctx.chat?.type === "private";

    const text =
      "🤖 Balloteer — commands\n\n" +
      "/start – register a group (in group) or show intro (in DM)\n" +
      "/connect – view or create your Solana wallet (DM)\n" +
      "/join – request to become a voter (DM)\n" +
      "/myvote – see or change your current vote (DM)\n\n" +
      "Admin (DM only):\n" +
      "/new – create a private ballot for the group\n" +
      "/close – close an open proposal and post the result\n" +
      "/setweight – change someone's voting weight (with reason)\n";

    if (isDM) {
      await ctx.reply(
        text + "\nFull flow is in the web Guide (/guide page)."
      );
    } else {
      await ctx.reply(text);
    }
  });
}

module.exports = {
  registerStartCommand,
  registerJoinCommand,
  registerApproveRejectCallbacks,
  registerSetWeightFlow,
  registerHelpText,
};
