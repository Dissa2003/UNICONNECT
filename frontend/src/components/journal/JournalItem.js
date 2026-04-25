/**
 * JournalItem Component
 * 
 * Displays a single mood journal entry card.
 * Shows the user's reflection text, the dynamically detected stress level badge,
 * the feedback message, and the timestamp. Includes a delete button.
 * 
 * Props:
 * - entry: The journal entry object containing moodText, stressLevel, message, and createdAt.
 * - onDelete: Callback function triggered when the user attempts to delete the entry.
 */
import React from 'react';

export default function JournalItem({ entry, onDelete }) {
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
    // Prompt the user for confirmation before deleting
    if (window.confirm('Are you sure you want to delete this journal entry?')) {
      onDelete(entry._id);
    }
  };

  return (
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
  );
}
