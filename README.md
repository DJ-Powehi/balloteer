# 🗳️ Balloteer

**Private, weighted voting for Telegram groups and DAOs.**

Balloteer is a Telegram bot that enables secure, private voting with weighted votes and quorum support. Admins create proposals in DM, voters receive private ballots, and only the final result is posted to the group.

## ✨ Features

- 🔒 **Private Ballots** - Votes are never shown publicly, only final results
- ⚖️ **Weighted Voting** - Admins assign custom weights (1, 3, or custom)
- 📊 **Quorum Support** - Set minimum participation thresholds
- ⏰ **Timed Proposals** - Auto-close after deadline
- 💼 **Multi-Community** - One bot manages multiple groups
- 🔗 **Solana Wallets** - Users can create Solana wallets via Privy (for future on-chain voting)

## 🏗️ Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS
- **Bot Backend**: Node.js, Express, Grammy (Telegram bot framework)
- **Auth**: Privy (Telegram + Solana wallet creation)
- **Database**: PostgreSQL (Railway)
- **Deployment**: 
  - Bot: Railway
  - Frontend: Vercel

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and Yarn
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- Privy Account ([dashboard.privy.io](https://dashboard.privy.io))
- PostgreSQL database (Railway recommended)

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/balloteer.git
cd balloteer
yarn install
cd backend/tg_bot && npm install && cd ../..
```

### 2. Environment Setup

#### Root `.env.local` (Next.js)
```bash
cp .env.example .env.local
# Edit .env.local with your values:
# - NEXT_PUBLIC_PRIVY_APP_ID
# - PUBLIC_URL
# - BOT_BACKEND_URL
# - NEXT_PUBLIC_TG_BOT_USERNAME
```

#### Backend `.env` (Bot)
```bash
cp backend/tg_bot/.env.example backend/tg_bot/.env
# Edit backend/tg_bot/.env with your values:
# - BOT_TOKEN
# - PUBLIC_URL (leave empty for local dev)
# - DATABASE_URL
```

### 3. Run Development Servers

```bash
./dev.sh
```

This starts:
- Next.js frontend at `http://localhost:3000`
- Bot backend at `http://localhost:8080`

For local testing with Telegram webhooks, use [ngrok](https://ngrok.com/):

```bash
ngrok http 3000
# Update PUBLIC_URL in both .env files with ngrok URL
```

## 📖 Bot Commands

### For All Users
- `/start` - Register a group or show intro
- `/connect` - View or create your Solana wallet (DM only)
- `/join` - Request voting access in a group (DM only)
- `/myvote` - See or change your vote (DM only)
- `/help` - Show all commands

### For Admins (DM only)
- `/new` - Create a new proposal (guided flow)
- `/close` - Close an open proposal and post results
- `/setweight` - Change a voter's weight (with reason)

## 🗄️ Database Schema

### `wallets` Table
```sql
CREATE TABLE wallets (
  telegram_id BIGINT PRIMARY KEY,
  sol_address TEXT NOT NULL,
  privy_user_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🔐 Security

- ✅ All environment variables are in `.env` files (not committed)
- ✅ `.env.example` templates provided for easy setup
- ✅ Private keys never stored on servers (managed by Privy)
- ✅ Secure state tokens for wallet creation flow
- ✅ Telegram ID validation for all operations

## 📦 Deployment

### Deploy Bot Backend to Railway

1. Create new Railway project
2. Add PostgreSQL database
3. Deploy from GitHub
4. Add environment variables:
   - `BOT_TOKEN`
   - `PUBLIC_URL` (Railway-provided URL)
   - `DATABASE_URL` (auto-populated by Railway)

### Deploy Frontend to Vercel

1. Import GitHub repo to Vercel
2. Set framework preset: **Next.js**
3. Add environment variables:
   - `NEXT_PUBLIC_PRIVY_APP_ID`
   - `PUBLIC_URL` (Vercel-provided URL)
   - `BOT_BACKEND_URL` (Railway URL)
   - `NEXT_PUBLIC_TG_BOT_USERNAME`

### Update Privy Dashboard

Add your Vercel URL to:
- **Allowed Origins**
- **Redirect URIs**: `https://your-domain.vercel.app/onboard`

## 🤝 Contributing

Contributions are welcome! Please open an issue or PR.

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- [Privy Docs](https://docs.privy.io)
- [Grammy Telegram Bot Framework](https://grammy.dev)
- [Next.js Docs](https://nextjs.org/docs)

---

Built with ❤️ for transparent, private voting
