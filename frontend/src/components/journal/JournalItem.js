/**
 * JournalItem Component
 * 
 * Displays a single mood journal entry card.
 * Shows the user's reflection text, the dynamically detected stress level badge,
 * the feedback message, and the timestamp. Includes a delete button with a custom confirmation modal.
 * 
 * Props:
 * - entry: The journal entry object containing moodText, stressLevel, message, and createdAt.
 * - onDelete: Callback function triggered when the user attempts to delete the entry.
 */
import React, { useState } from 'react';

export default function JournalItem({ entry, onDelete }) {
  const [showConfirm, setShowConfirm] = useState(false);

  // Helper function to format the ISO date string into a human-readable format
  const formatDate = (dateString) => {
    const options = { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Handler for the delete button click
  const handleDelete = () => {
    // Show custom confirmation modal
    setShowConfirm(true);
  };

  const confirmDelete = () => {
    setShowConfirm(false);
    onDelete(entry._id);
  };

  const cancelDelete = () => {
    setShowConfirm(false);
  };

  return (
    <>
      <div className={`journal-item glass-card ${entry.stressLevel === 'HIGH' ? 'high-stress-highlight' : ''}`}>
        <div className="journal-item-header">
          <div className="journal-item-text">{entry.moodText}</div>
          <button 
            className="journal-delete-btn" 
            onClick={handleDelete}
            title="Remove entry"
          >
            <span>🗑️</span>
          </button>
        </div>

        {entry.message && (
          <div className="journal-item-message">
             {entry.message}
          </div>
        )}

        <div className="journal-item-footer">
          <div className="journal-item-meta">
            <span className={`stress-badge ${entry.stressLevel?.toLowerCase() || 'low'}`}>
              {entry.stressLevel || 'LOW'}
            </span>
            <div className="journal-item-date">
              <span>🕘</span> {formatDate(entry.createdAt)}
            </div>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
          backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="modal-content glass-card" style={{
            background: '#1A233A', padding: '2rem', borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)', maxWidth: '380px', width: '90%',
            textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🗑️</div>
            <h3 style={{marginTop: 0, marginBottom: '0.8rem', color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: '1.4rem'}}>Delete Entry?</h3>
            <p style={{marginBottom: '1.8rem', color: '#94A3B8', fontSize: '0.95rem', lineHeight: '1.5'}}>Are you sure you want to permanently delete this journal entry? This action cannot be undone.</p>
            <div style={{display: 'flex', justifyContent: 'center', gap: '0.8rem'}}>
              <button onClick={cancelDelete} style={{
                flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid #334155',
                background: '#1E293B', cursor: 'pointer', color: '#CBD5E1', fontWeight: '600', transition: 'all 0.2s'
              }}>Cancel</button>
              <button onClick={confirmDelete} style={{
                flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none',
                background: '#EF4444', color: '#fff', cursor: 'pointer', fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(239,68,68,0.3)', transition: 'all 0.2s'
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
