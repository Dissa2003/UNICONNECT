// socket/voiceHandler.js
// Modular Socket.IO handler for WebRTC P2P voice signaling lah
// This module is plugged into the Express server — just call registerVoiceHandler(io) lor
//
// ── How P2P works between two different laptops sia ──────────────────────────
//
//  Laptop A (Host)               Our Server (Relay)           Laptop B (Participant)
//       │                               │                               │
//       │── voice-room:join ──────────► │                               │
//       │                               │ ◄── voice-room:join ──────────│
//       │                               │                               │
//       │                               │── voice-peer-ready ──────────►│
//       │◄─ voice-peer-ready ───────────│                               │
//       │                               │                               │
//       │  (Host creates Peer as initiator=true, generates SDP offer)   │
//       │── voice-room:signal (offer) ─►│── voice-room:signal ─────────►│
//       │                               │                               │
//       │  (Participant answers the offer, generates SDP answer)        │
//       │◄─ voice-room:signal (answer) ─│◄── voice-room:signal ─────────│
//       │                               │                               │
//       │  (ICE candidates flow both ways lor — helps find best path)   │
//       │◄──────────────── voice-room:signal (ICE) ────────────────────►│
//       │                               │                               │
//       │  ─────── Direct P2P audio stream established lah! ─────────── │
//       │◄═══════════════ audio data (goes directly) ═══════════════════►│
//
// Key point: our server only relays SDP and ICE candidates lor
// The actual audio bytes NEVER touch our server — goes directly between laptops sia!
// That's the whole point of WebRTC — server just does the introduction lah
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const jwt = require('jsonwebtoken');
const VoiceRoom = require('../models/VoiceRoom');

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';

function registerVoiceHandler(io) {
  // ── Socket.IO auth middleware — verify JWT before allowing any voice events ──
  // Same token that the main backend issues lah — must match same secret lor
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token lah — cannot connect without JWT'));
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      socket.userEmail = decoded.email || '';
      next();
    } catch {
      next(new Error('Invalid JWT token lor — please login again'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🎙️  Voice socket connected: ${socket.userId}`);

    // ── voice-room:join ───────────────────────────────────────────────────────
    // Both users must emit this with the same roomId to join the signaling room
    // Once both are in, the host (initiator) starts the WebRTC offer process lor
    socket.on('voice-room:join', async ({ roomId }) => {
      if (!roomId) return;

      // Validate the room exists and this user belongs to it — security check sia
      try {
        const room = await VoiceRoom.findOne({ roomId });
        if (!room) {
          socket.emit('voice-room:error', { message: 'Room not found lah' });
          return;
        }

        const isParticipant =
          room.hostId === socket.userId || room.participantId === socket.userId;
        if (!isParticipant) {
          socket.emit('voice-room:error', { message: 'Not your room lah — cannot join' });
          return;
        }
      } catch (err) {
        console.error('voice-room:join DB check error lah:', err.message);
        // Don't block the call if DB check times out — best effort validation lor
      }

      socket.join(`voice:${roomId}`);
      console.log(`🔊  ${socket.userId} joined voice:${roomId}`);

      // Tell the OTHER peer in this socket room that someone new arrived
      // The receiver will use this signal to create their Peer (non-initiator side) lah
      socket.to(`voice:${roomId}`).emit('voice-peer-ready', {
        peerId: socket.userId,
        roomId,
      });
    });

    // ── voice-room:signal ─────────────────────────────────────────────────────
    // Relay WebRTC signaling data between the two peers lor
    // signalData can be: SDP offer, SDP answer, or ICE candidate — we don't care which sia
    // simple-peer on the frontend handles all the SDP negotiation automatically lah
    socket.on('voice-room:signal', ({ roomId, signalData }) => {
      if (!roomId || !signalData) return;

      // Just forward to the other person in the room — that's all we do lor
      // Server NEVER inspects or modifies signalData — pure relay only lah
      socket.to(`voice:${roomId}`).emit('voice-room:signal', {
        from: socket.userId,
        signalData,
      });
    });

    // ── voice-room:end ────────────────────────────────────────────────────────
    // One user clicked End Call — notify the other peer and clean up DB lor
    socket.on('voice-room:end', async ({ roomId }) => {
      if (!roomId) return;

      console.log(`📵  ${socket.userId} ended call in room: ${roomId}`);

      // Tell the other peer to tear down their WebRTC connection lah
      socket.to(`voice:${roomId}`).emit('voice-room:ended', {
        by: socket.userId,
        roomId,
      });

      // Update room status to 'ended' in DB — clean up lor
      try {
        await VoiceRoom.findOneAndUpdate(
          { roomId },
          { $set: { status: 'ended' } }
        );
      } catch (err) {
        console.warn('Could not update room status to ended lah:', err.message);
      }

      // Leave the socket room — no more signals after this sia
      socket.leave(`voice:${roomId}`);
    });

    // ── Clean up when socket disconnects unexpectedly ──────────────────────────
    socket.on('disconnect', () => {
      console.log(`🎙️  Voice socket disconnected: ${socket.userId}`);
      // Note: Socket.IO auto-removes the socket from all rooms on disconnect lor
      // We don't force end the DB room here — other peer might reconnect lah
    });
  });
}

module.exports = registerVoiceHandler;
