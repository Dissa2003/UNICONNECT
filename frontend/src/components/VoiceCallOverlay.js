import React, { useEffect, useRef, useState, useCallback } from 'react';
import Peer from 'simple-peer';
import { io } from 'socket.io-client';
import api from '../services/api';

const SOCKET_URL = 'http://localhost:5000';

// Free Google STUN servers — these help the two peers discover each other's
// public IP so they can connect directly lor (no TURN server needed for most cases)
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// VoiceCallOverlay — full-screen overlay that handles mic access + WebRTC peer connection
// Props:
//   room      — the AudioRoom object from the backend (has roomId, hostId, participantId)
//   currentUserId — logged-in user's _id from JWT
//   onClose   — called when the call ends (either side) so parent can hide this overlay lor

export default function VoiceCallOverlay({ room, currentUserId, onClose }) {
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);

  const [muted, setMuted] = useState(false);
  const [status, setStatus] = useState('Connecting...');
  // speaking state drives the pulse animation — true if local audio level is active sia
  const [speaking, setSpeaking] = useState(false);
  const [remoteSpeaking, setRemoteSpeaking] = useState(false);

  // Detect audio activity via AnalyserNode — gives a visual pulse when talking lor
  const startAudioMeter = useCallback((stream, onActivity) => {
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      let frameId;
      const check = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        onActivity(avg > 15); // threshold — above 15 means someone is talking lah
        frameId = requestAnimationFrame(check);
      };
      check();

      // Return cleanup function lor
      return () => {
        cancelAnimationFrame(frameId);
        ctx.close();
      };
    } catch {
      return () => {};
    }
  }, []);

  // ── Main call setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!room?.roomId) return;

    let cleanupMeter = () => {};
    let cleanupRemoteMeter = () => {};

    // Determine if this user is the host or the joining peer lah
    // Host = initiator in WebRTC terms — they send the offer first lor
    const isInitiator = String(room.hostId?._id || room.hostId) === String(currentUserId);

    const token = localStorage.getItem('token');

    // Step 1: Connect socket with JWT auth (same approach as StudyRoom.js) sia
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    let peer = null;

    const setupPeer = async () => {
      try {
        // Step 2: Get microphone access — user will see browser permission prompt lor
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;

        // Start monitoring local mic activity for pulse animation sia
        cleanupMeter = startAudioMeter(stream, setSpeaking);

        // Step 3: Tell the backend/socket that we joined this voice room lah
        socket.emit('join-voice-room', { roomId: room.roomId });

        // Step 4: Create WebRTC peer connection
        // Non-initiator creates peer immediately so it's ready to receive the offer.
        // Host (initiator) waits until it gets 'voice-peer-joined' confirming the
        // other side is listening — this prevents the offer from firing into the void.
        const createPeer = (initiator) => {
          const p = new Peer({
            initiator,
            trickle: true,   // send ICE candidates as they come — faster connection lor
            stream,
            config: { iceServers: ICE_SERVERS },
          });

          // simple-peer fires 'signal' whenever it has data to send to the other peer
          // We just relay it through the socket — backend doesn't look inside this sia
          p.on('signal', (signalData) => {
            socket.emit('signal-data', { roomId: room.roomId, signalData });
          });

          p.on('connect', () => {
            setStatus('Connected 🎙️');
            // Mark room as active in the DB now that both peers are in lor
            api.patch('/audio/status', { roomId: room.roomId, status: 'active' }).catch(() => {});
          });

          // When we get the remote audio stream, plug it into an Audio element
          p.on('stream', (remoteStream) => {
            const audio = document.createElement('audio');
            audio.srcObject = remoteStream;
            audio.autoplay = true;
            audio.playsInline = true;
            document.body.appendChild(audio);
            // Explicit play() call handles browsers that block autoplay
            audio.play().catch(() => {});

            // Monitor remote audio level for their pulse indicator
            cleanupRemoteMeter = startAudioMeter(remoteStream, setRemoteSpeaking);

            // Clean up audio element when component unmounts
            p.on('close', () => {
              audio.pause();
              audio.srcObject = null;
              if (document.body.contains(audio)) document.body.removeChild(audio);
            });
          });

          p.on('error', (err) => {
            console.warn('Peer error lah:', err.message);
            setStatus('Connection error lor');
          });

          peerRef.current = p;
          return p;
        };

        if (isInitiator) {
          // Host waits — do NOT create peer yet.
          // The offer must only fire after the non-initiator is in the room and listening.
          setStatus('Waiting for other person...');
        } else {
          // Non-initiator creates peer immediately so it's ready to receive the offer.
          peer = createPeer(false);
          setStatus('Joining call...');
        }

        // voice-peer-joined fires on the HOST when the non-initiator joins the room.
        // This is the correct moment for the host to create its peer and send the offer.
        socket.on('voice-peer-joined', ({ roomId }) => {
          if (roomId !== room.roomId) return;
          if (isInitiator && (!peerRef.current || peerRef.current.destroyed)) {
            // Non-initiator is now listening — safe to generate and send the offer
            peer = createPeer(true);
          }
          setStatus('Other person joined, establishing...');
        });

        // ── Relay incoming signal data to the local peer ──
        // simple-peer needs to receive offer/answer/ICE candidates from the other side lor
        socket.on('signal-data', ({ signalData }) => {
          if (peerRef.current && !peerRef.current.destroyed) {
            peerRef.current.signal(signalData);
          }
        });

        // ── Other peer ended the call ──
        socket.on('call-ended', ({ roomId }) => {
          if (roomId !== room.roomId) return;
          setStatus('Call ended lah');
          // Short delay so user can see the status before overlay closes lor
          setTimeout(() => handleEndCall(false), 1500);
        });

      } catch (err) {
        if (err.name === 'NotAllowedError') {
          setStatus('Microphone access denied lah');
        } else {
          setStatus('Failed to access microphone lor');
        }
        console.error('getUserMedia error:', err.message);
      }
    };

    setupPeer();

    // ── Cleanup when overlay unmounts ───────────────────────────────────────
    return () => {
      cleanupMeter();
      cleanupRemoteMeter();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (peerRef.current) {
        peerRef.current.destroy();
      }
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.roomId]);

  // ── End call handler ─────────────────────────────────────────────────────────
  const handleEndCall = useCallback(async (emitToSocket = true) => {
    // Tell the other peer to disconnect via socket lor
    if (emitToSocket && socketRef.current) {
      socketRef.current.emit('end-call', { roomId: room.roomId });
    }

    // Update room status in DB to 'ended' sia
    try {
      await api.patch('/audio/status', { roomId: room.roomId, status: 'ended' });
    } catch { /* ignore lah */ }

    // Stop mic tracks — free the hardware lor
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (peerRef.current) {
      peerRef.current.destroy();
    }

    onClose && onClose();
  }, [room?.roomId, onClose]);

  // ── Mute / Unmute ───────────────────────────────────────────────────────────
  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (!audioTrack) return;
    audioTrack.enabled = !audioTrack.enabled;
    setMuted(!audioTrack.enabled);
    if (!audioTrack.enabled) setSpeaking(false); // no pulse when muted lor
  };

  return (
    <div style={overlayStyles.backdrop}>
      <div style={overlayStyles.card}>
        {/* Title */}
        <h2 style={overlayStyles.title}>Voice Call</h2>
        <p style={overlayStyles.status}>{status}</p>

        {/* ── Avatars with pulse rings ── */}
        <div style={overlayStyles.avatarRow}>
          <AvatarPulse label="You" active={speaking && !muted} />
          <span style={overlayStyles.waveSep}>〜〜〜</span>
          <AvatarPulse label="Them" active={remoteSpeaking} />
        </div>

        {/* ── Controls ── */}
        <div style={overlayStyles.controls}>
          <button
            style={{
              ...overlayStyles.controlBtn,
              background: muted ? 'rgba(255,80,80,0.2)' : 'rgba(255,255,255,0.08)',
              border: muted ? '1px solid #f66' : '1px solid rgba(255,255,255,0.2)',
            }}
            onClick={toggleMute}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? '🔇' : '🎤'}
            <span style={overlayStyles.btnLabel}>{muted ? 'Unmute' : 'Mute'}</span>
          </button>

          <button
            style={{ ...overlayStyles.controlBtn, ...overlayStyles.endBtn }}
            onClick={() => handleEndCall(true)}
            title="End Call"
          >
            📵
            <span style={overlayStyles.btnLabel}>End Call</span>
          </button>
        </div>
      </div>

      {/* CSS pulse keyframes injected inline — no separate CSS file needed lor */}
      <style>{`
        @keyframes voicePulse {
          0%   { box-shadow: 0 0 0 0 rgba(26,107,255,0.6); }
          70%  { box-shadow: 0 0 0 18px rgba(26,107,255,0); }
          100% { box-shadow: 0 0 0 0 rgba(26,107,255,0); }
        }
        .voice-pulse-active {
          animation: voicePulse 1s infinite;
        }
        @keyframes pulse {
          0%   { box-shadow: 0 0 0 0 rgba(229,57,53,0.7); }
          70%  { box-shadow: 0 0 0 10px rgba(229,57,53,0); }
          100% { box-shadow: 0 0 0 0 rgba(229,57,53,0); }
        }
      `}</style>
    </div>
  );
}

// ── Sub-component: Avatar with speaking pulse ring ────────────────────────────
function AvatarPulse({ label, active }) {
  return (
    <div style={overlayStyles.avatarWrap}>
      <div
        className={active ? 'voice-pulse-active' : ''}
        style={{
          ...overlayStyles.avatar,
          border: active
            ? '2px solid #1a6bff'
            : '2px solid rgba(255,255,255,0.2)',
        }}
      >
        🧑
      </div>
      <span style={overlayStyles.avatarLabel}>{label}</span>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const overlayStyles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(6px)',
  },
  card: {
    background: '#0b1929',
    borderRadius: 20,
    padding: '36px 40px',
    width: 380,
    textAlign: 'center',
    boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
    border: '1px solid rgba(26,107,255,0.25)',
  },
  title: { color: '#fff', margin: '0 0 4px', fontSize: 22 },
  status: { color: '#7aadff', fontSize: 14, margin: '0 0 28px' },
  avatarRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  avatarWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: 'rgba(26,107,255,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 32,
    transition: 'border 0.2s',
  },
  avatarLabel: { color: '#aaa', fontSize: 13 },
  waveSep: { color: 'rgba(255,255,255,0.3)', fontSize: 20, letterSpacing: 2 },
  controls: { display: 'flex', justifyContent: 'center', gap: 16 },
  controlBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '12px 20px',
    borderRadius: 12,
    cursor: 'pointer',
    fontSize: 24,
    minWidth: 80,
    transition: 'all 0.15s',
  },
  endBtn: {
    background: 'rgba(229,57,53,0.15)',
    border: '1px solid #e53935',
  },
  btnLabel: { fontSize: 11, color: '#ccc' },
};
