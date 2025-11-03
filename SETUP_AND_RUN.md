# Como Rodar o Balloteer Completo

Este guia mostra como rodar o bot e o website juntos para o fluxo de criação de carteira.

## 🏗️ Arquitetura

Você tem **dois servidores** que precisam rodar juntos:

1. **Bot Backend** (`backend/tg_bot/`) - Port 8080
   - Bot Telegram (grammy)
   - API Express
   - Gerencia state tokens para wallet creation

2. **Next.js Website** (raiz do projeto) - Port 3000
   - Website público
   - Página `/onboard` para criar wallet
   - API que valida com o bot backend

## 📋 Pré-requisitos

1. Node.js instalado
2. Yarn instalado
3. Telegram Bot Token (do @BotFather)
4. Privy App ID

## 🔧 Setup Inicial

### 1. Configure o Bot Backend

```bash
cd backend/tg_bot

# Crie o .env (se ainda não existe)
cat > .env << 'EOF'
BOT_TOKEN=SEU_TOKEN_DO_BOTFATHER
PUBLIC_URL=
PORT=8080
EOF

# Instale dependências (se necessário)
npm install
```

### 2. Configure o Next.js

```bash
cd /Users/francianecano/Desktop/BALLOTEER-FIXED

# Crie/edite o .env.local
cat > .env.local << 'EOF'
NEXT_PUBLIC_PRIVY_APP_ID=seu_privy_app_id
BOT_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_TG_BOT_USERNAME=balloteer_bot
EOF
```

## 🚀 Como Rodar (Desenvolvimento Local)

### Terminal 1: Rode o Bot Backend

```bash
cd /Users/francianecano/Desktop/BALLOTEER-FIXED/backend/tg_bot
npm start
```

Você deve ver:
```
🚀 API listening on port 8080
⚠️ No PUBLIC_URL → using long polling
```

### Terminal 2: Rode o Next.js Website

```bash
cd /Users/francianecano/Desktop/BALLOTEER-FIXED
yarn dev
```

Você deve ver:
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

### Terminal 3: Ngrok para expor o Website

```bash
ngrok http 3000
```

Copie a URL do ngrok (ex: `https://abc123.ngrok-free.dev`)

### 4. Configure URLs

Edite `backend/tg_bot/.env`:
```bash
PUBLIC_URL=  # deixe vazio por enquanto (polling local)
```

Edite o `.env.local` na raiz:
```bash
# Cole a URL do ngrok aqui:
PUBLIC_URL=https://abc123.ngrok-free.dev
```

Atualize no Privy Dashboard:
- Settings → Allowed Origins
- Adicione: `https://abc123.ngrok-free.dev`

## 🧪 Testar o Fluxo

1. **Abra o Telegram** e inicie uma conversa privada com seu bot
2. **Envie**: `/connect`
3. **Clique no botão** "🔐 Criar Carteira Solana"
4. **Autentique** com Telegram (via Privy)
5. **Aguarde** a criação da carteira (~10 segundos)
6. **Clique** em "Voltar ao Telegram"
7. **Confirme** que o bot responde "✅ Wallet Solana criada com sucesso!"

## 📝 Arquivos Criados/Modificados

### Bot Backend:
- ✅ `backend/tg_bot/walletFlows.js` - Comandos /connect e handler do /start
- ✅ `backend/tg_bot/state.js` - Adicionado `pendingWalletStates`
- ✅ `backend/tg_bot/index.js` - Registra os comandos de wallet
- ✅ `backend/tg_bot/routes.js` - Endpoint `/validate-wallet-state`

### Next.js:
- ✅ `pages/onboard.jsx` - Página de criação de wallet
- ✅ `pages/api/tg/complete.js` - API que valida com bot backend
- ✅ `pages/_app.jsx` - Configuração Privy atualizada

## 🔍 Troubleshooting

### Bot não responde
```bash
# Verifique se o bot está rodando
cd backend/tg_bot
npm start

# Verifique se o BOT_TOKEN está correto no .env
```

### Erro "Cannot find module"
```bash
# Instale dependências do bot
cd backend/tg_bot
npm install

# Instale dependências do Next.js
cd ../../
yarn install
```

### "Invalid or expired state token"
- O token expira em 10 minutos
- Certifique-se que o bot backend está rodando
- Tente gerar um novo link com `/connect`

### Website não abre no Telegram
- Verifique se o ngrok está rodando
- Verifique se a URL no `.env.local` está correta
- Adicione a URL no Privy Dashboard

### Erro ao criar carteira
- Verifique se o `NEXT_PUBLIC_PRIVY_APP_ID` está correto
- Verifique se a URL está nos "Allowed Origins" do Privy
- Abra o console do navegador para ver erros

## 🔄 Fluxo Completo (Diagrama)

```
Usuário no Telegram
       ↓
   /connect
       ↓
Bot gera state token + URL
       ↓
Usuário clica no link
       ↓
Abre /onboard no Next.js
       ↓
Login Telegram (Privy)
       ↓
Cria wallet Solana
       ↓
POST /api/tg/complete
       ↓
Next.js chama Bot Backend: /validate-wallet-state
       ↓
Bot valida state token
       ↓
Retorna Telegram ID
       ↓
Next.js salva (TODO: DB)
       ↓
Redirect: tg://resolve?domain=balloteer_bot&startapp=wallet_ok
       ↓
Bot recebe /start wallet_ok
       ↓
Confirma sucesso ✅
```

## 📦 Próximos Passos (Produção)

1. ⚠️ **Migrar state para Redis/PostgreSQL**
   - Atualmente usa Map em memória (perde dados ao reiniciar)

2. ⚠️ **Adicionar Database**
   - Salvar mapeamento Telegram ID → Privy ID → Solana Address

3. ⚠️ **Deploy Bot Backend**
   - Railway, Heroku, ou VPS
   - Configurar PUBLIC_URL para webhook

4. ⚠️ **Deploy Website**
   - Vercel recomendado para Next.js
   - Atualizar URLs no Privy Dashboard

5. ⚠️ **Adicionar Notificações**
   - Bot envia mensagem após wallet criada (código já comentado)

## 🆘 Precisa de Ajuda?

Se algo não funcionar:
1. Verifique os logs de ambos os terminais
2. Certifique-se que ambos servidores estão rodando
3. Confirme que as variáveis de ambiente estão corretas
4. Tente limpar o cache: `rm -rf .next` e reinicie o Next.js

