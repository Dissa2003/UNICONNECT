// server.local.js
// Local development server for voice-room-service lah
// Runs BOTH the REST API and Socket.IO signaling on the same port (3002)
// Run with: npm run local
//
// NOTE about HTTPS and mic access hor:
//   - localhost is an exception — browsers allow getUserMedia() on http://localhost lah
//   - For production (two different laptops), MUST use HTTPS lor
//     → REST API on Vercel: HTTPS provided automatically sia
//     → Socket.IO signaling: Deploy on Railway/Render (they give HTTPS too lah)
//     → OR run this server behind Nginx with a Let's Encrypt cert
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./lib/mongodb');
const voiceSyncHandler = require('./api/voiceSync');
const registerVoiceHandler = require('./socket/voiceHandler');

const app = express();
const server = http.createServer(app);

// Allow all origins for local dev — tighten this in production lor
app.use(cors());
app.use(express.json());

// ── REST endpoints — same as what Vercel would serve lah ────────────────────────
// voiceSync handles POST (create), GET (fetch by chatId), PATCH (update status) lor
app.all('/api/voiceSync', voiceSyncHandler);

// Health check — quick ping to confirm the service is alive sia
app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'voice-room-service',
    env: 'local',
    endpoints: {
      rest: 'POST/GET/PATCH http://localhost:3002/api/voiceSync',
      socket: 'ws://localhost:3002  (events: voice-room:join, voice-room:signal, voice-room:end)',
    },
  });
});

// ── Socket.IO — WebRTC signaling relay lor ────────────────────────────────────
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Register all voice signaling events (modular — just call the function lah)
registerVoiceHandler(io);

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3002;
server.listen(PORT, async () => {
  try {
    await connectDB();
    console.log(`\n🎙️  Voice Room Service running lor → http://localhost:${PORT}`);
    console.log(`   REST  : POST/GET/PATCH http://localhost:${PORT}/api/voiceSync`);
    console.log(`   Socket: ws://localhost:${PORT}  (WebRTC signaling relay)`);
    console.log('\n   Ready to test locally lah! Open two browser tabs sia.\n');
  } catch (err) {
    console.error('Failed to connect MongoDB lah:', err.message);
    process.exit(1);
  }
});
