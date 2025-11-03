// backend/index.js
const { PORT, PUBLIC_URL } = require("./config");
const bot = require("./bot");
const { createApp } = require("./routes");
const { initDB, createTables } = require("./db");

// registra TODOS os comandos/fluxos
const {
  registerStartCommand,
  registerJoinCommand,
  registerApproveRejectCallbacks,
  registerSetWeightFlow,
  registerHelpText,
} = require("./voterFlows");

const {
  registerNewCommand,
  registerCloseCommand,
  registerMyVoteCommand,
  registerDMVoteCallback,
} = require("./proposalFlows");

const {
  registerDMMessageHandler,
} = require("./dmFlows");

const {
  registerConnectCommand,
} = require("./walletFlows");

// 1. registrar handlers no bot
registerStartCommand(); // This now handles /start wallet_ok payload too
registerJoinCommand();
registerApproveRejectCallbacks();
registerSetWeightFlow();
registerHelpText();
registerNewCommand();
registerCloseCommand();
registerMyVoteCommand();
registerDMVoteCallback();
registerConnectCommand(); // /connect command

registerDMMessageHandler();

// 2. iniciar servidor express
(async () => {
  await bot.init(); // pega botInfo.username

  // Initialize database
  initDB();
  await createTables();

  const app = createApp();
  const server = app.listen(PORT, async () => {
    console.log(`🚀 API listening on port ${PORT}`);

    // se temos PUBLIC_URL → webhook
    if (PUBLIC_URL && !PUBLIC_URL.includes("localhost")) {
      try {
        await bot.api.deleteWebhook({ drop_pending_updates: true });
        await bot.api.setWebhook(`${PUBLIC_URL}/telegram/webhook`);
        console.log("📡 Webhook set to", `${PUBLIC_URL}/telegram/webhook`);
      } catch (e) {
        console.error("❌ Failed to set webhook:", e);
      }
    } else {
      // dev local → polling
      console.log("⚠️ No PUBLIC_URL → using long polling");
      bot.start();
    }
  });
})();
