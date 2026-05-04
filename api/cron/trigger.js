// POST /api/cron/trigger — manually fire cron jobs from the web app or Telegram
// Body: { job: 'morning-brief' | 'weekly-summary' }
import morningBrief  from './morning-brief.js'
import weeklySummary from './weekly-summary.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Origin','*'); return res.status(200).end() }
  if (req.method !== 'POST') return res.status(405).end()

  const { job } = req.body
  const jobs = { 'morning-brief': morningBrief, 'weekly-summary': weeklySummary }

  if (!jobs[job]) return res.status(400).json({ error: `Unknown job: ${job}. Use morning-brief or weekly-summary` })

  return jobs[job](req, res)
}
