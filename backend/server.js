require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const net = require('net');
const { Server } = require('socket.io');
const { initDB } = require('./db/init');

const issueRoutes = require('./routes/issues');
const analyzeRoutes = require('./routes/analyze');

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const LOCALHOST_ORIGIN = /^http:\/\/localhost(:\d+)?$/

const io = new Server(server, {
  cors: {
    origin: [FRONTEND_URL, LOCALHOST_ORIGIN],
    methods: ['GET', 'POST']
  }
});

app.use(cors({
  origin: [FRONTEND_URL, LOCALHOST_ORIGIN],
  methods: ['GET', 'POST', 'PATCH'],
  credentials: true
}));

app.use(express.json({ limit: '20mb' }));
app.set('io', io);

// Routes
app.use('/api/issues', issueRoutes);
app.use('/api/analyze', analyzeRoutes);

// Health check — used by deployment platforms
app.get('/health', (req, res) => res.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  uptime: Math.floor(process.uptime()),
}));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

const START_PORT = parseInt(process.env.PORT, 10) || 5000
const MAX_PORT = START_PORT + 10

function checkPort(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
    tester.once('error', () => resolve(false))
    tester.once('listening', () => tester.close(() => resolve(true)))
    tester.listen({ port, host: '127.0.0.1' })
  })
}

async function getAvailablePort(startPort, maxPort) {
  for (let port = startPort; port <= maxPort; port += 1) {
    // eslint-disable-next-line no-await-in-loop
    if (await checkPort(port)) return port
    console.warn(`Port ${port} is in use, trying the next one...`)
  }
  throw new Error(`No available ports between ${startPort} and ${maxPort}`)
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('Port is already in use. Stop the process using it or set a different PORT before restarting.')
  } else {
    console.error('Server error:', err)
  }
  process.exit(1)
})

async function startServer() {
  const PORT = await getAvailablePort(START_PORT, MAX_PORT)

  initDB().then(() => {
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`🚀 Community Hero backend running on port ${PORT}`)
      console.log(`🌍 Frontend URL: ${FRONTEND_URL}`)
      console.log(`🤖 Gemini API: ${process.env.GEMINI_API_KEY ? '✅ configured' : '❌ MISSING'}`)
    })
  }).catch(err => {
    console.error('Failed to initialize:', err)
    process.exit(1)
  })
}

startServer().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
