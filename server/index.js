// HabitTube sync server — a thin Express + MongoDB backend.
// The app is offline-first (browser localStorage); this stores one JSON
// document per user so data can sync across devices. Last-write-wins by
// updatedAt timestamp — fine for a single user syncing their own devices.
import cors from 'cors'
import express from 'express'
import { MongoClient } from 'mongodb'

const PORT = process.env.PORT || 4000
const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017'
const DB_NAME = process.env.MONGO_DB || 'habittube'

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

let states = null

app.get('/api/health', (_req, res) => res.json({ ok: !!states }))

app.get('/api/state/:userId', async (req, res) => {
  if (!states) return res.status(503).json({ error: 'db not ready' })
  try {
    const doc = await states.findOne({ userId: req.params.userId })
    res.json(doc ? { state: doc.state, updatedAt: doc.updatedAt } : null)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

app.put('/api/state/:userId', async (req, res) => {
  if (!states) return res.status(503).json({ error: 'db not ready' })
  try {
    const { state, updatedAt } = req.body || {}
    if (!state) return res.status(400).json({ error: 'missing state' })
    await states.updateOne(
      { userId: req.params.userId },
      { $set: { state, updatedAt: updatedAt || Date.now() } },
      { upsert: true }
    )
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

async function start() {
  try {
    const client = new MongoClient(MONGO_URL, { serverSelectionTimeoutMS: 4000 })
    await client.connect()
    states = client.db(DB_NAME).collection('states')
    await states.createIndex({ userId: 1 }, { unique: true })
    console.log(`[habittube] sync server on http://localhost:${PORT}  (mongo: ${MONGO_URL}/${DB_NAME})`)
  } catch (e) {
    console.error(`[habittube] Could not connect to MongoDB at ${MONGO_URL}.`)
    console.error('           Is MongoDB running? The app still works offline without it.')
    console.error('          ', e.message)
  }
  // Listen regardless so /api/health responds even if Mongo is down.
  app.listen(PORT, () => console.log(`[habittube] HTTP listening on ${PORT}`))
}

start()
