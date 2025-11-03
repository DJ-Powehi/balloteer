# Telegram Wallet Creation Setup

This guide explains how to set up the wallet creation flow from Telegram.

## Overview

Users can create their Solana wallet directly from Telegram:
1. User sends `/connect` to your bot
2. Bot generates a secure link with a state token
3. User clicks the link → opens `/onboard` page
4. Page authenticates with Telegram via Privy
5. Creates Solana wallet (or confirms existing)
6. Saves the mapping to backend
7. User returns to Telegram with wallet ready

## Files Created

### 1. `/pages/onboard.jsx`
The wallet creation page that users land on from Telegram.
- Handles Telegram authentication via Privy
- Creates Solana wallet using `useCreateWallet` hook
- Prevents duplicate wallets
- Beautiful UI matching your homepage

### 2. `/pages/api/tg/complete.js`
API endpoint that validates the state token and saves the wallet mapping.
- Validates state token (expires in 10 minutes)
- Currently uses in-memory Map (⚠️ upgrade to Redis/DB in production)
- TODO: Add database persistence
- TODO: Add Telegram confirmation message

### 3. `/bot-wallet-command.js`
Bot command handlers for wallet creation flow.
- `/connect` - Generates secure link
- `/start connected` - Handles return from wallet creation
- Uses crypto for secure state tokens

## Setup Instructions

### 1. Update Privy Dashboard

Go to https://dashboard.privy.io and add your domain to allowed origins:
- Development: `https://kylan-untranscendental-victoriously.ngrok-free.dev`
- Production: Your actual domain when you deploy

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_PRIVY_APP_ID=clxxx...
BOT_TOKEN=1234567890:ABCdef...
NEXT_PUBLIC_TG_BOT_USERNAME=balloteer_bot
PUBLIC_URL=https://kylan-untranscendental-victoriously.ngrok-free.dev
```

### 3. Integrate Bot Commands

Add the code from `bot-wallet-command.js` to your bot:

```javascript
// In your bot file
bot.command('connect', async (ctx) => {
  // ... code from bot-wallet-command.js
});

bot.start(async (ctx) => {
  // ... code from bot-wallet-command.js
});
```

### 4. Test the Flow

1. Start your Next.js app: `yarn dev`
2. Start your bot
3. In Telegram, send `/connect` to your bot
4. Click the button
5. Authenticate with Telegram
6. Wallet created!
7. Click "Voltar ao Telegram"
8. Bot confirms wallet creation

## Production Checklist

### ⚠️ Before Going Live:

1. **Replace In-Memory State Storage**
   - Current: `Map` in `pages/api/tg/complete.js`
   - Upgrade to: Redis or PostgreSQL
   - Reason: In-memory storage resets on server restart

2. **Add Database Persistence**
   - Store: `telegram_id`, `privy_user_id`, `solana_address`, `created_at`
   - Example schema:
   ```sql
   CREATE TABLE users (
     id SERIAL PRIMARY KEY,
     telegram_id BIGINT UNIQUE NOT NULL,
     privy_user_id TEXT UNIQUE NOT NULL,
     solana_address TEXT NOT NULL,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

3. **Enable Telegram Notifications**
   - Uncomment the notification code in `/api/tg/complete.js`
   - Sends confirmation message to user after wallet creation

4. **Update Domain**
   - Change `PUBLIC_URL` in `.env.local` to your production domain
   - Update Privy dashboard allowed origins

5. **Add Rate Limiting**
   - Limit wallet creation attempts per user
   - Prevent abuse of the `/connect` endpoint

6. **Add Logging & Monitoring**
   - Log all wallet creations
   - Monitor failed attempts
   - Alert on suspicious activity

## Security Features

✅ **State Token Validation** - Single-use, time-limited tokens (10 minutes)
✅ **Telegram Identity Verification** - Validates that authenticated user matches link requester
✅ **No Duplicate Wallets** - `createOnLogin: "users-without-wallets"` + ref lock
✅ **Solana-Only Creation** - Always specifies `chainType: "solana"` to prevent ETH wallets
✅ **Secure Authentication** - Privy handles Telegram OAuth
✅ **Idempotent Creation** - Safe to retry without creating duplicates (upsert pattern)
✅ **Deep Link Return** - Secure return to bot with `wallet_ok` confirmation

## Troubleshooting

### "Invalid or expired state token"
- Token expired (10 minute limit)
- Have user run `/connect` again

### "Wallet already exists"
- This is handled gracefully
- User will see their existing wallet

### No wallet appears
- Check Privy dashboard configuration
- Ensure Solana is enabled
- Check browser console for errors

## Next Steps

1. ✅ Test the flow end-to-end
2. ⚠️ Add database persistence
3. ⚠️ Deploy to production
4. Add voting features that use the wallet
5. Add wallet balance/transaction viewing

