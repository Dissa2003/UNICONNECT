import React from 'react';
import JournalItem from './JournalItem';

export default function JournalList({ entries, loading, onDelete }) {
  if (loading && entries.length === 0) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading entries...</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="journal-empty">
        <div className="journal-empty-icon">💭</div>
        <p>No mood entries yet. Take a moment to write how you feel.</p>
      </div>
    );
  }

  return (
    <div className="journal-list">
      {entries.map((entry) => (
        <JournalItem 
          key={entry._id} 
          entry={entry} 
          onDelete={onDelete} 
        />
      ))}
    </div>
  );
}
