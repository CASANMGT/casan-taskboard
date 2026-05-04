import { put } from '@vercel/blob'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { base64, filename } = req.body || {}
  if (!base64 || typeof base64 !== 'string' || !base64.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Expected data:image/...;base64,...' })
  }

  const comma = base64.indexOf(',')
  if (comma < 0) return res.status(400).json({ error: 'invalid base64' })
  const approxBytes = (base64.length * 3) / 4
  if (approxBytes > 1.65 * 1024 * 1024) return res.status(400).json({ error: 'Image too large (max ~1.6MB)' })

  const buf = Buffer.from(base64.slice(comma + 1), 'base64')
  const token = process.env.BLOB_READ_WRITE_TOKEN

  if (token) {
    const safeName = (filename || 'upload.png').replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 80)
    const pathname = `tasks/${Date.now()}-${safeName}`
    const blob = await put(pathname, buf, { access: 'public', token })
    return res.status(200).json({ url: blob.url })
  }

  if (approxBytes > 420000) {
    return res.status(400).json({
      error: 'Without BLOB_READ_WRITE_TOKEN images must be under ~400KB, or set BLOB_READ_WRITE_TOKEN for Vercel Blob',
    })
  }
  return res.status(200).json({ url: base64, inline: true })
}
