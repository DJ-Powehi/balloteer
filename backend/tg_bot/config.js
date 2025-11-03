// backend/config.js
require("dotenv").config();

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error("❌ BOT_TOKEN missing in .env");
}

// se não tiver PUBLIC_URL vamos usar polling no dev
const PUBLIC_URL = process.env.PUBLIC_URL || "";
const PORT = process.env.PORT || 8080;

// aqui depois colocamos as strings do Postgres
const DATABASE_URL = process.env.DATABASE_URL || null;

module.exports = {
  BOT_TOKEN,
  PUBLIC_URL,
  PORT,
  DATABASE_URL,
};
