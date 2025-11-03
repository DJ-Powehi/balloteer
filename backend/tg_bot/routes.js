// backend/routes.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const bot = require("./bot");
const { PUBLIC_URL } = require("./config");
const { resolveWalletState } = require("./walletFlows");
const { saveWallet } = require("./db");

function createApp() {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json());

  // health
  app.get("/", (req, res) => {
    res.status(200).send("Balloteer bot is running ✅");
  });

  // telegram webhook
  app.post("/telegram/webhook", async (req, res) => {
    try {
      await bot.handleUpdate(req.body);
      res.sendStatus(200);
    } catch (e) {
      console.error("❌ Webhook error:", e);
      res.sendStatus(500);
    }
  });

  // validate wallet creation state token
  // Called by Next.js /api/tg/complete endpoint
  app.post("/validate-wallet-state", (req, res) => {
    const { state } = req.body;
    
    if (!state) {
      return res.status(400).json({ ok: false, error: "Missing state" });
    }

    const tgId = resolveWalletState(state);
    
    if (!tgId) {
      return res.status(400).json({ ok: false, error: "Invalid or expired state" });
    }

    res.json({ ok: true, telegramId: tgId });
  });

  // Save wallet info after creation (UPSERT)
  // Called by Next.js /api/tg/complete endpoint
  app.post("/save-wallet", async (req, res) => {
    const { telegramId, solAddress, privyUserId } = req.body;

    if (!telegramId || !solAddress) {
      return res.status(400).json({ ok: false, error: "Missing telegramId or solAddress" });
    }

    try {
      const success = await saveWallet(Number(telegramId), solAddress, privyUserId);
      
      if (success) {
        console.log(`✅ Saved wallet for Telegram user ${telegramId}: ${solAddress}`);
        res.json({ ok: true });
      } else {
        res.status(500).json({ ok: false, error: "Failed to save wallet" });
      }
    } catch (error) {
      console.error("Error in /save-wallet:", error);
      res.status(500).json({ ok: false, error: "Database error" });
    }
  });

  return app;
}

module.exports = {
  createApp,
};
