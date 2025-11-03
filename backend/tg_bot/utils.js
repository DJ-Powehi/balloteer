// backend/utils.js
const bot = require("./bot");

// pega id do chat de forma segura
function getChatId(ctx) {
  const chat =
    ctx.chat ||
    ctx.message?.chat ||
    ctx.update?.callback_query?.message?.chat;
  return chat ? chat.id : null;
}

function isPrivateChat(ctx) {
  const t =
    ctx.chat?.type ||
    ctx.message?.chat?.type ||
    ctx.update?.callback_query?.message?.chat?.type;
  return t === "private";
}

// barra de porcentagem
function makeBar(pct) {
  const barLength = 10;
  const filledLen = Math.round((pct / 100) * barLength);
  return "█".repeat(filledLen) + "░".repeat(barLength - filledLen);
}

// helper pro popup de callback
async function popup(ctx, text) {
  try {
    await ctx.answerCallbackQuery({
      text,
      show_alert: true,
    });
  } catch (e) {
    // ignore
  }
}

// manda DM mas não quebra o fluxo
async function safeDM(userId, text, extra = {}) {
  try {
    await bot.api.sendMessage(userId, text, extra);
  } catch (_) {}
}

module.exports = {
  getChatId,
  isPrivateChat,
  makeBar,
  popup,
  safeDM,
};
