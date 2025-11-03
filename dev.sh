#!/bin/bash

# Script para rodar Bot + Next.js juntos em desenvolvimento
# Uso: ./dev.sh

echo "🚀 Starting Balloteer Development Environment..."
echo ""

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para cleanup ao sair
cleanup() {
    echo ""
    echo "🛑 Stopping all processes..."
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Verificar se .env existe
if [ ! -f "backend/tg_bot/.env" ]; then
    echo "⚠️  backend/tg_bot/.env não encontrado!"
    echo "Crie o arquivo com:"
    echo "  BOT_TOKEN=seu_token"
    echo "  PORT=8080"
    echo "  PUBLIC_URL="
    exit 1
fi

if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local não encontrado!"
    echo "Crie o arquivo na raiz com:"
    echo "  NEXT_PUBLIC_PRIVY_APP_ID=seu_privy_app_id"
    echo "  BOT_BACKEND_URL=http://localhost:8080"
    echo "  NEXT_PUBLIC_TG_BOT_USERNAME=balloteer_bot"
    exit 1
fi

echo "${BLUE}[1/2]${NC} Starting Bot Backend (port 8080)..."
cd backend/tg_bot
npm start &
BOT_PID=$!

# Aguarda o bot iniciar
sleep 3

cd ../..

echo "${BLUE}[2/2]${NC} Starting Next.js Website (port 3000)..."
yarn dev &
NEXT_PID=$!

echo ""
echo "${GREEN}✅ Both servers are running!${NC}"
echo ""
echo "📋 URLs:"
echo "  Bot Backend:  http://localhost:8080"
echo "  Next.js Site: http://localhost:3000"
echo ""
echo "🧪 Para testar:"
echo "  1. Rode ngrok em outro terminal: ngrok http 3000"
echo "  2. Configure a URL do ngrok no .env.local (PUBLIC_URL)"
echo "  3. Adicione a URL no Privy Dashboard"
echo "  4. Envie /connect no seu bot do Telegram"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Aguarda
wait

