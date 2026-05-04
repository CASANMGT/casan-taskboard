import { kv } from '@vercel/kv'

export const SEED_TASKS = [
  // SOFTWARE
  { id:'s1',  area:'software',  sec:'RTO Notifications',      txt:'Completed RTO — auto-notify finance + ops when final installment clears', pri:'urgent', tag:'week', owner:'Dev',          done:false, createdAt:new Date().toISOString() },
  { id:'s2',  area:'software',  sec:'RTO Notifications',      txt:'Returned RTO — alert triggered on asset return / repo completion',        pri:'urgent', tag:'week', owner:'Dev',          done:false, createdAt:new Date().toISOString() },
  { id:'s3',  area:'software',  sec:'RTO Notifications',      txt:'Continue RTO — notification for renewed / extended installment agreements',pri:'urgent', tag:'week', owner:'Dev',          done:false, createdAt:new Date().toISOString() },
  { id:'s4',  area:'software',  sec:'Platform Features',      txt:'Minimal salary field — underwriter validation + risk threshold config',    pri:'normal', tag:'week', owner:'Dev + Risk',  done:false, createdAt:new Date().toISOString() },
  { id:'s5',  area:'software',  sec:'Platform Features',      txt:'Geofencing out-of-zone — breach alert + immobilization trigger (Zoobii)', pri:'normal', tag:'week', owner:'Dev + HW',    done:false, createdAt:new Date().toISOString() },
  { id:'s6',  area:'software',  sec:'Platform Features',      txt:'Holiday handling — auto-adjust due dates, collection calendar exceptions', pri:'normal', tag:null,   owner:'Dev',          done:false, createdAt:new Date().toISOString() },
  { id:'s7',  area:'software',  sec:'Platform Features',      txt:'Commission rate module — agent/dealer payout calculation',                pri:'normal', tag:null,   owner:'Dev + Finance',done:false, createdAt:new Date().toISOString() },
  { id:'s8',  area:'software',  sec:'Platform Features',      txt:'New statistics dashboard — fleet health, default trends, revenue/unit',   pri:'normal', tag:null,   owner:'Dev + Data',  done:false, createdAt:new Date().toISOString() },
  { id:'s9',  area:'software',  sec:'Platform Features',      txt:'Real-time maps — live fleet view, station availability, route optimization',pri:'normal',tag:null,  owner:'Dev',          done:false, createdAt:new Date().toISOString() },
  { id:'s10', area:'software',  sec:'Platform Features',      txt:'Q2 Rental program — architecture using Omni / Zhixun as reference',       pri:'normal', tag:null,   owner:'Dev',          done:false, createdAt:new Date().toISOString() },
  // HARDWARE
  { id:'h1',  area:'hardware',  sec:'May 10 — United x Sanshi',txt:'Test United motorcycle with Sanshi Ultrafast — May 10 (Mr Zhang)',      pri:'urgent', tag:'week', owner:'CEO + Product',done:false, createdAt:new Date().toISOString() },
  { id:'h2',  area:'hardware',  sec:'May 10 — United x Sanshi',txt:'Prepare test protocol & data capture sheet for Sanshi Ultrafast session',pri:'urgent',tag:'week', owner:'Product',      done:false, createdAt:new Date().toISOString() },
  { id:'h3',  area:'hardware',  sec:'Battery (Unique 6040)',   txt:'Battery Unique 60V40Ah — create UN38.3 certification documentation',     pri:'urgent', tag:'week', owner:'Product',      done:false, createdAt:new Date().toISOString() },
  { id:'h4',  area:'hardware',  sec:'Battery (Unique 6040)',   txt:'Battery Unique 60V40Ah — create MSDS (Material Safety Data Sheet)',      pri:'urgent', tag:'week', owner:'Product',      done:false, createdAt:new Date().toISOString() },
  { id:'h5',  area:'hardware',  sec:'Battery (Unique 6040)',   txt:'Bolong BMS integration & validation — test schedule with supplier',      pri:'normal', tag:null,   owner:'Product',      done:false, createdAt:new Date().toISOString() },
  { id:'h6',  area:'hardware',  sec:'Procurement',             txt:'30A adapter + 3M cable — order from Colorful at 560 yuan',              pri:'normal', tag:'week', owner:'Procurement',  done:false, createdAt:new Date().toISOString() },
  { id:'h7',  area:'hardware',  sec:'Procurement',             txt:'Price comparison — Benfu vs Addison, lock cheapest (by Wed)',            pri:'urgent', tag:'week', owner:'Procurement',  done:false, createdAt:new Date().toISOString() },
  { id:'h8',  area:'hardware',  sec:'Procurement',             txt:'GPS Zoobii — POC status, Indosat connectivity, firmware weekly check',   pri:'normal', tag:'week', owner:'Product + Ops',done:false, createdAt:new Date().toISOString() },
  // BUSINESS
  { id:'b1',  area:'business',  sec:'China Mission Report',    txt:'China report — Nanjing battery exhibition findings',                     pri:'urgent', tag:'week', owner:'CEO',          done:false, createdAt:new Date().toISOString() },
  { id:'b2',  area:'business',  sec:'China Mission Report',    txt:'China report — Yiwu rental program meetings',                           pri:'urgent', tag:'week', owner:'CEO',          done:false, createdAt:new Date().toISOString() },
  { id:'b3',  area:'business',  sec:'China Mission Report',    txt:'China report — Taizhou bike conversion + Tuneng solar bike',            pri:'urgent', tag:'week', owner:'CEO',          done:false, createdAt:new Date().toISOString() },
  { id:'b4',  area:'business',  sec:'China Mission Report',    txt:'China report — Jiaxing / iFaster discussion outcomes',                  pri:'urgent', tag:'week', owner:'CEO',          done:false, createdAt:new Date().toISOString() },
  { id:'b5',  area:'business',  sec:'China Mission Report',    txt:'Honda Beat 110cc conversion kit 2,000 yuan — follow-up from Taizhou',   pri:'normal', tag:'week', owner:'CEO',          done:false, createdAt:new Date().toISOString() },
  { id:'b6',  area:'business',  sec:'Partnerships',            txt:'Blitz 700 fast charger — spec finalization using Bo Long',              pri:'urgent', tag:'week', owner:'Product + Biz', done:false, createdAt:new Date().toISOString() },
  { id:'b7',  area:'business',  sec:'Partnerships',            txt:'Battery fintech deal — landed 7M, sell 8-9M, MOU + legal review',       pri:'urgent', tag:'week', owner:'CEO + Finance', done:false, createdAt:new Date().toISOString() },
  { id:'b8',  area:'business',  sec:'Partnerships',            txt:'iFaster partnership — integration scope, revenue share, rollout plan',   pri:'normal', tag:'week', owner:'Business',     done:false, createdAt:new Date().toISOString() },
  { id:'b9',  area:'business',  sec:'Partnerships',            txt:'Charged charging station — partnership terms + deployment commitment',   pri:'normal', tag:null,   owner:'Business',     done:false, createdAt:new Date().toISOString() },
  { id:'b10', area:'business',  sec:'Partnerships',            txt:'Emoa RTO — program integration, fleet volume, unit economics',           pri:'normal', tag:null,   owner:'Business',     done:false, createdAt:new Date().toISOString() },
  { id:'b11', area:'business',  sec:'Partnerships',            txt:'Tangkas RTO — onboarding, motorbike supply, installment structure',      pri:'normal', tag:'week', owner:'Business',     done:false, createdAt:new Date().toISOString() },
  // OPERATION
  { id:'o1',  area:'operation', sec:'Sites & Fleet',           txt:'Maka showroom replacement — site scouting, shortlist 3 options',        pri:'urgent', tag:'week', owner:'Ops',          done:false, createdAt:new Date().toISOString() },
  { id:'o2',  area:'operation', sec:'Sites & Fleet',           txt:'Polytron X charging station — site finalization + landlord negotiation', pri:'urgent', tag:'week', owner:'Ops + Biz',   done:false, createdAt:new Date().toISOString() },
  { id:'o3',  area:'operation', sec:'Sites & Fleet',           txt:'RTO daily fleet monitoring + collection follow-up',                      pri:'normal', tag:'week', owner:'Ops',          done:false, createdAt:new Date().toISOString() },
  { id:'o4',  area:'operation', sec:'Reporting',               txt:'Weekly ops report — kWh, repairs log, uptime %, defaults, revenue/target',pri:'normal',tag:'week', owner:'Ops',         done:false, createdAt:new Date().toISOString() },
]

function isHttpUrl(s) {
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function normalizeLinks(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const x of raw) {
    if (typeof x === 'string') {
      const u = x.trim()
      if (isHttpUrl(u)) out.push({ url: u, label: '' })
    } else if (x && typeof x === 'object') {
      const u = String(x.url || '').trim()
      if (isHttpUrl(u)) out.push({ url: u, label: String(x.label || '').slice(0, 160) })
    }
    if (out.length >= 24) break
  }
  return out
}

export function normalizeImages(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((u) => typeof u === 'string')
    .map((u) => u.trim())
    .filter((u) => {
      if (u.startsWith('https://') || u.startsWith('http://')) return u.length < 2048
      if (u.startsWith('data:image/')) return u.length < 480000
      return false
    })
    .slice(0, 12)
}

export function normalizeTask(t) {
  if (!t || typeof t !== 'object') return t
  const details = typeof t.details === 'string' ? t.details.slice(0, 20000) : ''
  return {
    ...t,
    details,
    links: normalizeLinks(t.links),
    images: normalizeImages(t.images),
  }
}

export async function getTasks() {
  try {
    const tasks = await kv.get('casan:tasks:v2')
    if (!tasks) {
      await kv.set('casan:tasks:v2', SEED_TASKS)
      return SEED_TASKS.map(normalizeTask)
    }
    return tasks.map(normalizeTask)
  } catch {
    return SEED_TASKS.map(normalizeTask)
  }
}

export async function saveTasks(tasks) {
  await kv.set('casan:tasks:v2', tasks)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method === 'GET') {
    return res.status(200).json(await getTasks())
  }

  if (req.method === 'POST') {
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const { txt, area, sec, pri, tag, owner, details, links, images } = body
    if (!txt || !area) return res.status(400).json({ error: 'txt and area required' })
    if (!['software', 'hardware', 'business', 'operation'].includes(area)) {
      return res.status(400).json({ error: 'invalid area' })
    }
    const tasks = await getTasks()
    const task = normalizeTask({
      id: `${area[0]}${Date.now()}`,
      area,
      sec: sec || 'General',
      txt: String(txt).trim(),
      pri: pri === 'urgent' ? 'urgent' : 'normal',
      tag: tag === 'week' ? 'week' : null,
      owner: owner ? String(owner).trim() : 'CEO',
      done: false,
      createdAt: new Date().toISOString(),
      details,
      links,
      images,
    })
    tasks.push(task)
    await saveTasks(tasks)
    return res.status(201).json(task)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
