// hooks/useVoiceChat.js
// Custom React hook that manages the FULL WebRTC voice call lifecycle lor
// Handles: mic permissions, Peer setup, audio stream, socket signaling, cleanup
//
// Usage:
//   const voice = useVoiceChat({ room, currentUserId, enabled, onCallEnd });
//   voice.muted / voice.toggleMute() / voice.endCall() / voice.status
//   voice.speaking (local) / voice.remoteSpeaking — drive the pulse UI lah
//
// "enabled" controls when the hook actually connects — set to true when user
// clicks Join Call, false when overlay is hidden lor
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState, useCallback } from 'react';
import Peer from 'simple-peer';
import { io } from 'socket.io-client';

// Voice service URL — REST API (Vercel): https://your-voice-service.vercel.app
// Production socket: same URL as main backend (Socket.IO on Express lah)
const VOICE_SOCKET_URL =
  process.env.REACT_APP_VOICE_SOCKET_URL || 'http://localhost:5000';

// Google's FREE STUN servers — help the two laptops find each other's public IP lor
// STUN stands for Session Traversal Utilities for NAT sia
// Without this, two laptops on different networks cannot connect directly lah!
// Flow: Laptop A asks Google STUN "what is my public IP?" → gets back IP:port
//       Then shares that IP:port with Laptop B via our signaling server lor
//       Laptop B does the same → now both know each other's public address sia
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export default function useVoiceChat({ room, currentUserId, enabled, onCallEnd }) {
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null); // <audio> element for remote stream lah

  const [status, setStatus] = useState('idle');         // idle | requesting-mic | waiting | connecting | connected | error
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);        // local user speaking?
  const [remoteSpeaking, setRemoteSpeaking] = useState(false); // other person speaking?

  // ── Audio level meter — drives the pulse animation lor ───────────────────────
  // AnalyserNode reads the mic/speaker frequency data every animation frame
  // If average level > 12, we consider that person as "speaking" lah
  const startAudioMeter = useCallback((stream, onActivity) => {
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);

      let frameId;
      const tick = () => {
        analyser.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        onActivity(avg > 12);
        frameId = requestAnimationFrame(tick);
      };
      tick();

      return () => {
        cancelAnimationFrame(frameId);
        ctx.close().catch(() => {});
      };
    } catch {
      return () => {};
    }
  }, []);

  // ── Main effect: connect socket + set up WebRTC when enabled ─────────────────
  useEffect(() => {
    // Don't do anything until user clicks Join and enabled=true lor
    if (!enabled || !room?.roomId) return;

    let stopLocalMeter = () => {};
    let stopRemoteMeter = () => {};

    // Is this user the host? Host is the WebRTC initiator — they send the offer lah
    // Initiator means: "I will create the SDP offer and start the handshake"
    const isInitiator =
      String(room.hostId?._id || room.hostId) === String(currentUserId);

    const token = localStorage.getItem('token');

    // Step 1: Connect to the voice-room-service socket — separate from main chat socket lor
    const socket = io(VOICE_SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    let peer = null;

    const boot = async () => {
      // Step 2: Ask browser for mic access — user sees permission prompt lah
      // Note: getUserMedia ONLY works on localhost or HTTPS — cannot work on plain HTTP sia
      setStatus('requesting-mic');
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
      } catch (err) {
        if (err.name === 'NotAllowedError') {
          setStatus('error');
          console.error('Mic permission denied lah');
        } else {
          setStatus('error');
          console.error('getUserMedia failed lor:', err.message);
        }
        return;
      }

      // Start monitoring local mic level for pulse animation lor
      stopLocalMeter = startAudioMeter(stream, setSpeaking);

      // Step 3: Announce ourselves to the voice socket room
      socket.emit('voice-room:join', { roomId: room.roomId });
      setStatus(isInitiator ? 'waiting' : 'connecting');

      // ── Factory: create a simple-peer instance ────────────────────────────
      // initiator=true → creates SDP offer (host does this)
      // initiator=false → waits for offer, then creates answer (participant does this)
      const createPeer = (initiator) => {
        const p = new Peer({
          initiator,
          trickle: true,  // Trickle ICE = send candidates as they arrive — faster lah
          stream,
          config: { iceServers: ICE_SERVERS },
        });

        // simple-peer fires 'signal' each time it has data to send to the other side lor
        // Could be SDP offer, SDP answer, or ICE candidate — we relay them all via socket
        p.on('signal', (signalData) => {
          socket.emit('voice-room:signal', { roomId: room.roomId, signalData });
        });

        // Both peers connected — WebRTC handshake done lah! Audio should flow now
        p.on('connect', () => {
          setStatus('connected');
          console.log('WebRTC P2P connected lah — audio flowing directly between laptops!');
        });

        // Remote audio stream arrived — plug it into an <audio> element lor
        // This is the other person's voice sia
        p.on('stream', (remoteStream) => {
          if (!remoteAudioRef.current) {
            const audio = document.createElement('audio');
            audio.autoplay = true;
            audio.playsInline = true;
            document.body.appendChild(audio);
            remoteAudioRef.current = audio;
          }
          remoteAudioRef.current.srcObject = remoteStream;

          // Monitor remote audio for their speaking pulse indicator lah
          stopRemoteMeter = startAudioMeter(remoteStream, setRemoteSpeaking);
        });

        p.on('error', (err) => {
          console.warn('WebRTC peer error lah:', err.message);
          setStatus('error');
        });

        p.on('close', () => {
          setStatus('idle');
        });

        peerRef.current = p;
        return p;
      };

      // Host creates peer immediately as initiator — starts the offer process lah
      if (isInitiator) {
        setStatus('waiting');
        peer = createPeer(true);
      }

      // ── Incoming socket events ─────────────────────────────────────────────

      // Other person joined — if we're the non-initiator, create our peer now lor
      socket.on('voice-peer-ready', ({ roomId }) => {
        if (roomId !== room.roomId) return;
        setStatus('connecting');
        if (!isInitiator) {
          peer = createPeer(false);
        }
      });

      // Relay incoming signal to the local peer — simple-peer handles it internally lah
      // signal() feeds the offer/answer/ICE into the peer and it responds automatically lor
      socket.on('voice-room:signal', ({ signalData }) => {
        if (peerRef.current && !peerRef.current.destroyed) {
          peerRef.current.signal(signalData);
        }
      });

      // Other person ended the call — clean up our side lah
      socket.on('voice-room:ended', ({ roomId }) => {
        if (roomId !== room.roomId) return;
        setStatus('idle');
        cleanup(false);
        onCallEnd && onCallEnd();
      });
    };

    boot();

    // ── Cleanup function lor ───────────────────────────────────────────────────
    const cleanup = (emitEnd = true) => {
      stopLocalMeter();
      stopRemoteMeter();

      if (emitEnd && socketRef.current) {
        socketRef.current.emit('voice-room:end', { roomId: room.roomId });
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }

      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }

      if (remoteAudioRef.current) {
        remoteAudioRef.current.pause();
        remoteAudioRef.current.srcObject = null;
        if (remoteAudioRef.current.parentNode) {
          document.body.removeChild(remoteAudioRef.current);
        }
        remoteAudioRef.current = null;
      }

      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      setSpeaking(false);
      setRemoteSpeaking(false);
    };

    // React cleanup: runs when component unmounts or enabled flips to false lor
    return () => cleanup(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, room?.roomId]);

  // ── Mute / Unmute — flips the audio track enabled flag, NOT a disconnect lah ──
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const track = localStreamRef.current.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    const nowMuted = !track.enabled;
    setMuted(nowMuted);
    if (nowMuted) setSpeaking(false); // No pulse when muted lor
  }, []);

  // ── End call — triggered by user clicking the End button lah ─────────────────
  const endCall = useCallback(async () => {
    if (socketRef.current) {
      socketRef.current.emit('voice-room:end', { roomId: room?.roomId });
    }
    // Update status in voice-room-service REST API lor
    const VOICE_REST_URL =
      process.env.REACT_APP_VOICE_SERVICE_URL || 'http://localhost:3002';
    try {
      await fetch(`${VOICE_REST_URL}/api/voiceSync`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room?.roomId, status: 'ended' }),
      });
    } catch { /* best effort lah */ }

    onCallEnd && onCallEnd();
  }, [room?.roomId, onCallEnd]);

  return { status, muted, speaking, remoteSpeaking, toggleMute, endCall };
}
