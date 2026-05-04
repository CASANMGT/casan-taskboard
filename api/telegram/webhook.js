import { getTasks, saveTasks } from '../tasks.js'
import { getMeetings, getContacts, getTests, seedAll, todayMeetings, overdueContacts, upcomingTests } from '../meetings.js'

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const ALLOWED_CHAT_ID = process.env.TELEGRAM_CHAT_ID
const APP_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''

async function tgSend(chatId, text, parseMode = 'Markdown') {
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode, disable_web_page_preview: true })
  })
}

function taskLine(t) {
  const done = t.done ? '✅' : (t.pri === 'urgent' ? '🔴' : '⬜')
  const week = t.tag === 'week' ? '📅' : ''
  return `${done}${week} \`${t.id}\` ${t.txt}`
}

function meetingBrief(tasks) {
  const areas = ['software','hardware','business','operation']
  const open = tasks.filter(t => !t.done)
  const icons = { software:'💻', hardware:'🔧', business:'💼', operation:'⚙️' }
  let msg = `📋 *CASAN MEETING BRIEF*\n${new Date(Date.now()+7*3600000).toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long'})}\n\n`
  msg += `📊 Open: *${open.length}* | Urgent: *${open.filter(t=>t.pri==='urgent').length}* | Done: *${tasks.filter(t=>t.done).length}*\n`
  msg += '━━━━━━━━━━━━━━━━━━━━\n\n'
  areas.forEach(area => {
    const ts = open.filter(t => t.area === area)
    if (!ts.length) return
    msg += `${icons[area]} *${area.toUpperCase()}* (${ts.length})\n`
    ts.forEach(t => { msg += `${t.pri==='urgent'?'🔴':'◻'} ${t.txt}\n` })
    msg += '\n'
  })
  return msg
}

function helpText() {
  return `*CASAN Task Bot Commands*\n\n` +
    `📋 *View*\n` +
    `\`/tasks\` \`/urgent\` \`/week\` \`/done\`\n` +
    `\`/sw\` \`/hw\` \`/biz\` \`/ops\`\n` +
    `\`/meeting\` \`/brief\` \`/stats\`\n\n` +
    `📡 *Briefings*\n` +
    `\`/brief\` — morning brief preview\n` +
    `\`/contacts\` — overdue follow-ups\n` +
    `\`/tests\` — upcoming hardware tests\n` +
    `\`/today\` — today's meetings\n\n` +
    `✅ *Update*\n` +
    `\`/done h1\` \`/open s3\` \`/urgent b2\`\n\n` +
    `➕ *Add*\n` +
    `\`/add hw Procurement Buy cables\`\n\n` +
    `🗑 \`/del h6\`\n\n` +
    `🔁 *Trigger*\n` +
    `\`/sendbrief\` — fire morning brief now\n` +
    `\`/sendweekly\` — fire weekly summary now`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true })

  const update = req.body
  const message = update.message || update.edited_message
  if (!message) return res.status(200).json({ ok: true })

  const chatId = message.chat.id.toString()
  const text = (message.text || '').trim()

  if (ALLOWED_CHAT_ID && chatId !== ALLOWED_CHAT_ID) {
    await tgSend(chatId, '🔒 Unauthorized.')
    return res.status(200).json({ ok: true })
  }
  if (!text.startsWith('/')) return res.status(200).json({ ok: true })

  const parts = text.split(' ')
  const cmd = parts[0].toLowerCase().split('@')[0]
  const args = parts.slice(1)

  await seedAll()
  const tasks = await getTasks()

  try {
    // ── VIEW ──────────────────────────────────────────────
    if (cmd === '/start' || cmd === '/help') {
      await tgSend(chatId, helpText())

    } else if (cmd === '/tasks') {
      const open = tasks.filter(t => !t.done)
      if (!open.length) return await tgSend(chatId, '✅ All tasks complete!')
      await tgSend(chatId, `*All Open Tasks (${open.length})*\n\n` + open.map(taskLine).join('\n'))

    } else if (cmd === '/urgent') {
      if (args.length === 0) {
        const urg = tasks.filter(t => t.pri === 'urgent' && !t.done)
        if (!urg.length) return await tgSend(chatId, '✅ No urgent tasks!')
        await tgSend(chatId, `🔴 *Urgent Tasks (${urg.length})*\n\n` + urg.map(taskLine).join('\n'))
      } else {
        const id = args[0].toLowerCase()
        const idx = tasks.findIndex(t => t.id === id)
        if (idx === -1) return await tgSend(chatId, `❌ Task \`${id}\` not found.`)
        tasks[idx].pri = 'urgent'; tasks[idx].updatedAt = new Date().toISOString()
        await saveTasks(tasks)
        await tgSend(chatId, `🔴 Marked urgent: \`${id}\`\n_${tasks[idx].txt}_`)
      }

    } else if (cmd === '/week') {
      if (args.length === 0) {
        const week = tasks.filter(t => t.tag === 'week' && !t.done)
        await tgSend(chatId, `📅 *This Week (${week.length})*\n\n` + (week.length ? week.map(taskLine).join('\n') : 'Nothing tagged.'))
      } else {
        const id = args[0].toLowerCase()
        const idx = tasks.findIndex(t => t.id === id)
        if (idx === -1) return await tgSend(chatId, `❌ Task \`${id}\` not found.`)
        tasks[idx].tag = 'week'; tasks[idx].updatedAt = new Date().toISOString()
        await saveTasks(tasks)
        await tgSend(chatId, `📅 Tagged this week: \`${id}\`\n_${tasks[idx].txt}_`)
      }

    } else if (cmd === '/done') {
      if (args.length === 0) {
        const done = tasks.filter(t => t.done)
        await tgSend(chatId, `✅ *Completed (${done.length})*\n\n` + (done.length ? done.slice(0,15).map(t=>`✅ \`${t.id}\` ~${t.txt.substring(0,50)}~`).join('\n') : 'Nothing done yet.'))
      } else {
        const id = args[0].toLowerCase()
        const idx = tasks.findIndex(t => t.id === id)
        if (idx === -1) return await tgSend(chatId, `❌ Task \`${id}\` not found.`)
        tasks[idx].done = true; tasks[idx].updatedAt = new Date().toISOString()
        await saveTasks(tasks)
        await tgSend(chatId, `✅ Done: \`${id}\`\n_${tasks[idx].txt}_`)
      }

    } else if (cmd === '/open') {
      const id = args[0]?.toLowerCase()
      const idx = tasks.findIndex(t => t.id === id)
      if (idx === -1) return await tgSend(chatId, `❌ Task \`${id}\` not found.`)
      tasks[idx].done = false; tasks[idx].updatedAt = new Date().toISOString()
      await saveTasks(tasks)
      await tgSend(chatId, `↩️ Reopened: \`${id}\`\n_${tasks[idx].txt}_`)

    } else if (['/sw','/software'].includes(cmd)) {
      const ts = tasks.filter(t => t.area==='software' && !t.done)
      await tgSend(chatId, `💻 *Software (${ts.length})*\n\n` + (ts.map(taskLine).join('\n') || 'Clear!'))

    } else if (['/hw','/hardware'].includes(cmd)) {
      const ts = tasks.filter(t => t.area==='hardware' && !t.done)
      await tgSend(chatId, `🔧 *Hardware (${ts.length})*\n\n` + (ts.map(taskLine).join('\n') || 'Clear!'))

    } else if (['/biz','/business'].includes(cmd)) {
      const ts = tasks.filter(t => t.area==='business' && !t.done)
      await tgSend(chatId, `💼 *Business (${ts.length})*\n\n` + (ts.map(taskLine).join('\n') || 'Clear!'))

    } else if (['/ops','/operation'].includes(cmd)) {
      const ts = tasks.filter(t => t.area==='operation' && !t.done)
      await tgSend(chatId, `⚙️ *Operation (${ts.length})*\n\n` + (ts.map(taskLine).join('\n') || 'Clear!'))

    } else if (cmd === '/meeting') {
      await tgSend(chatId, meetingBrief(tasks))

    } else if (cmd === '/stats') {
      const areas = ['software','hardware','business','operation']
      const icons = { software:'💻', hardware:'🔧', business:'💼', operation:'⚙️' }
      let msg = `📊 *Task Stats*\n\n`
      areas.forEach(a => {
        const ts = tasks.filter(t => t.area===a)
        const done = ts.filter(t=>t.done).length
        const pct = ts.length ? Math.round(done/ts.length*100) : 0
        const bar = '█'.repeat(Math.floor(pct/10)) + '░'.repeat(10-Math.floor(pct/10))
        msg += `${icons[a]} *${a.toUpperCase()}*\n\`${bar}\` ${pct}% (${done}/${ts.length})\n\n`
      })
      await tgSend(chatId, msg)

    // ── BRIEFING COMMANDS ──────────────────────────────────
    } else if (cmd === '/brief') {
      // Preview morning brief inline
      const [meetings, contacts, tests, certs] = await Promise.all([
        getMeetings(), getContacts(), getTests(),
        (await import('../meetings.js')).getCerts()
      ])
      const { default: morningBriefHandler } = await import('../cron/morning-brief.js')
      // Build message inline by calling our builder
      const today = todayMeetings(meetings)
      const overdue = overdueContacts(contacts)
      const upcoming = upcomingTests(tests, 4)
      const open = tasks.filter(t=>!t.done)
      const urgent = open.filter(t=>t.pri==='urgent')
      let msg = `⚡ *Morning Brief Preview*\n`
      msg += `Open: *${open.length}* · Urgent: *${urgent.length}*\n\n`
      if (today.length) { msg += `📅 *Today's Meetings*\n`; today.forEach(m => { msg += `${m.time} — *${m.title}*\n` }); msg += '\n' }
      if (upcoming.length) { msg += `🔬 *Upcoming Tests*\n`; upcoming.forEach(t => { const d = Math.ceil((new Date(t.date)-new Date(new Date(Date.now()+7*3600000).toISOString().split('T')[0]))/86400000); msg += `${d<=1?'🔴':'🟡'} *${t.title}* — ${t.date} (${d===0?'TODAY':d===1?'TOMORROW':d+'d'})\n` }); msg += '\n' }
      if (overdue.length) { msg += `📞 *Overdue Contacts*\n`; overdue.forEach(c => { msg += `🔴 *${c.name}* — ${c.notes||''}\n` }); msg += '\n' }
      urgent.slice(0,5).forEach(t => { msg += `🔴 \`${t.id}\` ${t.txt.substring(0,55)}\n` })
      await tgSend(chatId, msg)

    } else if (cmd === '/today') {
      const meetings = await getMeetings()
      const today = todayMeetings(meetings)
      if (!today.length) return await tgSend(chatId, '📅 No meetings scheduled today.')
      let msg = `📅 *Today's Meetings (${today.length})*\n\n`
      today.forEach(m => { msg += `*${m.time}* — ${m.title}\n_${m.desc}_\n👥 ${m.attendees?.join(', ')}\n\n` })
      await tgSend(chatId, msg)

    } else if (cmd === '/contacts') {
      const contacts = await getContacts()
      const overdue = overdueContacts(contacts)
      if (!overdue.length) return await tgSend(chatId, '✅ No overdue follow-ups!')
      let msg = `📞 *Overdue Contacts (${overdue.length})*\n\n`
      overdue.forEach(c => { msg += `🔴 *${c.name}* (${c.company})\nDue: ${c.nextFollowUp}\n_${c.notes||''}_\n${c.wechat?`WeChat: ${c.wechat}`:''}\n\n` })
      await tgSend(chatId, msg)

    } else if (cmd === '/tests') {
      const tests = await getTests()
      const upcoming = upcomingTests(tests, 14)
      if (!upcoming.length) return await tgSend(chatId, '🔬 No hardware tests in next 14 days.')
      let msg = `🔬 *Hardware Tests (next 14 days)*\n\n`
      upcoming.forEach(t => {
        const d = Math.ceil((new Date(t.date)-new Date(new Date(Date.now()+7*3600000).toISOString().split('T')[0]))/86400000)
        msg += `${d<=1?'🔴':'📅'} *${t.title}*\n${t.date} ${t.time} — ${d===0?'TODAY':d===1?'TOMORROW':d+'d away'}\nContact: ${t.contactName}\n_${t.notes||''}_\n\n`
      })
      await tgSend(chatId, msg)

    // ── MANUAL CRON TRIGGERS ──────────────────────────────
    } else if (cmd === '/sendbrief') {
      await tgSend(chatId, '⚡ Firing morning brief...')
      const r = await fetch(`${APP_URL}/api/cron/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: 'morning-brief' })
      })
      const d = await r.json()
      if (!d.ok) await tgSend(chatId, `❌ Failed: ${d.error}`)

    } else if (cmd === '/sendweekly') {
      await tgSend(chatId, '📊 Firing weekly summary...')
      const r = await fetch(`${APP_URL}/api/cron/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: 'weekly-summary' })
      })
      const d = await r.json()
      if (!d.ok) await tgSend(chatId, `❌ Failed: ${d.error}`)

    // ── MUTATIONS ─────────────────────────────────────────
    } else if (cmd === '/add') {
      const areaMap = { sw:'software', hw:'hardware', biz:'business', ops:'operation', software:'software', hardware:'hardware', business:'business', operation:'operation' }
      const area = areaMap[args[0]?.toLowerCase()]
      if (!area) return await tgSend(chatId, `❌ Area not recognized. Use: sw hw biz ops`)
      if (args.length < 3) return await tgSend(chatId, `❌ Format: /add hw SectionName Task text`)
      const sec = args[1]; const txt = args.slice(2).join(' ')
      const newTask = { id:`${area[0]}${Date.now()}`, area, sec, txt, pri:'normal', tag:'week', owner:'CEO', done:false, createdAt:new Date().toISOString() }
      tasks.push(newTask)
      await saveTasks(tasks)
      await tgSend(chatId, `➕ Added \`${newTask.id}\`\n_${txt}_\n[${area}] ${sec}`)

    } else if (cmd === '/del') {
      const id = args[0]?.toLowerCase()
      const idx = tasks.findIndex(t => t.id === id)
      if (idx === -1) return await tgSend(chatId, `❌ Task \`${id}\` not found.`)
      const txt = tasks[idx].txt
      tasks.splice(idx, 1)
      await saveTasks(tasks)
      await tgSend(chatId, `🗑 Deleted \`${id}\`\n_${txt}_`)

    } else {
      await tgSend(chatId, `Unknown command. Send /help for all commands.`)
    }

  } catch (err) {
    console.error(err)
    await tgSend(chatId, `⚠️ Error: ${err.message}`)
  }

  return res.status(200).json({ ok: true })
}
