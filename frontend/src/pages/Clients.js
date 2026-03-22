import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import TutorNav from '../components/TutorNav';
import '../styles/TutorDashboard.css';

export default function Clients() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const connectedClients = useMemo(() => bookings.filter((b) => b.status === 'accepted'), [bookings]);
  const pendingClients = useMemo(() => bookings.filter((b) => b.status === 'pending'), [bookings]);

  const showStatus = (msg, error = false) => {
    setMessage(msg);
    setIsError(error);
    setTimeout(() => setMessage(''), 2800);
  };

  const loadClients = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tutor-bookings/tutor/me');
      setBookings(res.data || []);
    } catch (err) {
      showStatus('Failed to load clients', true);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const respondClient = async (bookingId, action) => {
    try {
      setBusy((prev) => ({ ...prev, [bookingId]: true }));
      const res = await api.patch(`/tutor-bookings/${bookingId}/respond`, { action });
      showStatus(res.data?.message || `Booking ${action}ed successfully`);
      await loadClients();

      if (action === 'accept' && res.data?.studyGroup?._id) {
        navigate(`/tutor/chatting?groupId=${res.data.studyGroup._id}`);
      }
    } catch (err) {
      showStatus(err.response?.data?.message || `Failed to ${action} request`, true);
    } finally {
      setBusy((prev) => ({ ...prev, [bookingId]: false }));
    }
  };

  const openClientChat = async (booking) => {
    try {
      setBusy((prev) => ({ ...prev, [booking._id]: true }));
      // Always call the backend to find-or-create the room — don't rely on cached studyGroupId
      const res = await api.get(`/tutor-bookings/${booking._id}/room`);
      const { studyGroupId } = res.data;
      if (!studyGroupId) {
        showStatus('Chat room could not be created. Please try again.', true);
        return;
      }
      navigate(`/tutor/chatting?groupId=${studyGroupId}`);
    } catch (err) {
      showStatus(err.response?.data?.message || 'Failed to open chat room', true);
    } finally {
      setBusy((prev) => ({ ...prev, [booking._id]: false }));
    }
  };

  return (
    <div className="tutor-page">
      <TutorNav active="clients" />

      <section className="section-wrap" style={{ paddingTop: '110px' }}>
        <div className="section-eyebrow">Tutor Clients</div>
        <h2 className="section-title">Connected Students</h2>
        <div className="profile-card">
          {loading ? (
            <div className="empty-bookings">Loading clients...</div>
          ) : (
            <div className="bookings-list">
              {connectedClients.length === 0 && (
                <div className="empty-bookings">No connected clients yet. Accept a request to start chat in Tutor Chatting.</div>
              )}

              {connectedClients.map((booking) => (
                <div key={booking._id} className="booking-item">
                  <div className="booking-top">
                    <div className="booking-student">{booking.student?.name || 'Student'}</div>
                    <span className="booking-status status-accepted">connected</span>
                  </div>
                  <div className="booking-meta">
                    <span>Subject: {booking.subject}</span>
                    <span>Budget: LKR {Number(booking.maxBudget || 0).toFixed(2)}</span>
                    <span>Style: {booking.learningStyle}</span>
                    <span>Language: {booking.language || 'N/A'}</span>
                  </div>
                  <div className="booking-time">Connected: {new Date(booking.updatedAt).toLocaleString()}</div>
                  <div className="booking-actions">
                    <button
                      type="button"
                      className="booking-btn open"
                      disabled={Boolean(busy[booking._id])}
                      onClick={() => openClientChat(booking)}
                    >
                      {busy[booking._id] ? 'Opening...' : 'Chat With Client'}
                    </button>
                  </div>
                </div>
              ))}

              {pendingClients.length > 0 && (
                <>
                  <h3 style={{ margin: '0.4rem 0 0.1rem', color: '#0a1744', fontFamily: 'Syne, sans-serif' }}>Pending Client Requests</h3>
                  {pendingClients.map((booking) => (
                    <div key={`pending-${booking._id}`} className="booking-item">
                      <div className="booking-top">
                        <div className="booking-student">{booking.student?.name || 'Student'}</div>
                        <span className="booking-status status-pending">pending</span>
                      </div>
                      <div className="booking-meta">
                        <span>Subject: {booking.subject}</span>
                        <span>Budget: LKR {Number(booking.maxBudget || 0).toFixed(2)}</span>
                        <span>Style: {booking.learningStyle}</span>
                        <span>Language: {booking.language || 'N/A'}</span>
                      </div>
                      <div className="booking-actions">
                        <button
                          type="button"
                          className="booking-btn accept"
                          disabled={Boolean(busy[booking._id])}
                          onClick={() => respondClient(booking._id, 'accept')}
                        >
                          {busy[booking._id] ? 'Please wait...' : 'Accept & Connect'}
                        </button>
                        <button
                          type="button"
                          className="booking-btn reject"
                          disabled={Boolean(busy[booking._id])}
                          onClick={() => respondClient(booking._id, 'reject')}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {message && <div className={`floating-status ${isError ? 'error' : ''}`}>{message}</div>}
    </div>
  );
}
