import { getTasks, saveTasks, normalizeTask } from '../tasks.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { id } = req.query

  if (req.method === 'PATCH') {
    const tasks = await getTasks()
    const idx = tasks.findIndex(t => t.id === id)
    if (idx === -1) return res.status(404).json({ error: 'Not found' })
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const patch = {}
    for (const k of ['txt', 'sec', 'pri', 'tag', 'owner', 'done', 'area', 'details', 'links', 'images']) {
      if (k in body) patch[k] = body[k]
    }
    if (patch.area != null && !['software', 'hardware', 'business', 'operation'].includes(patch.area)) {
      return res.status(400).json({ error: 'invalid area' })
    }
    if (patch.pri != null && !['urgent', 'normal'].includes(patch.pri)) {
      return res.status(400).json({ error: 'invalid pri' })
    }
    if (patch.tag != null && patch.tag !== '' && patch.tag !== 'week') {
      return res.status(400).json({ error: 'invalid tag' })
    }
    if (patch.tag === '') patch.tag = null
    if (patch.txt !== undefined && typeof patch.txt === 'string' && !patch.txt.trim()) {
      return res.status(400).json({ error: 'txt cannot be empty' })
    }
    if (patch.txt != null) patch.txt = String(patch.txt).trim()
    if (patch.sec != null) patch.sec = String(patch.sec).trim() || 'General'
    if (patch.owner != null) patch.owner = String(patch.owner).trim() || 'CEO'
    if (patch.details != null && typeof patch.details !== 'string') {
      return res.status(400).json({ error: 'details must be string' })
    }
    if (patch.links != null && !Array.isArray(patch.links)) {
      return res.status(400).json({ error: 'links must be array' })
    }
    if (patch.images != null && !Array.isArray(patch.images)) {
      return res.status(400).json({ error: 'images must be array' })
    }
    const merged = { ...tasks[idx], ...patch, id: tasks[idx].id, updatedAt: new Date().toISOString() }
    tasks[idx] = normalizeTask(merged)
    await saveTasks(tasks)
    return res.status(200).json(tasks[idx])
  }

  if (req.method === 'DELETE') {
    const tasks = await getTasks()
    const filtered = tasks.filter(t => t.id !== id)
    if (filtered.length === tasks.length) return res.status(404).json({ error: 'Not found' })
    await saveTasks(filtered)
    return res.status(200).json({ deleted: id })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
