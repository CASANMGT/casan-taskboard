# CASAN CEO Task Board

Full-stack task board for PT CASAN Energi Indonesia.  
**Frontend**: React + Vite + Tailwind | **Backend**: Vercel Serverless Functions | **DB**: Vercel KV (Redis)

---

## Deploy to Vercel (Step by Step)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "initial: CASAN CEO task board"
gh repo create casan-taskboard --private --push --source=.
# or: git remote add origin https://github.com/YOURUSER/casan-taskboard.git && git push -u origin main
```

### 2. Create Vercel Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the GitHub repo `casan-taskboard`
3. Framework preset: **Vite** (auto-detected)
4. Build command: `npm run build` (default)
5. Output directory: `dist` (default)
6. Click **Deploy**

### 3. Add Vercel KV (Database)

After first deploy:

1. In Vercel dashboard → your project → **Storage** tab
2. Click **Create Database** → choose **KV**
3. Name it `casan-tasks`, select the same region as your deployment
4. Click **Create & Connect** — Vercel auto-injects these env vars:
   - `KV_URL`
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_READ_ONLY_TOKEN`

### 4. Redeploy

After connecting KV, trigger a redeploy:
```
Vercel dashboard → Deployments → ⋯ → Redeploy
```

Your app is now live at `https://casan-taskboard.vercel.app` (or custom domain).

---

## Local Development

### Prerequisites
- Node.js 18+
- Vercel CLI: `npm i -g vercel`

### Setup

```bash
npm install
vercel link          # link to your Vercel project
vercel env pull      # pulls KV env vars to .env.local
vercel dev           # runs frontend + API functions locally on :3000
```

> `vercel dev` is required (not `npm run dev`) to run serverless functions locally.

---

## Project Structure

```
casan-taskboard/
├── api/
│   ├── tasks.js          ← GET all tasks / POST new task
│   └── tasks/
│       └── [id].js       ← PATCH (toggle done, update) / DELETE
├── src/
│   ├── App.jsx           ← Main React component
│   ├── main.jsx          ← Entry point
│   └── index.css         ← CASAN design system + globals
├── index.html
├── vite.config.js
├── tailwind.config.js
├── vercel.json           ← API routing config
└── package.json
```

---

## API Reference

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/tasks` | — | Get all tasks (seeds on first call) |
| POST | `/api/tasks` | `{txt, area, sec?, pri?, tag?, owner?}` | Create task |
| PATCH | `/api/tasks/:id` | `{done?, txt?, pri?, tag?, owner?}` | Update any field |
| DELETE | `/api/tasks/:id` | — | Delete task |

### Area values
`software` | `hardware` | `business` | `operation`

### Priority values
`urgent` | `normal`

### Tag values
`week` | `null`

---

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `KV_REST_API_URL` | Vercel KV (auto) | Redis REST endpoint |
| `KV_REST_API_TOKEN` | Vercel KV (auto) | Auth token |

> All KV vars are injected automatically when you connect Vercel KV. No manual setup needed.

---

## Design System

| Token | Value |
|-------|-------|
| Background | `#07090E` |
| Accent (teal) | `#00E5C3` |
| Font UI | DM Sans |
| Font data/IDs | IBM Plex Mono |
| Software area | `#00E5C3` |
| Hardware area | `#FB923C` |
| Business area | `#60A5FA` |
| Operation area | `#34D399` |
