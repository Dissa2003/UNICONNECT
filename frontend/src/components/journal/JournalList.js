/**
 * JournalList Component
 * 
 * Renders a list of JournalItem components.
 * Handles loading states and empty states (when no entries exist).
 * 
 * Props:
 * - entries: Array of journal entry objects to display.
 * - loading: Boolean indicating if entries are currently being fetched.
 * - onDelete: Callback function to pass down to each JournalItem for deletion.
 */
import React from 'react';
import JournalItem from './JournalItem';

export default function JournalList({ entries, loading, onDelete }) {
  // Show a loading indicator if data is being fetched and there are no entries yet
  if (loading && entries.length === 0) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading entries...</div>;
  }

  // Show a placeholder message if the user hasn't created any entries
  if (entries.length === 0) {
    return (
      <div className="journal-empty">
        <div className="journal-empty-icon">💭</div>
        <p>No mood entries yet. Take a moment to write how you feel.</p>
      </div>
    );
  }

  // Render the list of journal items
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
