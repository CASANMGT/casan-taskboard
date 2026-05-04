import { getTasks, saveTasks } from '../tasks.js'

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
    tasks[idx] = { ...tasks[idx], ...req.body, id, updatedAt: new Date().toISOString() }
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
