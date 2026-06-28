require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { initDB } = require('./db/init');

const issueRoutes = require('./routes/issues');
const analyzeRoutes = require('./routes/analyze');

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const LOCALHOST_ORIGIN = /^http:\/\/localhost(:\d+)?$/
const allowedOrigins = IS_PRODUCTION && !process.env.FRONTEND_URL
  ? true
  : [FRONTEND_URL, LOCALHOST_ORIGIN]

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

app.use(cors({
  origin: allowedOrigins,
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

if (IS_PRODUCTION) {
  const frontendDist = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

const PORT = parseInt(process.env.PORT, 10) || 5000
const HOST = process.env.HOST || '0.0.0.0'

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('Port is already in use. Stop the process using it or set a different PORT before restarting.')
  } else {
    console.error('Server error:', err)
  }
  process.exit(1)
})

async function startServer() {
  initDB().then(() => {
    server.listen(PORT, HOST, () => {
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
