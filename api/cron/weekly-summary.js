import { getTasks } from '../tasks.js'
import { getMeetings, getContacts, getTests, seedAll, upcomingTests } from '../meetings.js'

const TG_TOKEN    = process.env.TELEGRAM_BOT_TOKEN
const CHAT_ID     = process.env.TELEGRAM_CHAT_ID
const CRON_SECRET = process.env.CRON_SECRET

async function tgSend(text) {
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown', disable_web_page_preview: true })
  })
}

function wibNow() { return new Date(Date.now() + 7 * 3600 * 1000) }
function wibDateStr() { return wibNow().toISOString().split('T')[0] }

function buildWeeklySummary({ tasks, meetings, contacts, tests }) {
  const open        = tasks.filter(t => !t.done)
  const done        = tasks.filter(t => t.done)
  const urgent      = open.filter(t => t.pri === 'urgent')
  const areas       = ['software','hardware','business','operation']
  const icons       = { software:'💻', hardware:'🔧', business:'💼', operation:'⚙️' }

  // Stalled = open tasks with no updatedAt in last 7 days
  const weekAgo = new Date(Date.now() + 7*3600000 - 7*86400000).toISOString()
  const stalled = open.filter(t => !t.updatedAt || t.updatedAt < weekAgo)

  // Done this week
  const doneThisWeek = tasks.filter(t => t.done && t.updatedAt && t.updatedAt > weekAgo)

  // Next week's tests
  const nextWeekTests = upcomingTests(tests, 10).filter(t => {
    const today = wibDateStr()
    return t.date > today
  })

  // Upcoming contacts due next week
  const nextWeekStr = new Date(Date.now() + 7*3600000 + 7*86400000).toISOString().split('T')[0]
  const todayStr = wibDateStr()
  const contactsDue = contacts.filter(c =>
    c.nextFollowUp && c.nextFollowUp >= todayStr && c.nextFollowUp <= nextWeekStr && c.status !== 'done'
  )

  const lines = []
  lines.push(`📊 *CASAN Weekly Summary*`)
  lines.push(`Friday wrap — Week ending ${todayStr}`)
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`)
  lines.push('')

  // Overall health
  const health = done.length > 0
    ? Math.round(doneThisWeek.length / (doneThisWeek.length + open.length) * 100)
    : 0
  const healthBar = '█'.repeat(Math.floor(health/10)) + '░'.repeat(10 - Math.floor(health/10))
  lines.push(`🏁 *Week Health*`)
  lines.push(`\`${healthBar}\` ${health}% complete`)
  lines.push(`Done this week: *${doneThisWeek.length}* · Still open: *${open.length}* · Urgent: *${urgent.length}*`)
  lines.push('')

  // Area breakdown
  lines.push(`📐 *By Area*`)
  areas.forEach(area => {
    const aOpen = open.filter(t => t.area === area)
    const aDone = doneThisWeek.filter(t => t.area === area)
    const aUrg  = aOpen.filter(t => t.pri === 'urgent')
    lines.push(`${icons[area]} ${area.toUpperCase()}: ${aOpen.length} open (${aUrg.length} urgent) · ${aDone.length} done this week`)
  })
  lines.push('')

  // Wins this week
  if (doneThisWeek.length > 0) {
    lines.push(`✅ *Wins This Week (${doneThisWeek.length})*`)
    doneThisWeek.slice(0, 5).forEach(t => {
      lines.push(`✅ \`${t.id}\` ~${t.txt.substring(0, 55)}~`)
    })
    if (doneThisWeek.length > 5) lines.push(`  _...and ${doneThisWeek.length - 5} more_`)
    lines.push('')
  }

  // Stalled items — needs attention
  if (stalled.length > 0) {
    lines.push(`🚨 *Stalled — No Movement (${stalled.length})*`)
    lines.push(`_Tasks with no update in 7+ days:_`)
    stalled.slice(0, 5).forEach(t => {
      lines.push(`⏸ \`${t.id}\` ${t.txt.substring(0, 55)}`)
      lines.push(`  ↳ [${t.area}] ${t.sec}`)
    })
    if (stalled.length > 5) lines.push(`  _...and ${stalled.length - 5} more stalled_`)
    lines.push('')
  }

  // Urgent carryover
  if (urgent.length > 0) {
    lines.push(`🔴 *Urgent Carryover (${urgent.length})*`)
    lines.push(`_Still open heading into next week:_`)
    urgent.slice(0, 5).forEach(t => {
      lines.push(`🔴 \`${t.id}\` ${t.txt.substring(0, 55)}`)
    })
    if (urgent.length > 5) lines.push(`  _...and ${urgent.length - 5} more_`)
    lines.push('')
  }

  // Next week tests
  if (nextWeekTests.length > 0) {
    lines.push(`🔬 *Next Week — Hardware Tests*`)
    nextWeekTests.forEach(t => {
      lines.push(`📅 *${t.title}* — ${t.date} ${t.time}`)
      lines.push(`  Contact: ${t.contactName}`)
    })
    lines.push('')
  }

  // Contacts due next week
  if (contactsDue.length > 0) {
    lines.push(`📞 *Follow-ups Due Next Week (${contactsDue.length})*`)
    contactsDue.forEach(c => {
      lines.push(`📅 *${c.name}* (${c.company}) — ${c.nextFollowUp}`)
      if (c.notes) lines.push(`  _${c.notes}_`)
    })
    lines.push('')
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`)
  lines.push(`Have a good weekend.`)
  lines.push(`/tasks · /urgent · /meeting`)

  return lines.join('\n')
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    await seedAll()
    const [tasks, meetings, contacts, tests] = await Promise.all([
      getTasks(), getMeetings(), getContacts(), getTests()
    ])

    const message = buildWeeklySummary({ tasks, meetings, contacts, tests })
    await tgSend(message)

    return res.status(200).json({ ok: true, sent: true })
  } catch (err) {
    console.error('Weekly summary error:', err)
    try { await tgSend(`⚠️ *Weekly summary failed*\n\`${err.message}\``) } catch {}
    return res.status(500).json({ error: err.message })
  }
}
