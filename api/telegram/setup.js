// GET /api/telegram/setup — registers the webhook URL with Telegram
export default async function handler(req, res) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const host = req.headers.host || req.headers['x-forwarded-host']
  const webhookUrl = `https://${host}/api/telegram/webhook`

  const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message','edited_message'] })
  })
  const data = await r.json()
  return res.status(200).json({ webhookUrl, telegram: data })
}
