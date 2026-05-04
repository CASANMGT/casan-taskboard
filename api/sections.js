import { kv } from '@vercel/kv'
import { getTasks, saveTasks } from './tasks.js'

const PRESETS_KEY = 'casan:section-presets:v1'

async function getPresets() {
  try {
    const d = await kv.get(PRESETS_KEY)
    return d && typeof d === 'object' ? d : {}
  } catch {
    return {}
  }
}

async function setPresets(presets) {
  await kv.set(PRESETS_KEY, presets)
}

function mergeSectionLists(tasks, presets) {
  const areas = {}
  for (const a of ['software', 'hardware', 'business', 'operation']) {
    const set = new Set([...(presets[a] || [])])
    for (const t of tasks) {
      if (t.area === a && t.sec) set.add(String(t.sec))
    }
    areas[a] = [...set].sort((x, y) => x.localeCompare(y))
  }
  return areas
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method === 'GET') {
    const tasks = await getTasks()
    const presets = await getPresets()
    return res.status(200).json({ areas: mergeSectionLists(tasks, presets) })
  }

  if (req.method === 'POST') {
    const { area, name } = req.body || {}
    if (!area || !['software', 'hardware', 'business', 'operation'].includes(area)) {
      return res.status(400).json({ error: 'invalid area' })
    }
    const n = String(name || '').trim()
    if (!n) return res.status(400).json({ error: 'name required' })
    const presets = await getPresets()
    const list = [...(presets[area] || [])]
    if (!list.includes(n)) list.push(n)
    presets[area] = list.sort((a, b) => a.localeCompare(b))
    await setPresets(presets)
    const tasks = await getTasks()
    return res.status(200).json({ areas: mergeSectionLists(tasks, presets) })
  }

  if (req.method === 'PATCH') {
    const { area, from, to } = req.body || {}
    if (!area || !['software', 'hardware', 'business', 'operation'].includes(area)) {
      return res.status(400).json({ error: 'invalid area' })
    }
    const fromN = String(from || '').trim()
    const toN = String(to || '').trim()
    if (!fromN || !toN) return res.status(400).json({ error: 'from and to required' })
    if (fromN === toN) return res.status(200).json({ ok: true })

    const tasks = await getTasks()
    let tasksMutated = false
    const next = tasks.map((t) => {
      if (t.area === area && t.sec === fromN) {
        tasksMutated = true
        return { ...t, sec: toN, updatedAt: new Date().toISOString() }
      }
      return t
    })
    if (tasksMutated) await saveTasks(next)

    const presets = await getPresets()
    const list = [...(presets[area] || [])]
    const idx = list.indexOf(fromN)
    if (idx !== -1) list[idx] = toN
    else if (tasksMutated && !list.includes(toN)) list.push(toN)
    presets[area] = [...new Set(list)].sort((a, b) => a.localeCompare(b))
    await setPresets(presets)

    if (!tasksMutated && idx === -1) {
      return res.status(404).json({ error: 'unknown subtitle' })
    }

    return res.status(200).json({ ok: true, areas: mergeSectionLists(next, presets) })
  }

  if (req.method === 'DELETE') {
    const { area, name, reassignTo } = req.body || {}
    if (!area || !['software', 'hardware', 'business', 'operation'].includes(area)) {
      return res.status(400).json({ error: 'invalid area' })
    }
    const nameN = String(name || '').trim()
    if (!nameN) return res.status(400).json({ error: 'name required' })

    const tasks = await getTasks()
    const used = tasks.filter((t) => t.area === area && t.sec === nameN)
    let next = tasks
    if (used.length > 0) {
      const toN = String(reassignTo ?? '').trim()
      if (!toN) {
        return res.status(400).json({
          error: 'reassignTo required — tasks still use this subtitle',
          count: used.length,
        })
      }
      if (toN === nameN) return res.status(400).json({ error: 'reassignTo must differ from deleted subtitle' })
      next = tasks.map((t) =>
        t.area === area && t.sec === nameN
          ? { ...t, sec: toN, updatedAt: new Date().toISOString() }
          : t
      )
      await saveTasks(next)
    }

    const presets = await getPresets()
    const list = [...(presets[area] || [])].filter((n) => n !== nameN)
    presets[area] = list
    await setPresets(presets)

    return res.status(200).json({ areas: mergeSectionLists(next, presets) })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
