import { getTasks } from '../tasks.js'
import {
  getMeetings, getContacts, getTests, getCerts, seedAll,
  todayMeetings, overdueContacts, upcomingTests, expiringCerts
} from '../meetings.js'

const TG_TOKEN  = process.env.TELEGRAM_BOT_TOKEN
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID
const CRON_SECRET = process.env.CRON_SECRET  // optional guard

// ─── TELEGRAM SENDER ─────────────────────────────────────────────────────────

async function tgSend(text) {
  const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    })
  })
  const data = await r.json()
  if (!data.ok) throw new Error(`Telegram error: ${data.description}`)
  return data
}

// ─── DATE UTILS ──────────────────────────────────────────────────────────────

function wibNow() {
  // WIB = UTC+7
  return new Date(Date.now() + 7 * 3600 * 1000)
}

function wibDateStr() {
  return wibNow().toISOString().split('T')[0]
}

function wibDayName() {
  return ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][wibNow().getUTCDay()]
}

function wibFullDate() {
  const d = wibNow()
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${wibDayName()}, ${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

function daysUntil(dateStr) {
  const today = new Date(wibDateStr())
  const target = new Date(dateStr)
  return Math.ceil((target - today) / 86400000)
}

function daysSince(dateStr) {
  if (!dateStr) return null
  const today = new Date(wibDateStr())
  const target = new Date(dateStr)
  return Math.floor((today - target) / 86400000)
}

// ─── MESSAGE BUILDER ─────────────────────────────────────────────────────────

function buildMorningBrief({ tasks, meetings, contacts, tests, certs }) {
  const open    = tasks.filter(t => !t.done)
  const urgent  = open.filter(t => t.pri === 'urgent')
  const hwOpen  = open.filter(t => t.area === 'hardware')
  const today   = todayMeetings(meetings)
  const overdue = overdueContacts(contacts)
  const upcoming = upcomingTests(tests, 4)
  const expCerts = expiringCerts(certs, 30)

  // Separate CEO vs CTO urgents
  const ctoUrgent = urgent.filter(t => ['hardware','software','product'].includes(t.area))
  const ceoUrgent = urgent.filter(t => ['business','operation'].includes(t.area))

  // Tasks done yesterday (updated in last 24h and done=true)
  const yesterday = new Date(Date.now() + 7*3600000 - 86400000).toISOString()
  const doneRecent = tasks.filter(t => t.done && t.updatedAt && t.updatedAt > yesterday)

  const lines = []

  // ── HEADER ──
  lines.push(`⚡ *CASAN Morning Brief*`)
  lines.push(`${wibFullDate()}`)
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`)
  lines.push('')

  // ── SNAPSHOT ──
  lines.push(`📊 *Snapshot*`)
  lines.push(`Open: *${open.length}* · Urgent: *${urgent.length}* · Done (24h): *${doneRecent.length}*`)
  lines.push('')

  // ── TODAY'S MEETINGS ──
  if (today.length > 0) {
    lines.push(`📅 *Today's Meetings (${today.length})*`)
    today.forEach(m => {
      lines.push(`${m.time} — *${m.title}*`)
      if (m.desc) lines.push(`  _${m.desc}_`)
      if (m.attendees?.length) lines.push(`  👥 ${m.attendees.join(', ')}`)
    })
    lines.push('')
  } else {
    lines.push(`📅 *Meetings* — No meetings scheduled today`)
    lines.push('')
  }

  // ── UPCOMING HARDWARE TESTS ──
  if (upcoming.length > 0) {
    lines.push(`🔬 *Upcoming Tests*`)
    upcoming.forEach(t => {
      const d = daysUntil(t.date)
      const when = d === 0 ? '*TODAY*' : d === 1 ? '*TOMORROW*' : `in ${d} days`
      lines.push(`${d === 0 ? '🔴' : d === 1 ? '🟠' : '🟡'} *${t.title}* — ${t.date} ${t.time} (${when})`)
      lines.push(`  Contact: ${t.contactName} · ${t.location || 'Location TBD'}`)
      if (t.notes) lines.push(`  ⚠️ ${t.notes}`)
    })
    lines.push('')
  }

  // ── CTO URGENT (hardware / software / product) ──
  if (ctoUrgent.length > 0) {
    lines.push(`🔧 *CTO Urgent (${ctoUrgent.length})*`)
    ctoUrgent.slice(0, 6).forEach(t => {
      lines.push(`🔴 \`${t.id}\` ${t.txt}`)
      lines.push(`  ↳ [${t.area}] ${t.sec} · ${t.owner}`)
    })
    if (ctoUrgent.length > 6) lines.push(`  _...and ${ctoUrgent.length - 6} more_`)
    lines.push('')
  }

  // ── CEO URGENT (business / operation) ──
  if (ceoUrgent.length > 0) {
    lines.push(`💼 *CEO Urgent (${ceoUrgent.length})*`)
    ceoUrgent.slice(0, 6).forEach(t => {
      lines.push(`🔴 \`${t.id}\` ${t.txt}`)
      lines.push(`  ↳ [${t.area}] ${t.sec} · ${t.owner}`)
    })
    if (ceoUrgent.length > 6) lines.push(`  _...and ${ceoUrgent.length - 6} more_`)
    lines.push('')
  }

  // ── OVERDUE CONTACTS ──
  if (overdue.length > 0) {
    lines.push(`📞 *Overdue Follow-ups (${overdue.length})*`)
    overdue.forEach(c => {
      const since = daysSince(c.nextFollowUp)
      const overStr = since > 0 ? ` — *${since}d overdue*` : ' — *due today*'
      lines.push(`${since > 0 ? '🔴' : '🟡'} *${c.name}* (${c.company})${overStr}`)
      if (c.notes) lines.push(`  _${c.notes}_`)
      if (c.wechat) lines.push(`  WeChat: ${c.wechat}`)
    })
    lines.push('')
  }

  // ── CERT ALERTS ──
  if (expCerts.length > 0) {
    lines.push(`📋 *Cert Expiry Alerts*`)
    expCerts.forEach(c => {
      const d = daysUntil(c.expiresAt)
      lines.push(`⚠️ *${c.product}* — ${c.certType} expires in ${d} days`)
    })
    lines.push('')
  }

  // ── HARDWARE WATCH (open hw tasks not urgent) ──
  const hwWatch = hwOpen.filter(t => t.pri !== 'urgent')
  if (hwWatch.length > 0) {
    lines.push(`🔩 *Hardware Watch (${hwWatch.length} open)*`)
    hwWatch.slice(0, 4).forEach(t => {
      lines.push(`◻ \`${t.id}\` ${t.txt}`)
    })
    if (hwWatch.length > 4) lines.push(`  _...and ${hwWatch.length - 4} more_`)
    lines.push('')
  }

  // ── DONE YESTERDAY ──
  if (doneRecent.length > 0) {
    lines.push(`✅ *Done in last 24h (${doneRecent.length})*`)
    doneRecent.slice(0, 4).forEach(t => {
      lines.push(`✅ \`${t.id}\` ~${t.txt.substring(0, 55)}~`)
    })
    lines.push('')
  }

  // ── FOOTER ──
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`)
  lines.push(`/urgent · /meeting · /week · /stats`)

  return lines.join('\n')
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Vercel cron sends GET with Authorization header
  // Also accept POST for manual trigger from web app
  const authHeader = req.headers.authorization
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    await seedAll()

    const [tasks, meetings, contacts, tests, certs] = await Promise.all([
      getTasks(), getMeetings(), getContacts(), getTests(), getCerts()
    ])

    const message = buildMorningBrief({ tasks, meetings, contacts, tests, certs })

    await tgSend(message)

    return res.status(200).json({
      ok: true,
      sent: true,
      stats: {
        date: wibFullDate(),
        urgentTasks: tasks.filter(t => !t.done && t.pri === 'urgent').length,
        meetings: todayMeetings(meetings).length,
        overdueContacts: overdueContacts(contacts).length,
        upcomingTests: upcomingTests(tests, 4).length,
      }
    })
  } catch (err) {
    console.error('Morning brief error:', err)
    // Try to send error to Telegram too so you know it failed
    try {
      await tgSend(`⚠️ *Morning brief failed*\n\`${err.message}\``)
    } catch {}
    return res.status(500).json({ error: err.message })
  }
}
