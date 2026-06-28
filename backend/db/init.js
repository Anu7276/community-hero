const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '../../data')
const DB_FILE = path.join(DATA_DIR, 'db.json')
const DEFAULT_DB = { issues: [], votes: [], comments: [], _nextId: 1 }

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function readDB() {
  ensureDir()
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2))
    return { ...DEFAULT_DB }
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    // Ensure all required keys exist even if db is old
    return {
      issues: parsed.issues || [],
      votes: parsed.votes || [],
      comments: parsed.comments || [],
      _nextId: parsed._nextId || 1,
    }
  } catch (err) {
    console.error('⚠️  DB corrupted, resetting to empty:', err.message)
    // Backup corrupted file
    try {
      fs.copyFileSync(DB_FILE, DB_FILE + '.bak.' + Date.now())
    } catch (_) {}
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2))
    return { ...DEFAULT_DB }
  }
}

// Async write queue — prevents race conditions
let writeQueue = Promise.resolve()

function writeDB(data) {
  writeQueue = writeQueue.then(() => {
    ensureDir()
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2))
  }).catch(err => console.error('DB write error:', err))
  return writeQueue
}

async function initDB() {
  readDB()
  console.log('✅ Database initialized')
}

module.exports = { readDB, writeDB, initDB }
