import { getTasks, saveTasks } from '../tasks.js'

function reorderSectionBlock(tasks, area, sec, orderedIds) {
  const inSection = tasks.filter((t) => t.area === area && t.sec === sec)
  const idSet = new Set(inSection.map((t) => t.id))
  if (orderedIds.length !== idSet.size || !orderedIds.every((id) => idSet.has(id))) {
    return null
  }
  const byId = new Map(inSection.map((t) => [t.id, t]))
  const block = orderedIds.map((id) => byId.get(id)).filter(Boolean)
  if (block.length !== orderedIds.length) return null
  const next = []
  let used = false
  for (const t of tasks) {
    if (t.area === area && t.sec === sec) {
      if (!used) {
        next.push(...block)
        used = true
      }
    } else {
      next.push(t)
    }
  }
  if (!used) next.push(...block)
  return next
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const { area, sec, ids } = body
  if (!area || !['software', 'hardware', 'business', 'operation'].includes(area)) {
    return res.status(400).json({ error: 'invalid area' })
  }
  const secN = String(sec ?? '').trim() || 'General'
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array required' })
  }

  const tasks = await getTasks()
  const next = reorderSectionBlock(tasks, area, secN, ids)
  if (!next) return res.status(400).json({ error: 'invalid ids for this area/subtitle' })
  await saveTasks(next)
  return res.status(200).json({ tasks: next })
}
