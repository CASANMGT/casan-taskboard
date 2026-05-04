# CASAN CEO Task Board v2

Full-stack task board with **AI chat** + **Telegram bot** integration.

## Stack
- Frontend: React + Vite + Tailwind
- Backend: Vercel Serverless Functions
- DB: Vercel KV (Redis)
- AI: Anthropic Claude (claude-opus-4-5)
- Bot: Telegram Bot API

---

## Deploy to Vercel

### 1. Push to GitHub
```bash
git init && git add . && git commit -m "CASAN task board v2"
gh repo create casan-taskboard --private --push --source=.
```

### 2. Import on vercel.com/new
- Framework: **Vite** (auto-detected)
- Click Deploy

### 3. Add Vercel KV
Dashboard → Storage → Create Database → KV → casan-tasks → Create & Connect

### 4. Add Environment Variables
Dashboard → Settings → Environment Variables:

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `TELEGRAM_BOT_TOKEN` | From @BotFather on Telegram |
| `TELEGRAM_CHAT_ID` | Your personal Telegram chat ID |

### 5. Redeploy
Deployments → ⋯ → Redeploy

### 6. Register Telegram Webhook
Visit once after deploy:
```
https://your-app.vercel.app/api/telegram/setup
```

---

## Telegram Bot Setup

1. Open Telegram → search @BotFather → /newbot
2. Name: `CASAN Task Bot` | Username: `casantasks_bot`
3. Copy the token → add as `TELEGRAM_BOT_TOKEN` env var
4. Get your chat ID: message @userinfobot → copy the ID
5. Add as `TELEGRAM_CHAT_ID` env var
6. After deploy, visit `/api/telegram/setup` once

### Telegram Commands
```
/tasks       — all open tasks
/urgent      — urgent only  
/week        — this week
/done        — completed tasks
/sw /hw /biz /ops — by area
/meeting     — meeting brief
/done h1     — mark h1 complete
/open s3     — reopen task
/urgent b2   — set as urgent
/add hw Procurement Buy GPS units
/del h6      — delete task
/stats       — progress per area
```

---

## Local Development
```bash
npm install
npm install -g vercel
vercel link
vercel env pull    # pulls all env vars to .env.local
vercel dev         # runs on localhost:3000
```

## API Reference
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tasks` | Get all tasks |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/ai/chat` | AI chat (Claude) |
| POST | `/api/telegram/webhook` | Telegram webhook |
| GET | `/api/telegram/setup` | Register webhook |
