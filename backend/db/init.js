const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { getApps, initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { Storage } = require('@google-cloud/storage')

const DATA_DIR_DEFAULT = path.join(__dirname, '../../data')
let DATA_DIR = process.env.DATA_DIR || DATA_DIR_DEFAULT
let DB_FILE = path.join(DATA_DIR, 'db.json')
const DEFAULT_DB = { issues: [], votes: [], comments: [], _nextId: 1 }
let USE_FIRESTORE = process.env.DB_PROVIDER === 'firestore'

let firestore = null
let storage = null
let bucket = null

function ensureDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  } catch (err) {
    console.warn(`Could not create ${DATA_DIR}, falling back to /tmp/community-hero-data:`, err.message)
    DATA_DIR = path.join('/tmp', 'community-hero-data')
    DB_FILE = path.join(DATA_DIR, 'db.json')
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    } catch (_) {}
  }
}

function readLocalDB() {
  ensureDir()
  if (!fs.existsSync(DB_FILE)) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2))
    } catch (err) {
      console.warn('Could not write initial local DB to disk, using in-memory state:', err.message)
    }
    return { ...DEFAULT_DB }
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    return {
      issues: parsed.issues || [],
      votes: parsed.votes || [],
      comments: parsed.comments || [],
      _nextId: parsed._nextId || 1,
    }
  } catch (err) {
    console.error('Local DB corrupted, resetting:', err.message)
    try {
      fs.copyFileSync(DB_FILE, `${DB_FILE}.bak.${Date.now()}`)
    } catch (_) {}
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2))
    } catch (_) {}
    return { ...DEFAULT_DB }
  }
}

let writeQueue = Promise.resolve()

function writeLocalDB(data) {
  writeQueue = writeQueue.then(() => {
    ensureDir()
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2))
    } catch (err) {
      console.warn('Local DB disk write error (continuing in-memory):', err.message)
    }
  }).catch(err => console.error('Local DB write queue error:', err))
  return writeQueue
}

function initFirebase() {
  if (!getApps().length) {
    initializeApp({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT,
    })
  }

  firestore = getFirestore()
  try {
    storage = new Storage()
    if (process.env.FIREBASE_STORAGE_BUCKET) {
      bucket = storage.bucket(process.env.FIREBASE_STORAGE_BUCKET)
    }
  } catch (err) {
    console.warn('Cloud Storage initialization warning:', err.message)
  }
}

function sortByCreatedDesc(items) {
  return [...items].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
}

async function getIssues() {
  if (USE_FIRESTORE && firestore) {
    try {
      const snapshot = await firestore.collection('issues').get()
      return sortByCreatedDesc(snapshot.docs.map(doc => doc.data()))
    } catch (err) {
      console.warn('Firestore getIssues failed, falling back to local DB:', err.message)
    }
  }
  return readLocalDB().issues
}

async function getIssue(id) {
  const issueId = parseInt(id, 10)
  if (USE_FIRESTORE && firestore) {
    try {
      const doc = await firestore.collection('issues').doc(String(issueId)).get()
      return doc.exists ? doc.data() : null
    } catch (err) {
      console.warn('Firestore getIssue failed, falling back to local DB:', err.message)
    }
  }
  return readLocalDB().issues.find(issue => issue.id === issueId) || null
}

async function addIssue(issueData) {
  if (USE_FIRESTORE && firestore) {
    try {
      const countersRef = firestore.collection('meta').doc('counters')
      const issue = await firestore.runTransaction(async transaction => {
        const countersDoc = await transaction.get(countersRef)
        const nextId = countersDoc.exists ? countersDoc.data().nextIssueId || 1 : 1
        const newIssue = { ...issueData, id: nextId }

        transaction.set(firestore.collection('issues').doc(String(nextId)), newIssue)
        transaction.set(countersRef, { nextIssueId: nextId + 1 }, { merge: true })

        return newIssue
      })
      return issue
    } catch (err) {
      console.warn('Firestore addIssue failed, falling back to local DB:', err.message)
    }
  }

  const db = readLocalDB()
  const newIssue = { ...issueData, id: db._nextId++ }
  db.issues.push(newIssue)
  await writeLocalDB(db)
  return newIssue
}

async function updateIssue(id, updater) {
  const issueId = parseInt(id, 10)

  if (USE_FIRESTORE && firestore) {
    try {
      const issueRef = firestore.collection('issues').doc(String(issueId))
      return await firestore.runTransaction(async transaction => {
        const issueDoc = await transaction.get(issueRef)
        if (!issueDoc.exists) return null

        const updated = updater(issueDoc.data())
        transaction.set(issueRef, updated)
        return updated
      })
    } catch (err) {
      console.warn('Firestore updateIssue failed, falling back to local DB:', err.message)
    }
  }

  const db = readLocalDB()
  const idx = db.issues.findIndex(issue => issue.id === issueId)
  if (idx === -1) return null

  db.issues[idx] = updater({ ...db.issues[idx] })
  await writeLocalDB(db)
  return db.issues[idx]
}

async function getComments(issueId) {
  const parsedIssueId = parseInt(issueId, 10)
  if (USE_FIRESTORE && firestore) {
    try {
      const snapshot = await firestore.collection('comments')
        .where('issue_id', '==', parsedIssueId)
        .get()

      return snapshot.docs
        .map(doc => doc.data())
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    } catch (err) {
      console.warn('Firestore getComments failed, falling back to local DB:', err.message)
    }
  }

  return readLocalDB().comments
    .filter(comment => comment.issue_id === parsedIssueId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
}

async function addComment(comment) {
  if (USE_FIRESTORE && firestore) {
    try {
      await firestore.collection('comments').doc(String(comment.id)).set(comment)
      return comment
    } catch (err) {
      console.warn('Firestore addComment failed, falling back to local DB:', err.message)
    }
  }

  const db = readLocalDB()
  db.comments.push(comment)
  await writeLocalDB(db)
  return comment
}

async function setVote(issueId, voterSession, voteType) {
  const parsedIssueId = parseInt(issueId, 10)
  const session = voterSession || 'anon'

  if (USE_FIRESTORE && firestore) {
    try {
      const voteId = `${parsedIssueId}_${Buffer.from(session).toString('base64url')}`
      const voteRef = firestore.collection('votes').doc(voteId)
      const issueRef = firestore.collection('issues').doc(String(parsedIssueId))

      const transactionResult = await firestore.runTransaction(async transaction => {
        const issueDoc = await transaction.get(issueRef)
        if (!issueDoc.exists) return null

        transaction.set(voteRef, {
          issue_id: parsedIssueId,
          voter_session: session,
          vote_type: voteType,
          updated_at: new Date().toISOString(),
        })

        return true
      })

      if (transactionResult) {
        const votesSnapshot = await firestore.collection('votes')
          .where('issue_id', '==', parsedIssueId)
          .get()

        const votes = votesSnapshot.docs.map(doc => doc.data())
        const upvotes = votes.filter(vote => vote.vote_type === 'up').length
        const downvotes = votes.filter(vote => vote.vote_type === 'down').length

        const issue = await updateIssue(parsedIssueId, currentIssue => ({
          ...currentIssue,
          upvotes,
          downvotes,
          verified_count: upvotes,
          status: upvotes >= 5 && currentIssue.status === 'pending' ? 'verified' : currentIssue.status,
          updated_at: new Date().toISOString(),
        }))

        return { issue, upvotes, downvotes }
      }
    } catch (err) {
      console.warn('Firestore setVote failed, falling back to local DB:', err.message)
    }
  }

  const db = readLocalDB()
  db.votes = db.votes.filter(vote => !(vote.issue_id === parsedIssueId && vote.voter_session === session))
  db.votes.push({ issue_id: parsedIssueId, voter_session: session, vote_type: voteType })

  const upvotes = db.votes.filter(vote => vote.issue_id === parsedIssueId && vote.vote_type === 'up').length
  const downvotes = db.votes.filter(vote => vote.issue_id === parsedIssueId && vote.vote_type === 'down').length
  const idx = db.issues.findIndex(issue => issue.id === parsedIssueId)

  if (idx === -1) return null

  db.issues[idx].upvotes = upvotes
  db.issues[idx].downvotes = downvotes
  db.issues[idx].verified_count = upvotes
  if (upvotes >= 5 && db.issues[idx].status === 'pending') db.issues[idx].status = 'verified'

  await writeLocalDB(db)
  return { issue: db.issues[idx], upvotes, downvotes }
}

async function uploadIssueImage(buffer, mimeType) {
  if (USE_FIRESTORE && bucket) {
    try {
      const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'bin'
      const fileName = `issues/${Date.now()}-${crypto.randomUUID()}.${ext}`
      const file = bucket.file(fileName)

      await file.save(buffer, {
        resumable: false,
        metadata: {
          contentType: mimeType,
          cacheControl: 'public, max-age=31536000',
        },
      })

      return `/api/issues/images/${encodeURIComponent(fileName)}`
    } catch (err) {
      console.warn('Cloud Storage upload failed, falling back to base64 inline image:', err.message)
    }
  }

  return `data:${mimeType};base64,${buffer.toString('base64')}`
}

async function streamImage(fileName, res) {
  if (!USE_FIRESTORE || !bucket) return res.status(404).json({ error: 'Image storage not configured' })

  try {
    const decodedName = decodeURIComponent(fileName)
    const file = bucket.file(decodedName)
    const [exists] = await file.exists()

    if (!exists) return res.status(404).json({ error: 'Image not found' })

    const [metadata] = await file.getMetadata()
    res.setHeader('Content-Type', metadata.contentType || 'application/octet-stream')
    res.setHeader('Cache-Control', metadata.cacheControl || 'public, max-age=31536000')

    return file.createReadStream()
      .on('error', err => {
        console.error('Image stream error:', err)
        if (!res.headersSent) res.status(500).json({ error: 'Failed to load image' })
      })
      .pipe(res)
  } catch (err) {
    console.error('Stream image error:', err.message)
    if (!res.headersSent) res.status(500).json({ error: 'Failed to stream image' })
  }
}

async function initDB() {
  if (USE_FIRESTORE) {
    try {
      initFirebase()
      const countersRef = firestore.collection('meta').doc('counters')
      const countersDoc = await countersRef.get()
      if (!countersDoc.exists) await countersRef.set({ nextIssueId: 1 })
      console.log('✅ Firebase Firestore initialized successfully')
      return
    } catch (err) {
      console.warn('⚠️ Firebase Firestore initialization failed, falling back to local JSON database:', err.message)
      USE_FIRESTORE = false
    }
  }

  try {
    readLocalDB()
    console.log('✅ Local JSON database initialized')
  } catch (err) {
    console.warn('Local database initialization warning:', err.message)
  }
}

module.exports = {
  initDB,
  getIssues,
  getIssue,
  addIssue,
  updateIssue,
  getComments,
  addComment,
  setVote,
  uploadIssueImage,
  streamImage,
}
