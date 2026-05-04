# Telegram bot + CEO task board

A **Telegram bot** is a small program that talks to users in Telegram and can call your board’s **HTTP API** (`GET` / `POST` / `PATCH` / `DELETE` on `/api/tasks`). You do **not** need OpenClaw for that.

## What you can do with a bot

| Idea | How it works |
|------|----------------|
| **Add tasks from chat** | User sends `/add hardware Review BMS quote` or picks area from **inline buttons**, then the bot `POST`s JSON to `https://<your-domain>/api/tasks` (same body as the web app). |
| **Quick capture** | Reply with free text; bot maps keywords or a first-line prefix (`[hw] …`) to `area`, then POSTs. |
| **List / filter** | Bot `GET /api/tasks`, formats last N items or only `urgent` / `this week` in a message (read-only, no new API). |
| **Mark done / delete** | Bot `PATCH` / `DELETE` on `/api/tasks/<id>` if the user picks a task (e.g. from a numbered list or callback button storing `task.id`). |
| **Daily digest** | Scheduled job (Vercel Cron, GitHub Actions, or any host) calls `GET /api/tasks` and sends a summary via `sendMessage` — still “Telegram”, bot token used only on your server. |
| **Notify the team** | After someone adds a task from the **web** board, you’d need either polling or extra plumbing; simplest path is **digest** above, not instant push from KV unless you add hooks. |

## How it fits together

1. **@BotFather** on Telegram → `/newbot` → you get a **`BOT_TOKEN`** (keep it secret).
2. Your **backend** receives Telegram updates:
   - **Webhook (recommended on Vercel):** Telegram `POST`s each message to `https://<your-project>.vercel.app/api/telegram` (you implement one serverless handler).
   - **Long polling:** a small always-on server calls Telegram `getUpdates` in a loop (not ideal on serverless).
3. The handler parses commands, then **`fetch`** your existing **`/api/tasks`** routes (same origin on Vercel is fine).

## Minimal command design

- `/start` — short help.
- `/add <area> <text…>` — `area` ∈ `software` | `hardware` | `business` | `operation`.
- `/list` — optional `urgent` or `week` as a second token.

Example POST your bot would perform after parsing:

```http
POST /api/tasks
Content-Type: application/json

{"txt":"Review BMS quote","area":"hardware","sec":"General","pri":"normal","owner":"CEO"}
```

## Security

- Store **`TELEGRAM_BOT_TOKEN`** (and optional **`TELEGRAM_WEBHOOK_SECRET`**) only in **Vercel environment variables**, never in the repo.
- In `api/telegram.js`, **verify** each request is from Telegram (signed secret from BotFather when you set the webhook, or validate `X-Telegram-Bot-Api-Secret-Token` if you configure it).
- Your **`/api/tasks`** routes are still **public** today; if the bot is the only writer you care about, consider a **`TASKBOARD_WRITE_SECRET`** checked on `POST`/`PATCH`/`DELETE` and have the bot send that header — the **public web app** would then need the same secret in the browser (usually bad) **or** you only use the bot for writes and keep the site read-only until you add login. Typical compromise: **secret on writes** + small **session cookie** for the website later, or accept public writes for an internal tool.

## Cursor “Telegram plugin”

The **Cursor IDE Telegram plugin** (pairing, DMs with the agent) is **not** the same as this bot. This doc is about a **BotFather bot** you own that talks to **your** Vercel API.

## Next step in this repo

There is **no** `api/telegram.js` yet. If you want it shipped here, say so and we can add a single webhook handler plus env vars and a short “set webhook” command for BotFather.
