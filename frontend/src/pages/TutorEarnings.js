import React, { useEffect, useState } from 'react';
import TutorNav from '../components/TutorNav';
import api from '../services/api';
import '../styles/TutorDashboard.css';

export default function TutorEarnings() {
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview'); // 'overview' | 'payments'

  useEffect(() => {
    const load = async () => {
      try {
        const [bookRes, payRes] = await Promise.all([
          api.get('/tutor-bookings/tutor/me'),
          api.get('/payments/tutor/my').catch(() => ({ data: [] })),
        ]);
        setBookings(bookRes.data || []);
        setPayments(payRes.data || []);
      } catch (e) {
        setBookings([]);
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const accepted = bookings.filter((b) => b.status === 'accepted');
  const pending  = bookings.filter((b) => b.status === 'pending');
  const rejected = bookings.filter((b) => b.status === 'rejected');
  const completedPayments = payments.filter((p) => p.status === 'completed');
  const totalPaid = completedPayments.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);
  const totalEstimated = accepted.reduce((sum, b) => sum + Number(b.maxBudget || 0), 0);
  const avgScore = accepted.length
    ? (accepted.reduce((s, b) => s + Number(b.matchScore || 0), 0) / accepted.length * 100).toFixed(0)
    : 0;

  const tabStyle = (active) => ({
    padding: '0.55rem 1.2rem',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.82rem',
    fontFamily: 'DM Sans, sans-serif',
    background: active ? '#1A6BFF' : 'rgba(255,255,255,0.06)',
    color: active ? '#fff' : 'rgba(255,255,255,0.5)',
    transition: 'all 0.15s',
  });

  return (
    <div className="tutor-page">
      <TutorNav active="earnings" />

      <section className="section-wrap" style={{ paddingTop: '110px' }}>
        <div className="section-eyebrow">Tutor Earnings</div>
        <h2 className="section-title">Your Earnings Overview</h2>

        {/* Stat cards */}
        <div className="earnings-stats">
          <div className="earnings-card">
            <div className="ec-value">LKR {totalPaid > 0 ? totalPaid.toLocaleString() : totalEstimated.toLocaleString()}</div>
            <div className="ec-label">{totalPaid > 0 ? 'Total Payments Received' : 'Estimated Total Earnings'}</div>
          </div>
          <div className="earnings-card">
            <div className="ec-value">{completedPayments.length || accepted.length}</div>
            <div className="ec-label">{completedPayments.length > 0 ? 'Paid Sessions' : 'Connected Clients'}</div>
          </div>
          <div className="earnings-card">
            <div className="ec-value">{pending.length}</div>
            <div className="ec-label">Pending Requests</div>
          </div>
          <div className="earnings-card">
            <div className="ec-value">{avgScore}%</div>
            <div className="ec-label">Avg Match Score</div>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <button style={tabStyle(tab === 'overview')} onClick={() => setTab('overview')}>Sessions</button>
          <button style={tabStyle(tab === 'payments')} onClick={() => setTab('payments')}>Payment History</button>
        </div>

        {tab === 'overview' && (
          <>
            {/* Accepted sessions list */}
            <h3 className="earnings-section-title">Connected Client Sessions</h3>
            <div className="profile-card">
              {loading ? (
                <div className="empty-bookings">Loading earnings data...</div>
              ) : accepted.length === 0 ? (
                <div className="empty-bookings">No accepted sessions yet. Accept client requests to start earning.</div>
              ) : (
                <div className="bookings-list">
                  {accepted.map((b) => (
                    <div key={b._id} className="booking-item">
                      <div className="booking-top">
                        <div className="booking-student">{b.student?.name || 'Student'}</div>
                        <span className="booking-status status-accepted">connected</span>
                      </div>
                      <div className="booking-meta">
                        <span>Subject: {b.subject}</span>
                        <span>Budget: <strong>LKR {Number(b.maxBudget || 0).toLocaleString()}</strong></span>
                        <span>Style: {b.learningStyle}</span>
                        <span>Match: {(Number(b.matchScore || 0) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="booking-time">
                        Accepted: {new Date(b.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending list */}
            {pending.length > 0 && (
              <>
                <h3 className="earnings-section-title" style={{ marginTop: '2rem' }}>Pending Requests</h3>
                <div className="profile-card">
                  <div className="bookings-list">
                    {pending.map((b) => (
                      <div key={b._id} className="booking-item">
                        <div className="booking-top">
                          <div className="booking-student">{b.student?.name || 'Student'}</div>
                          <span className="booking-status status-pending">pending</span>
                        </div>
                        <div className="booking-meta">
                          <span>Subject: {b.subject}</span>
                          <span>Budget: LKR {Number(b.maxBudget || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {tab === 'payments' && (
          <>
            <h3 className="earnings-section-title">Payment Transactions</h3>
            <div className="profile-card">
              {loading ? (
                <div className="empty-bookings">Loading payment history...</div>
              ) : completedPayments.length === 0 ? (
                <div className="empty-bookings">No payments received yet.</div>
              ) : (
                <div className="bookings-list">
                  {completedPayments.map((p) => (
                    <div key={p._id} className="booking-item">
                      <div className="booking-top">
                        <div className="booking-student">{p.student?.name || 'Student'}</div>
                        <span className="booking-status status-accepted" style={{ background: 'rgba(0,229,195,.12)', color: '#00E5C3', borderColor: 'rgba(0,229,195,.25)' }}>paid</span>
                      </div>
                      <div className="booking-meta">
                        <span>Subject: {p.tutorBooking?.subject || '—'}</span>
                        <span>Duration: <strong>{p.hours}h</strong></span>
                        <span>Rate: LKR {Number(p.hourlyRate || 0).toLocaleString()}/hr</span>
                        <span>Total: <strong style={{ color: '#00E5C3' }}>LKR {Number(p.totalAmount || 0).toLocaleString()}</strong></span>
                      </div>
                      <div className="booking-time" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.3rem' }}>
                        <span>{new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)' }}>{p.transactionRef}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
