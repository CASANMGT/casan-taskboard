import { kv } from '@vercel/kv'

const SEED_TASKS = [
  // SOFTWARE
  { id: 's1', area: 'software', sec: 'RTO Notifications', txt: 'Completed RTO — auto-notify finance + ops when final installment clears', pri: 'urgent', tag: 'week', owner: 'Dev', done: false },
  { id: 's2', area: 'software', sec: 'RTO Notifications', txt: 'Returned RTO — alert triggered on asset return / repo completion', pri: 'urgent', tag: 'week', owner: 'Dev', done: false },
  { id: 's3', area: 'software', sec: 'RTO Notifications', txt: 'Continue RTO — notification for renewed / extended installment agreements', pri: 'urgent', tag: 'week', owner: 'Dev', done: false },
  { id: 's4', area: 'software', sec: 'Platform Features', txt: 'Minimal salary field — underwriter validation + risk threshold config', pri: 'normal', tag: 'week', owner: 'Dev + Risk', done: false },
  { id: 's5', area: 'software', sec: 'Platform Features', txt: 'Geofencing out-of-zone — breach alert flow + immobilization trigger (sync Zoobii)', pri: 'normal', tag: 'week', owner: 'Dev + HW', done: false },
  { id: 's6', area: 'software', sec: 'Platform Features', txt: 'Holiday handling — auto-adjust due dates, collection calendar exceptions', pri: 'normal', tag: null, owner: 'Dev', done: false },
  { id: 's7', area: 'software', sec: 'Platform Features', txt: 'Commission rate module — agent/dealer payout calculation', pri: 'normal', tag: null, owner: 'Dev + Finance', done: false },
  { id: 's8', area: 'software', sec: 'Platform Features', txt: 'New statistics dashboard — fleet health, default trends, revenue/unit', pri: 'normal', tag: null, owner: 'Dev + Data', done: false },
  { id: 's9', area: 'software', sec: 'Platform Features', txt: 'Real-time maps — live fleet view, station availability, route optimization', pri: 'normal', tag: null, owner: 'Dev', done: false },
  { id: 's10', area: 'software', sec: 'Platform Features', txt: 'Q2 Rental program — architecture using Omni / Zhixun as reference', pri: 'normal', tag: null, owner: 'Dev', done: false },
  // HARDWARE
  { id: 'h1', area: 'hardware', sec: 'May 10 Test — United x Sanshi', txt: 'Test United motorcycle with Sanshi Ultrafast charger — May 10 (confirm with Mr Zhang)', pri: 'urgent', tag: 'week', owner: 'CEO + Product', done: false },
  { id: 'h2', area: 'hardware', sec: 'May 10 Test — United x Sanshi', txt: 'Prepare test protocol & data capture sheet for Sanshi Ultrafast session', pri: 'urgent', tag: 'week', owner: 'Product', done: false },
  { id: 'h3', area: 'hardware', sec: 'Battery (Unique 6040)', txt: 'Battery Unique 60V40Ah — create UN38.3 certification documentation', pri: 'urgent', tag: 'week', owner: 'Product', done: false },
  { id: 'h4', area: 'hardware', sec: 'Battery (Unique 6040)', txt: 'Battery Unique 60V40Ah — create MSDS (Material Safety Data Sheet)', pri: 'urgent', tag: 'week', owner: 'Product', done: false },
  { id: 'h5', area: 'hardware', sec: 'Battery (Unique 6040)', txt: 'Bolong BMS integration & validation — test schedule with supplier', pri: 'normal', tag: null, owner: 'Product', done: false },
  { id: 'h6', area: 'hardware', sec: 'Procurement', txt: '30A adapter + 3M cable — order from Colorful at 560 yuan', pri: 'normal', tag: 'week', owner: 'Procurement', done: false },
  { id: 'h7', area: 'hardware', sec: 'Procurement', txt: 'Price comparison — Benfu vs Addison, lock cheapest option (by Wed)', pri: 'urgent', tag: 'week', owner: 'Procurement', done: false },
  { id: 'h8', area: 'hardware', sec: 'Procurement', txt: 'GPS Zoobii — POC status, Indosat connectivity, firmware weekly check', pri: 'normal', tag: 'week', owner: 'Product + Ops', done: false },
  // BUSINESS
  { id: 'b1', area: 'business', sec: 'China Mission Report', txt: 'China mission report — Nanjing battery exhibition findings', pri: 'urgent', tag: 'week', owner: 'CEO', done: false },
  { id: 'b2', area: 'business', sec: 'China Mission Report', txt: 'China mission report — Yiwu rental program meetings', pri: 'urgent', tag: 'week', owner: 'CEO', done: false },
  { id: 'b3', area: 'business', sec: 'China Mission Report', txt: 'China mission report — Taizhou bike conversion + Tuneng solar bike', pri: 'urgent', tag: 'week', owner: 'CEO', done: false },
  { id: 'b4', area: 'business', sec: 'China Mission Report', txt: 'China mission report — Jiaxing / iFaster discussion outcomes', pri: 'urgent', tag: 'week', owner: 'CEO', done: false },
  { id: 'b5', area: 'business', sec: 'China Mission Report', txt: 'Honda Beat 110cc conversion kit 2,000 yuan — follow-up from Taizhou', pri: 'normal', tag: 'week', owner: 'CEO', done: false },
  { id: 'b6', area: 'business', sec: 'Partnerships', txt: 'Blitz 700 fast charger — spec finalization using Bo Long', pri: 'urgent', tag: 'week', owner: 'Product + Biz', done: false },
  { id: 'b7', area: 'business', sec: 'Partnerships', txt: 'Battery fintech deal — landed cost 7M, sell 8–9M, MOU + legal review', pri: 'urgent', tag: 'week', owner: 'CEO + Finance', done: false },
  { id: 'b8', area: 'business', sec: 'Partnerships', txt: 'iFaster partnership — integration scope, revenue share, rollout plan', pri: 'normal', tag: 'week', owner: 'Business', done: false },
  { id: 'b9', area: 'business', sec: 'Partnerships', txt: 'Charged charging station — partnership terms + deployment commitment', pri: 'normal', tag: null, owner: 'Business', done: false },
  { id: 'b10', area: 'business', sec: 'Partnerships', txt: 'Emoa RTO — program integration, fleet volume, unit economics', pri: 'normal', tag: null, owner: 'Business', done: false },
  { id: 'b11', area: 'business', sec: 'Partnerships', txt: 'Tangkas RTO — onboarding, motorbike supply, installment structure', pri: 'normal', tag: 'week', owner: 'Business', done: false },
  // OPERATION
  { id: 'o1', area: 'operation', sec: 'Sites & Fleet', txt: 'Maka showroom replacement — site scouting, shortlist 3 options', pri: 'urgent', tag: 'week', owner: 'Ops', done: false },
  { id: 'o2', area: 'operation', sec: 'Sites & Fleet', txt: 'Polytron X charging station — site finalization + landlord negotiation', pri: 'urgent', tag: 'week', owner: 'Ops + Biz', done: false },
  { id: 'o3', area: 'operation', sec: 'Sites & Fleet', txt: 'RTO daily fleet monitoring + collection follow-up', pri: 'normal', tag: 'week', owner: 'Ops', done: false },
  { id: 'o4', area: 'operation', sec: 'Reporting', txt: 'Weekly ops report — kWh delivered, repairs log, uptime %, default alerts, revenue vs target', pri: 'normal', tag: 'week', owner: 'Ops', done: false },
]

async function getTasks() {
  try {
    const tasks = await kv.get('casan:tasks')
    if (!tasks) {
      await kv.set('casan:tasks', SEED_TASKS)
      return SEED_TASKS
    }
    return tasks
  } catch {
    return SEED_TASKS
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method === 'GET') {
    const tasks = await getTasks()
    return res.status(200).json(tasks)
  }

  if (req.method === 'POST') {
    const { txt, area, sec, pri, tag, owner } = req.body
    if (!txt || !area) return res.status(400).json({ error: 'txt and area required' })
    const tasks = await getTasks()
    const newTask = {
      id: `${area[0]}${Date.now()}`,
      area, sec: sec || 'General', txt,
      pri: pri || 'normal',
      tag: tag || null,
      owner: owner || 'CEO',
      done: false,
      createdAt: new Date().toISOString()
    }
    tasks.push(newTask)
    await kv.set('casan:tasks', tasks)
    return res.status(201).json(newTask)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
