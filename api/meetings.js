import { kv } from '@vercel/kv'

// ─── SEED DATA ────────────────────────────────────────────────────────────────

const SEED_MEETINGS = [
  // Recurring weekly meetings
  { id:'m1', type:'recurring', title:'Ops Standup',       day:'monday',    time:'09:00', areas:['operation','hardware'], desc:'Fleet status, site updates, collection follow-up', attendees:['Ops team'] },
  { id:'m2', type:'recurring', title:'Product Review',    day:'wednesday', time:'10:00', areas:['software','hardware','product'], desc:'Dev progress, tech blockers, hardware tests', attendees:['Dev team','Product'] },
  { id:'m3', type:'recurring', title:'CEO Weekly Wrap',   day:'friday',    time:'16:00', areas:['business','operation'], desc:'Partnership updates, financial pulse, next week priorities', attendees:['All leads'] },
  { id:'m4', type:'recurring', title:'Partner Sync',      day:'thursday',  time:'14:00', areas:['business'], desc:'Dealer, OEM, and fintech partner check-ins', attendees:['Business team'] },
]

const SEED_CONTACTS = [
  { id:'c1', name:'Mr Zhang',    company:'Sanshi',       role:'Hardware partner',   phone:'+86-xxx', wechat:'zhang_sanshi',  lastContact:null, nextFollowUp:'2026-05-08', area:'hardware', notes:'May 10 Ultrafast test coordinator', status:'active' },
  { id:'c2', name:'Colorful',    company:'Colorful',     role:'Supplier',           phone:'+86-xxx', wechat:'colorful_ev',   lastContact:null, nextFollowUp:'2026-05-06', area:'hardware', notes:'30A adapter + 3M cable order — 560 yuan', status:'pending' },
  { id:'c3', name:'iFaster',     company:'iFaster',      role:'Partnership',        phone:null,      wechat:null,            lastContact:null, nextFollowUp:'2026-05-10', area:'business', notes:'Post-Jiaxing integration scope discussion', status:'active' },
  { id:'c4', name:'Tangkas',     company:'Tangkas Motors',role:'Dealer partner',    phone:null,      wechat:null,            lastContact:null, nextFollowUp:'2026-05-07', area:'business', notes:'RTO onboarding + motorbike supply', status:'active' },
  { id:'c5', name:'Emoa',        company:'Emoa',         role:'RTO partner',        phone:null,      wechat:null,            lastContact:null, nextFollowUp:'2026-05-09', area:'business', notes:'Fleet volume + unit economics sync', status:'active' },
  { id:'c6', name:'Zoobii',      company:'Zoobii GPS',   role:'Hardware vendor',    phone:null,      wechat:null,            lastContact:null, nextFollowUp:'2026-05-07', area:'hardware', notes:'GPS POC — Indosat connectivity + firmware', status:'pending' },
  { id:'c7', name:'Sanshi',      company:'Sanshi',       role:'Charger supplier',   phone:'+86-xxx', wechat:'sanshi_ev',     lastContact:null, nextFollowUp:'2026-05-08', area:'hardware', notes:'WeChat reminder pending — Bolong integration', status:'pending' },
]

const SEED_CERTS = [
  { id:'cert1', product:'Battery Unique 60V40Ah', certType:'UN38.3', status:'pending',   submittedAt:null, approvedAt:null, expiresAt:null, notes:'Documentation creation in progress — task h3', taskId:'h3' },
  { id:'cert2', product:'Battery Unique 60V40Ah', certType:'MSDS',   status:'pending',   submittedAt:null, approvedAt:null, expiresAt:null, notes:'Material Safety Data Sheet creation — task h4', taskId:'h4' },
  { id:'cert3', product:'Bolong 4.5kWh Ultrafast', certType:'Safety', status:'in_review', submittedAt:'2026-04-20', approvedAt:null, expiresAt:null, notes:'Pending manufacturer confirmation' },
]

const SEED_TESTS = [
  { id:'t1', title:'United x Sanshi Ultrafast', date:'2026-05-10', time:'10:00', location:'TBD', contactId:'c1', contactName:'Mr Zhang', status:'scheduled', product:'United motorcycle + Sanshi Ultrafast charger', protocol:['Check initial SOC', 'Record charge start time', 'Log kWh at 15min intervals', 'Record peak temp', 'Confirm full charge time', 'Document any anomalies'], result:null, notes:'Bolong 4.5kWh Ultrafast unit — confirm logistics', taskIds:['h1','h2'] },
]

// ─── KV HELPERS ──────────────────────────────────────────────────────────────

export async function getMeetings() {
  try { return (await kv.get('casan:meetings')) || SEED_MEETINGS } catch { return SEED_MEETINGS }
}
export async function getContacts() {
  try { return (await kv.get('casan:contacts')) || SEED_CONTACTS } catch { return SEED_CONTACTS }
}
export async function getCerts() {
  try { return (await kv.get('casan:certs')) || SEED_CERTS } catch { return SEED_CERTS }
}
export async function getTests() {
  try { return (await kv.get('casan:tests')) || SEED_TESTS } catch { return SEED_TESTS }
}

export async function saveContacts(data) { await kv.set('casan:contacts', data) }
export async function saveMeetings(data) { await kv.set('casan:meetings', data) }
export async function saveCerts(data)    { await kv.set('casan:certs', data) }
export async function saveTests(data)    { await kv.set('casan:tests', data) }

// Seed all on first run
export async function seedAll() {
  const [m, c, ce, t] = await Promise.all([
    kv.get('casan:meetings'), kv.get('casan:contacts'),
    kv.get('casan:certs'),    kv.get('casan:tests'),
  ])
  await Promise.all([
    !m  && kv.set('casan:meetings', SEED_MEETINGS),
    !c  && kv.set('casan:contacts', SEED_CONTACTS),
    !ce && kv.set('casan:certs',    SEED_CERTS),
    !t  && kv.set('casan:tests',    SEED_TESTS),
  ].filter(Boolean))
}

// ─── UTILITIES ───────────────────────────────────────────────────────────────

export function todayMeetings(meetings) {
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  // WIB = UTC+7
  const wib = new Date(Date.now() + 7 * 3600000)
  const todayDay = days[wib.getUTCDay()]
  const todayStr = wib.toISOString().split('T')[0]
  return meetings.filter(m =>
    (m.type === 'recurring' && m.day === todayDay) ||
    (m.type === 'adhoc'     && m.date === todayStr)
  )
}

export function overdueContacts(contacts) {
  const todayStr = new Date(Date.now() + 7*3600000).toISOString().split('T')[0]
  return contacts.filter(c => c.nextFollowUp && c.nextFollowUp <= todayStr && c.status !== 'done')
}

export function upcomingTests(tests, daysAhead = 3) {
  const todayStr = new Date(Date.now() + 7*3600000).toISOString().split('T')[0]
  const limitStr = new Date(Date.now() + 7*3600000 + daysAhead*86400000).toISOString().split('T')[0]
  return tests.filter(t => t.status === 'scheduled' && t.date >= todayStr && t.date <= limitStr)
}

export function expiringCerts(certs, daysAhead = 30) {
  const todayStr = new Date(Date.now() + 7*3600000).toISOString().split('T')[0]
  const limitStr = new Date(Date.now() + 7*3600000 + daysAhead*86400000).toISOString().split('T')[0]
  return certs.filter(c => c.expiresAt && c.expiresAt >= todayStr && c.expiresAt <= limitStr)
}

// ─── ROUTE HANDLER ───────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  await seedAll()
  const { resource } = req.query  // /api/meetings?resource=contacts|certs|tests|meetings

  const loaders = { meetings: getMeetings, contacts: getContacts, certs: getCerts, tests: getTests }
  const savers  = { meetings: saveMeetings, contacts: saveContacts, certs: saveCerts, tests: saveTests }
  const key = resource || 'meetings'
  if (!loaders[key]) return res.status(400).json({ error: 'Unknown resource' })

  if (req.method === 'GET') {
    const data = await loaders[key]()
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const data = await loaders[key]()
    const newItem = { id: `${key[0]}${Date.now()}`, createdAt: new Date().toISOString(), ...req.body }
    data.push(newItem)
    await savers[key](data)
    return res.status(201).json(newItem)
  }

  if (req.method === 'PATCH') {
    const { id } = req.query
    const data = await loaders[key]()
    const idx = data.findIndex(x => x.id === id)
    if (idx === -1) return res.status(404).json({ error: 'Not found' })
    data[idx] = { ...data[idx], ...req.body, id, updatedAt: new Date().toISOString() }
    await savers[key](data)
    return res.status(200).json(data[idx])
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    const data = await loaders[key]()
    const filtered = data.filter(x => x.id !== id)
    await savers[key](filtered)
    return res.status(200).json({ deleted: id })
  }

  return res.status(405).end()
}
