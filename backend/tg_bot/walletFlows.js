// backend/tg_bot/walletFlows.js
const { InlineKeyboard } = require("grammy");
const crypto = require("crypto");
const bot = require("./bot");
const { PUBLIC_URL } = require("./config");
const { pendingWalletStates } = require("./state");
const { getWallet } = require("./db");
const { isPrivateChat } = require("./utils");

// /connect - Show wallet if exists, or generate link to create one
function registerConnectCommand() {
  bot.command("connect", async (ctx) => {
    // Only works in private chat (DM)
    if (!isPrivateChat(ctx)) {
      return ctx.reply(
        "⚠️ Use /connect in DM with me to view or create your wallet.",
        { reply_to_message_id: ctx.msg.message_id }
      );
    }

    const tgId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name || "User";
    
    // Check if user already has a wallet in database
    const existingWallet = await getWallet(tgId);
    
    if (existingWallet?.sol_address) {
      // User already has a wallet - show it
      const shortAddr = 
        existingWallet.sol_address.slice(0, 4) + 
        "..." + 
        existingWallet.sol_address.slice(-4);
      
      return ctx.reply(
        `✅ Your Solana Wallet\n\n` +
        `\`${existingWallet.sol_address}\`\n\n` +
        `Short: ${shortAddr}\n\n` +
        `💡 Your wallet is ready to vote!\n\n` +
        `• /join - Request voting access in a group\n` +
        `• /myvote - See open votes\n` +
        `• /help - See all commands`,
        { parse_mode: "Markdown" }
      );
    }
    
    // No wallet yet - generate secure state token
    const state = crypto.randomBytes(16).toString('hex');
    
    // Store state (expires in 10 minutes)
    pendingWalletStates.set(state, {
      tgId,
      createdAt: Date.now(),
    });

    // Build URL to Next.js onboard page
    const webAppUrl = PUBLIC_URL || 'https://kylan-untranscendental-victoriously.ngrok-free.dev';
    const url = `${webAppUrl}/onboard?state=${state}`;
    
    const keyboard = new InlineKeyboard()
      .url("🔐 Create Solana Wallet", url);

    await ctx.reply(
      `👋 Hello ${username}!\n\n` +
      `To create your secure Solana wallet, tap the button below.\n\n` +
      `⏱ The process takes ~10 seconds.\n\n` +
      `🔒 Your wallet is 100% private and only you have access.`,
      { reply_markup: keyboard }
    );
  });
}

// Helper to validate and resolve state token
// Called by the Next.js API endpoint
function resolveWalletState(state) {
  const entry = pendingWalletStates.get(state);
  if (!entry) return null;

  // Expire after 10 minutes
  if (Date.now() - entry.createdAt > 10 * 60 * 1000) {
    pendingWalletStates.delete(state);
    return null;
  }

  // Delete after use (single-use token)
  pendingWalletStates.delete(state);
  return entry.tgId;
}

module.exports = {
  registerConnectCommand,
  resolveWalletState,
};

