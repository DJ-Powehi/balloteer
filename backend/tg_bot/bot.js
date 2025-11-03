// backend/bot.js
const { Bot } = require("grammy");
const { BOT_TOKEN } = require("./config");

const bot = new Bot(BOT_TOKEN);

// importantíssimo: deixa os handlers serem carregados ANTES de iniciar
module.exports = bot;
