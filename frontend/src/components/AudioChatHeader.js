import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// AudioChatHeader — sits at the top of the chat window for any 1-to-1 chat lor
// Gives the user a Schedule button + a Join button when it's time sia
// Props:
//   chatId         — the StudyGroup _id that ties audio room to text chat lah
//   participantId  — the other user in the chat (not the current user)
//   onJoinCall     — callback fired when user clicks Join, passes the room object lor

export default function AudioChatHeader({ chatId, participantId, onJoinCall }) {
  const [room, setRoom] = useState(null);           // current scheduled/active room
  const [showModal, setShowModal] = useState(false); // schedule modal visibility
  const [pickedTime, setPickedTime] = useState(''); // datetime-local input value
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());

  // Tick every 10 seconds so the Join button can appear on time lor
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(tick);
  }, []);

  // Fetch any currently scheduled/active room for this chat lah
  const fetchRoom = useCallback(async () => {
    if (!chatId) return;
    try {
      const { data } = await api.get(`/audio/active/${chatId}`);
      setRoom(data.room);
    } catch {
      // 404 just means no room yet — that's fine lor
      setRoom(null);
    }
  }, [chatId]);

  // Poll every 15 s so the Join button appears for both users automatically sia
  useEffect(() => {
    fetchRoom();
    const poll = setInterval(fetchRoom, 15_000);
    return () => clearInterval(poll);
  }, [fetchRoom]);

  // ── Schedule a new voice call ──
  const handleSchedule = async () => {
    setError('');
    if (!pickedTime) {
      setError('Please pick a date and time');
      return;
    }
    const chosen = new Date(pickedTime);
    if (chosen <= new Date()) {
      setError('Must be a future time');
      return;
    }

    setScheduling(true);
    try {
      const { data } = await api.post('/audio/schedule', {
        chatId,
        participantId,
        scheduledTime: chosen.toISOString(),
      });
      setRoom(data.room);
      setShowModal(false);
      setPickedTime('');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong, please try again');
    } finally {
      setScheduling(false);
    }
  };

  // Is it time to join? Join button shows if current time >= scheduledTime lor
  const canJoin =
    room &&
    room.status !== 'ended' &&
    now >= new Date(room.scheduledTime);

  // Minimum datetime value for the picker — must be at least now + 1 minute sia
  const minDateTime = new Date(Date.now() + 60_000)
    .toISOString()
    .slice(0, 16);

  return (
    <>
      {/* ── Header Bar ── */}
      <div style={styles.bar}>
        <div style={styles.left}>
          <span style={styles.icon}>🎙️</span>
          {room && room.status !== 'ended' ? (
            <span style={styles.scheduledLabel}>
              Voice call scheduled:{' '}
              <strong>
                {new Date(room.scheduledTime).toLocaleString([], {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </strong>
            </span>
          ) : (
            <span style={styles.noRoomLabel}>No voice call scheduled</span>
          )}
        </div>

        <div style={styles.right}>
          {/* Schedule Button — always visible unless a room is already pending lor */}
          {(!room || room.status === 'ended') && (
            <button
              style={styles.scheduleBtn}
              onClick={() => { setShowModal(true); setError(''); }}
            >
              + Schedule Call
            </button>
          )}

          {/* Join Button — only appears when it is time lah */}
          {canJoin && (
            <button
              style={styles.joinBtn}
              onClick={() => onJoinCall && onJoinCall(room)}
            >
              🔴 Join Call
            </button>
          )}
        </div>
      </div>

      {/* ── Schedule Modal ── */}
      {showModal && (
        <div style={styles.overlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Schedule a Voice Call</h3>
            <p style={styles.modalSubtitle}>
              Both of you will get an email reminder lor
            </p>

            <label style={styles.label}>Pick date &amp; time</label>
            <input
              type="datetime-local"
              min={minDateTime}
              value={pickedTime}
              onChange={(e) => setPickedTime(e.target.value)}
              style={styles.input}
            />

            {error && <p style={styles.errorText}>{error}</p>}

            <div style={styles.modalActions}>
              <button
                style={styles.cancelBtn}
                onClick={() => setShowModal(false)}
                disabled={scheduling}
              >
                Cancel
              </button>
              <button
                style={styles.confirmBtn}
                onClick={handleSchedule}
                disabled={scheduling}
              >
                {scheduling ? 'Scheduling...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    background: 'rgba(26, 107, 255, 0.08)',
    borderBottom: '1px solid rgba(26, 107, 255, 0.2)',
    borderRadius: '8px 8px 0 0',
    minHeight: 44,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
  },
  icon: { fontSize: 18 },
  scheduledLabel: { color: '#1a6bff' },
  noRoomLabel: { color: '#aaa' },
  right: { display: 'flex', gap: 8 },
  scheduleBtn: {
    padding: '6px 14px',
    borderRadius: 6,
    border: '1px solid #1a6bff',
    background: 'transparent',
    color: '#1a6bff',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
  joinBtn: {
    padding: '6px 14px',
    borderRadius: 6,
    border: 'none',
    background: '#e53935',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 700,
    animation: 'pulse 1.5s infinite',
  },
  // Modal styles lor
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9000,
  },
  modal: {
    background: '#0f1e35',
    borderRadius: 12,
    padding: '28px 32px',
    width: 360,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    border: '1px solid rgba(26,107,255,0.25)',
  },
  modalTitle: { margin: '0 0 4px', color: '#fff', fontSize: 18 },
  modalSubtitle: { margin: '0 0 20px', color: '#aaa', fontSize: 13 },
  label: { display: 'block', color: '#ccc', fontSize: 13, marginBottom: 6 },
  input: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: 14,
    boxSizing: 'border-box',
    colorScheme: 'dark',
  },
  errorText: { color: '#f66', fontSize: 13, margin: '8px 0 0' },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    padding: '8px 18px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'transparent',
    color: '#ccc',
    cursor: 'pointer',
    fontSize: 14,
  },
  confirmBtn: {
    padding: '8px 18px',
    borderRadius: 6,
    border: 'none',
    background: '#1a6bff',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },
};
