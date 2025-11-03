// bot-wallet-command.js
// Add this to your Telegram bot code

import { Telegraf } from 'telegraf';
import crypto from 'crypto';

const bot = new Telegraf(process.env.BOT_TOKEN);

// Import the state storage function
// In production, use Redis or your database
const pendingStates = new Map();

function storePendingState(state, tgId) {
  pendingStates.set(state, {
    tgId,
    createdAt: Date.now(),
  });
}

// /connect command - Generate secure link for wallet creation
bot.command('connect', async (ctx) => {
  const tgId = ctx.from.id;
  const username = ctx.from.username || ctx.from.first_name;
  
  // Generate secure state token
  const state = crypto.randomBytes(16).toString('hex');
  
  // Store state (expires in 10 minutes)
  storePendingState(state, tgId);
  
  // Your ngrok domain (update this when you deploy)
  const domain = process.env.PUBLIC_URL || 'https://kylan-untranscendental-victoriously.ngrok-free.dev';
  const url = `${domain}/onboard?state=${state}`;
  
  await ctx.reply(
    `👋 Olá ${username}!\n\n` +
    `Para criar sua carteira Solana segura, toque no botão abaixo.\n\n` +
    `⏱ O processo leva ~10 segundos.`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔐 Criar Carteira Solana', url }]
        ],
      },
    }
  );
});

// Handle return from wallet creation
bot.start(async (ctx) => {
  const payload = ctx.startPayload || "";
  
  // Handle deep link return from wallet creation
  if (payload === "wallet_ok") {
    return ctx.reply(
      "✅ Wallet Solana criada com sucesso!\n\n" +
      "Sua carteira está pronta para votar. Agora você pode:\n\n" +
      "• /create - Criar uma nova votação\n" +
      "• /myaddress - Ver seu endereço Solana\n" +
      "• /help - Ver todos os comandos"
    );
  }
  
  // Default welcome message
  return ctx.reply(
    "🗳 Bem-vindo ao Balloteer!\n\n" +
    "Sistema de votação privada e on-chain para grupos do Telegram.\n\n" +
    "Comandos:\n" +
    "• /connect - Criar sua carteira Solana\n" +
    "• /create - Iniciar uma votação\n" +
    "• /help - Ver ajuda completa"
  );
});

bot.launch();

console.log('🤖 Bot iniciado!');

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

