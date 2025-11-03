// backend/config.js
require("dotenv").config();

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error("❌ BOT_TOKEN missing in .env");
}

// PUBLIC_URL = where Telegram sends webhook updates (Railway backend)
const PUBLIC_URL = process.env.PUBLIC_URL || "";

// FRONTEND_URL = where users go to create wallets (Vercel frontend)
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.PUBLIC_URL || "";

const PORT = process.env.PORT || 8080;

// Database connection string
const DATABASE_URL = process.env.DATABASE_URL || null;

module.exports = {
  BOT_TOKEN,
  PUBLIC_URL,
  FRONTEND_URL,
  PORT,
  DATABASE_URL,
};
