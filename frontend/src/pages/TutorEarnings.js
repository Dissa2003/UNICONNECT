import React, { useEffect, useState } from 'react';
import TutorNav from '../components/TutorNav';
import api from '../services/api';
import '../styles/TutorDashboard.css';

export default function TutorEarnings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/tutor-bookings/tutor/me');
        setBookings(res.data || []);
      } catch (e) {
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const accepted = bookings.filter((b) => b.status === 'accepted');
  const pending  = bookings.filter((b) => b.status === 'pending');
  const rejected = bookings.filter((b) => b.status === 'rejected');
  const totalEstimated = accepted.reduce((sum, b) => sum + Number(b.maxBudget || 0), 0);
  const avgScore = accepted.length
    ? (accepted.reduce((s, b) => s + Number(b.matchScore || 0), 0) / accepted.length * 100).toFixed(0)
    : 0;

  return (
    <div className="tutor-page">
      <TutorNav active="earnings" />

      <section className="section-wrap" style={{ paddingTop: '110px' }}>
        <div className="section-eyebrow">Tutor Earnings</div>
        <h2 className="section-title">Your Earnings Overview</h2>

        {/* Stat cards */}
        <div className="earnings-stats">
          <div className="earnings-card">
            <div className="ec-value">LKR {totalEstimated.toLocaleString()}</div>
            <div className="ec-label">Estimated Total Earnings</div>
          </div>
          <div className="earnings-card">
            <div className="ec-value">{accepted.length}</div>
            <div className="ec-label">Connected Clients</div>
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
      </section>
    </div>
  );
}
