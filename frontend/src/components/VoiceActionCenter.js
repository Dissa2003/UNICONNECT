// components/VoiceActionCenter.js
// Pluggable voice call bar for any chat window lah
//
// Renders three stages:
//   1. IDLE     — "Start / Schedule" button
//   2. PRE-CALL — pulsing "🟢 Join Call" when time has come lor
//   3. IN-CALL  — full overlay with mute, end-call, speaking visualisers sia
//
// Props:
//   chatId          — StudyGroup _id linking voice room to this chat
//   members         — array of { user: { _id, name, email } } from the group
//   currentUserId   — logged-in user's _id
//   currentUserEmail— logged-in user's email (for reminder emails lor)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback, useRef } from 'react';
import useVoiceChat from '../hooks/useVoiceChat';
import api from '../services/api';

export default function VoiceActionCenter({
  chatId,
  members = [],
  currentUserId,
}) {
  const [room, setRoom]           = useState(null);
  const [inCall, setInCall]       = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [now, setNow]             = useState(new Date());

  // Modal form state
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [startMode, setStartMode] = useState('now'); // 'now' | 'schedule'
  const [pickedTime, setPickedTime] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [modalError, setModalError] = useState('');

  const pollRef = useRef(null);

  // Clock tick — drives Join button visibility lah
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);

  // Fetch any active/scheduled room for this chat from the main backend
  const fetchRoom = useCallback(async () => {
    if (!chatId) return;
    try {
      const { data } = await api.get(`/audio/active/${chatId}`);
      setRoom(data.room ?? null);
    } catch {
      setRoom(null);
    }
  }, [chatId]);

  useEffect(() => {
    fetchRoom();
    pollRef.current = setInterval(fetchRoom, 15_000);
    return () => clearInterval(pollRef.current);
  }, [fetchRoom]);

  // WebRTC hook — connects only when user is actively in the call lah
  const { status, muted, speaking, remoteSpeaking, toggleMute, endCall } =
    useVoiceChat({
      room,
      currentUserId,
      enabled: inCall,
      onCallEnd: () => {
        setInCall(false);
        setTimeout(fetchRoom, 600);
      },
    });

  // Other members excluding current user lor
  const otherMembers = members.filter(
    (m) => String(m.user?._id || m.user) !== String(currentUserId)
  );

  // Resolve selected member object
  const selectedMember = otherMembers.find(
    (m) => String(m.user?._id || m.user) === selectedMemberId
  );

  // Create/Start a room handler
  const handleConfirm = async () => {
    setModalError('');

    if (!selectedMemberId) {
      setModalError('Select who to call lah');
      return;
    }

    let scheduledTime;
    if (startMode === 'now') {
      scheduledTime = new Date().toISOString();
    } else {
      if (!pickedTime) { setModalError('Pick a date and time lor'); return; }
      const chosen = new Date(pickedTime);
      if (isNaN(chosen.getTime()) || chosen <= new Date()) {
        setModalError('Must pick a future time lah');
        return;
      }
      scheduledTime = chosen.toISOString();
    }

    setScheduling(true);
    try {
      const participantId = String(selectedMember?.user?._id || selectedMember?.user || selectedMemberId);
      const { data } = await api.post('/audio/schedule', {
        chatId,
        participantId,
        scheduledTime,
      });

      setRoom(data.room);
      setShowModal(false);
      setPickedTime('');
      setSelectedMemberId('');
      setStartMode('now');

      // Immediate mode — jump straight into the call
      if (startMode === 'now') setInCall(true);
    } catch (err) {
      setModalError(err.response?.data?.message || 'Something went wrong, please try again');
    } finally {
      setScheduling(false);
    }
  };

  const handleJoin = () => setInCall(true);

  const handleEndCall = async () => {
    await endCall();
    setInCall(false);
  };

  // Any group member can join once it's time lor
  const canJoin =
    room &&
    room.status !== 'ended' &&
    now >= new Date(room.scheduledTime);

  const statusLabel = {
    idle: '',
    'requesting-mic': 'Getting mic access...',
    waiting: 'Waiting for other person...',
    connecting: 'Connecting...',
    connected: 'Connected 🎙️',
    error: 'Connection error lah',
  }[status] || '';

  const minDateTime = new Date(Date.now() + 60_000).toISOString().slice(0, 16);

  // Participant name for in-call display
  const participantName =
    members.find((m) => String(m.user?._id || m.user) === String(room?.participantId))
      ?.user?.name || 'Them';

  return (
    <>
      {/* Bar: shown when not in call */}
      {!inCall && (
        <div style={S.bar}>
          <div style={S.barLeft}>
            <span style={S.micIcon}>🎙️</span>
            {room && room.status !== 'ended' ? (
              <span style={S.scheduledText}>
                {room.status === 'active' ? '🟢 Call is live — ' : 'Scheduled: '}
                <strong>
                  {new Date(room.scheduledTime).toLocaleString([], {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </strong>
              </span>
            ) : (
              <span style={S.noRoomText}>No active voice call</span>
            )}
          </div>

          <div style={S.barRight}>
            {(!room || room.status === 'ended') && (
              <button
                style={S.openBtn}
                onClick={() => { setShowModal(true); setModalError(''); }}
              >
                🎙️ Start / Schedule Call
              </button>
            )}

            {canJoin && !inCall && (
              <button
                style={S.joinBtn}
                className="vc-join-pulse"
                onClick={handleJoin}
              >
                🟢 Join Call
              </button>
            )}

            {room && room.status === 'scheduled' && (
              <button
                style={S.cancelRoomBtn}
                onClick={async () => {
                  try {
                    await api.patch('/audio/status', { roomId: room.roomId, status: 'ended' });
                  } catch { /* ignore */ }
                  setTimeout(fetchRoom, 300);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* In-Call Overlay */}
      {inCall && (
        <div style={S.callOverlay}>
          <div style={S.callCard}>
            <h3 style={S.callTitle}>Voice Call</h3>
            {statusLabel && <p style={S.callStatus}>{statusLabel}</p>}

            <div style={S.avatarRow}>
              <SpeakAvatar label="You" active={speaking && !muted} />
              <span style={S.waveLine}>〜〜〜</span>
              <SpeakAvatar label={participantName} active={remoteSpeaking} />
            </div>

            <div style={S.controls}>
              <ControlBtn
                icon={muted ? '🔇' : '🎤'}
                label={muted ? 'Unmute' : 'Mute'}
                onClick={toggleMute}
                active={muted}
              />
              <ControlBtn icon="📵" label="End Call" onClick={handleEndCall} danger />
            </div>
          </div>
        </div>
      )}

      {/* Create / Schedule Modal */}
      {showModal && (
        <div style={S.backdrop} onClick={() => setShowModal(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={S.modalTitle}>🎙️ Audio Room</h3>
            <p style={S.modalSub}>Start now or schedule it for later lor</p>

            {/* Dropdown 1: Select participant */}
            <label style={S.label}>Who to call lah?</label>
            <select
              style={S.select}
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
            >
              <option value="">— Select a member —</option>
              {otherMembers.map((m) => {
                const uid = String(m.user?._id || m.user);
                const uname = m.user?.name || uid;
                return (
                  <option key={uid} value={uid}>
                    {uname}
                  </option>
                );
              })}
            </select>

            {/* Dropdown 2: Start mode */}
            <label style={{ ...S.label, marginTop: 14 }}>When?</label>
            <select
              style={S.select}
              value={startMode}
              onChange={(e) => setStartMode(e.target.value)}
            >
              <option value="now">Start Now (immediately)</option>
              <option value="schedule">Schedule for Later</option>
            </select>

            {/* DateTime picker — only for scheduled mode */}
            {startMode === 'schedule' && (
              <>
                <label style={{ ...S.label, marginTop: 14 }}>Pick date &amp; time</label>
                <input
                  type="datetime-local"
                  min={minDateTime}
                  value={pickedTime}
                  onChange={(e) => setPickedTime(e.target.value)}
                  style={S.input}
                />
                <p style={S.hintText}>📧 Both users will get an email reminder lah</p>
              </>
            )}

            {modalError && <p style={S.errorText}>{modalError}</p>}

            <div style={S.modalActions}>
              <button
                style={S.cancelBtn}
                onClick={() => setShowModal(false)}
                disabled={scheduling}
              >
                Cancel
              </button>
              <button
                style={{
                  ...S.confirmBtn,
                  background: startMode === 'now' ? '#00c853' : '#1a6bff',
                }}
                onClick={handleConfirm}
                disabled={scheduling}
              >
                {scheduling
                  ? 'Starting...'
                  : startMode === 'now'
                  ? '🟢 Start Now'
                  : '📅 Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes vcJoinPulse {
          0%   { box-shadow: 0 0 0 0 rgba(0,200,83,0.7); }
          70%  { box-shadow: 0 0 0 12px rgba(0,200,83,0); }
          100% { box-shadow: 0 0 0 0 rgba(0,200,83,0); }
        }
        .vc-join-pulse { animation: vcJoinPulse 1.2s infinite; }
        @keyframes vcSpeakPulse {
          0%   { box-shadow: 0 0 0 0 rgba(26,107,255,0.65); }
          70%  { box-shadow: 0 0 0 20px rgba(26,107,255,0); }
          100% { box-shadow: 0 0 0 0 rgba(26,107,255,0); }
        }
        .vc-speak-active { animation: vcSpeakPulse 1s infinite; }
      `}</style>
    </>
  );
}

function SpeakAvatar({ label, active }) {
  return (
    <div style={S.avatarWrap}>
      <div
        className={active ? 'vc-speak-active' : ''}
        style={{
          ...S.avatar,
          border: active ? '2px solid #1a6bff' : '2px solid rgba(255,255,255,0.14)',
          background: active ? 'rgba(26,107,255,0.18)' : 'rgba(255,255,255,0.05)',
        }}
      >
        🧑
      </div>
      <span style={S.avatarLabel}>{label}</span>
    </div>
  );
}

function ControlBtn({ icon, label, onClick, danger = false, active = false }) {
  return (
    <button
      style={{
        ...S.ctrlBtn,
        background: danger
          ? 'rgba(229,57,53,0.15)'
          : active
          ? 'rgba(255,100,100,0.15)'
          : 'rgba(255,255,255,0.07)',
        border: danger
          ? '1px solid #e53935'
          : active
          ? '1px solid #f66'
          : '1px solid rgba(255,255,255,0.15)',
      }}
      onClick={onClick}
      title={label}
    >
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={S.ctrlLabel}>{label}</span>
    </button>
  );
}

const S = {
  bar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '7px 14px',
    background: 'rgba(26,107,255,0.07)',
    borderBottom: '1px solid rgba(26,107,255,0.17)',
    minHeight: 42, flexShrink: 0,
  },
  barLeft: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 },
  micIcon: { fontSize: 17 },
  scheduledText: { color: '#1a6bff' },
  noRoomText: { color: '#aaa' },
  barRight: { display: 'flex', gap: 8, alignItems: 'center' },
  openBtn: {
    padding: '5px 13px', borderRadius: 6,
    border: '1px solid #1a6bff', background: 'transparent',
    color: '#1a6bff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
  },
  joinBtn: {
    padding: '5px 14px', borderRadius: 6,
    border: 'none', background: '#00c853',
    color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700,
  },
  cancelRoomBtn: {
    padding: '4px 10px', borderRadius: 6,
    border: '1px solid rgba(255,60,60,0.4)', background: 'transparent',
    color: '#f66', cursor: 'pointer', fontSize: 11,
  },
  callOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, backdropFilter: 'blur(8px)',
  },
  callCard: {
    background: '#09172a', borderRadius: 20, padding: '36px 40px', width: 360,
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
    border: '1px solid rgba(26,107,255,0.22)',
  },
  callTitle: { color: '#fff', margin: '0 0 4px', fontSize: 20 },
  callStatus: { color: '#7aadff', fontSize: 13, margin: '0 0 24px' },
  avatarRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 14, marginBottom: 28,
  },
  avatarWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 },
  avatar: {
    width: 68, height: 68, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 30, transition: 'border 0.15s, background 0.15s',
  },
  avatarLabel: { color: '#999', fontSize: 12 },
  waveLine: { color: 'rgba(255,255,255,0.2)', fontSize: 18, letterSpacing: 3 },
  controls: { display: 'flex', justifyContent: 'center', gap: 14 },
  ctrlBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    padding: '10px 18px', borderRadius: 12, cursor: 'pointer',
    minWidth: 80, transition: 'all 0.15s',
  },
  ctrlLabel: { fontSize: 11, color: '#ccc' },
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.62)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000,
  },
  modal: {
    background: '#0d1c30', borderRadius: 16, padding: '28px 30px', width: 370,
    boxShadow: '0 12px 44px rgba(0,0,0,0.55)',
    border: '1px solid rgba(26,107,255,0.22)',
  },
  modalTitle: { margin: '0 0 4px', color: '#fff', fontSize: 18 },
  modalSub: { margin: '0 0 18px', color: '#9bb', fontSize: 12 },
  label: { display: 'block', color: '#bcc', fontSize: 12, marginBottom: 5 },
  select: {
    width: '100%', padding: '8px 10px', borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.12)',
    background: '#1a2a3a', color: '#fff', fontSize: 14,
    boxSizing: 'border-box', cursor: 'pointer',
    appearance: 'auto',
  },
  input: {
    width: '100%', padding: '8px 10px', borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 14,
    boxSizing: 'border-box', colorScheme: 'dark',
  },
  hintText: { color: '#8ab', fontSize: 11, margin: '6px 0 0' },
  errorText: { color: '#f77', fontSize: 12, margin: '10px 0 0' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  cancelBtn: {
    padding: '8px 17px', borderRadius: 7,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'transparent', color: '#bbb', cursor: 'pointer', fontSize: 13,
  },
  confirmBtn: {
    padding: '8px 17px', borderRadius: 7,
    border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
  },
};
