// backend/voterFlows.js
const { InlineKeyboard } = require("grammy");
const bot = require("./bot");
const {
  communities,
  adminsCommunities,
  pendingCustomWeight,
  pendingSetWeight,
} = require("./state");
const {
  getChatId,
  isPrivateChat,
  popup,
  safeDM,
} = require("./utils");
const {
  ensureCommunity,
  linkAdminToCommunity,
  getOrInitVoterRecord,
  isAdmin,
} = require("./community");

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
      // grupo
      const groupTitle = ctx.chat?.title || `Community ${chatId}`;
      const comm = ensureCommunity(chatId, groupTitle);

      let justAssignedAdmin = false;
      if (comm.adminId === null) {
        comm.adminId = ctx.from.id;
        justAssignedAdmin = true;
      }
      linkAdminToCommunity(comm.adminId, chatId, comm.title);

      getOrInitVoterRecord(comm, ctx.from);

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

    // privado
    await ctx.reply(
      "👋 I'm Balloteer.\n" +
        "• /connect → view or create your Solana wallet\n" +
        "• /join → ask to vote in groups I'm in\n" +
        "• /myvote → see open votes for you\n" +
        "• admin: /new, /close, /setweight\n"
    );
  });
}

// /join
function registerJoinCommand() {
  bot.command("join", async (ctx) => {
    if (!isPrivateChat(ctx)) {
      // pediu no grupo
      await safeDM(
        ctx.from.id,
        "To request voting, send /join here in DM."
      );
      return;
    }

    const userId = ctx.from.id;
    const communityIds = Object.keys(communities).map(Number);

    if (communityIds.length === 0) {
      await ctx.reply("No active communities. Ask admin to /start me in a group.");
      return;
    }

    let notifiedAny = false;

    for (const gid of communityIds) {
      const comm = communities[gid];
      if (!comm || !comm.adminId) continue;

      const voter = getOrInitVoterRecord(comm, ctx.from);
      if (voter.processed === true) continue;

      const kb = new InlineKeyboard()
        .text("Approve (1)", `approve_${gid}_${userId}_1`).row()
        .text("Approve (3)", `approve_${gid}_${userId}_3`).row()
        .text("Approve (custom)", `custom_${gid}_${userId}`).row()
        .text("Reject", `reject_${gid}_${userId}`);

      await safeDM(
        comm.adminId,
        "🔔 New voter request:\n" +
          `Community: ${comm.title} (id ${gid})\n` +
          `User: ${ctx.from.username ? "@" + ctx.from.username : ctx.from.first_name}\n` +
          `ID: ${userId}\n\nChoose:`,
        { reply_markup: kb }
      );
      notifiedAny = true;
    }

    if (notifiedAny) {
      await ctx.reply("✅ Request sent to admins. You'll be notified if approved.");
    } else {
      await ctx.reply("Couldn't notify admins. Ask them to /start me in DM.");
    }
  });
}

// aprova weight fixo
function registerApproveRejectCallbacks() {
  // approve fixed
  bot.callbackQuery(/approve_(-?\d+)_(-?\d+)_(\d+)/, async (ctx) => {
    const groupId = Number(ctx.match[1]);
    const targetUserId = Number(ctx.match[2]);
    const weight = Number(ctx.match[3]);

    const comm = communities[groupId];
    if (!comm) return popup(ctx, "Community not found.");
    if (!isAdmin(comm, ctx.from.id)) return popup(ctx, "Not admin.");

    const voter = comm.voters[targetUserId];
    if (!voter) return popup(ctx, "User not found.");
    if (voter.processed) return popup(ctx, "Already processed.");

    voter.approved = true;
    voter.weight = weight;
    voter.processed = true;
    voter.lastChangeReason = "initial approval";
    voter.lastModifiedAt = new Date().toISOString();

    await ctx.answerCallbackQuery({ text: "Approved" });
    await ctx.reply(
      `✅ Approved ${voter.username} in "${comm.title}" with weight ${weight}.`
    );

    await safeDM(
      targetUserId,
      `🎉 You can vote in "${comm.title}". Weight: ${weight}.`
    );
  });

  // custom weight
  bot.callbackQuery(/custom_(-?\d+)_(-?\d+)/, async (ctx) => {
    const groupId = Number(ctx.match[1]);
    const targetUserId = Number(ctx.match[2]);

    const comm = communities[groupId];
    if (!comm) return popup(ctx, "Community not found.");
    if (!isAdmin(comm, ctx.from.id)) return popup(ctx, "Not admin.");

    const voter = comm.voters[targetUserId];
    if (!voter) return popup(ctx, "User not found.");
    if (voter.processed) return popup(ctx, "Already processed.");

    pendingCustomWeight[ctx.from.id] = { groupId, targetUserId };

    await ctx.answerCallbackQuery();
    await safeDM(
      ctx.from.id,
      `Send custom weight for ${voter.username} in "${comm.title}". Example: 5`
    );
  });

  // reject
  bot.callbackQuery(/reject_(-?\d+)_(-?\d+)/, async (ctx) => {
    const groupId = Number(ctx.match[1]);
    const targetUserId = Number(ctx.match[2]);

    const comm = communities[groupId];
    if (!comm) return popup(ctx, "Community not found.");
    if (!isAdmin(comm, ctx.from.id)) return popup(ctx, "Not admin.");

    const voter = comm.voters[targetUserId];
    if (!voter) return popup(ctx, "User not found.");
    if (voter.processed) return popup(ctx, "Already processed.");

    voter.approved = false;
    voter.weight = null;
    voter.processed = true;
    voter.lastChangeReason = "rejected by admin";
    voter.lastModifiedAt = new Date().toISOString();

    await ctx.answerCallbackQuery({ text: "Rejected" });
    await ctx.reply(
      `❌ Rejected ${voter.username} in "${comm.title}".`
    );

    await safeDM(
      targetUserId,
      `❌ Your request to vote in "${comm.title}" was rejected.`
    );
  });
}

// /setweight flow
function registerSetWeightFlow() {
  bot.command("setweight", async (ctx) => {
    if (!isPrivateChat(ctx)) {
      return ctx.reply("Use /setweight here in DM.");
    }

    const adminId = ctx.from.id;
    const adminComms = adminsCommunities[adminId];
    if (!adminComms || adminComms.size === 0) {
      return ctx.reply("You don't administer any community.");
    }

    pendingSetWeight[adminId] = {
      step: "CHOOSE_COMMUNITY",
      groupId: null,
      targetUserId: null,
      newWeight: null,
    };

    const kb = new InlineKeyboard();
    for (const [gid, meta] of adminComms.entries()) {
      kb.text(meta.title, `sw_comm_${gid}`).row();
    }

    await ctx.reply("Which community?", { reply_markup: kb });
  });

  // choose community
  bot.callbackQuery(/sw_comm_(-?\d+)/, async (ctx) => {
    const adminId = ctx.from.id;
    const flow = pendingSetWeight[adminId];
    if (!flow) return popup(ctx, "No active /setweight flow.");

    const groupId = Number(ctx.match[1]);
    const comm = communities[groupId];
    if (!comm) return popup(ctx, "Community not found.");
    if (!isAdmin(comm, adminId)) return popup(ctx, "Not admin.");

    flow.groupId = groupId;
    flow.step = "CHOOSE_USER";

    const kb = new InlineKeyboard();
    let foundAny = false;
    for (const [uidStr, voter] of Object.entries(comm.voters)) {
      const uid = Number(uidStr);
      if (voter.approved && voter.weight !== null) {
        foundAny = true;
        kb.text(`${voter.username} (wt ${voter.weight})`, `sw_user_${uid}`).row();
      }
    }

    await ctx.answerCallbackQuery();
    if (!foundAny) {
      await bot.api.sendMessage(adminId, "No approved voters there.");
      delete pendingSetWeight[adminId];
      return;
    }

    await bot.api.sendMessage(
      adminId,
      `Who to update in "${comm.title}"?`,
      { reply_markup: kb }
    );
  });

  // choose user
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
