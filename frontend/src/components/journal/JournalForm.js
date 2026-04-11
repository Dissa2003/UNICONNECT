import React, { useState } from 'react';

export default function JournalForm({ onEntryAdded }) {
  const [moodText, setMoodText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = moodText.trim();

    if (!text) return;

    setLoading(true);
    try {
      await onEntryAdded(text);
      setMoodText('');
    } catch (err) {
      console.error('Failed to save entry:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="journal-form-card glass-card">
      <h3><span>✍️</span> Reflect on your day</h3>
      <form onSubmit={handleSubmit}>
        <div className="textarea-wrapper">
          <textarea
            className="journal-textarea"
            placeholder="How are you feeling? Write your thoughts here for a smart stress scan..."
            value={moodText}
            onChange={(e) => setMoodText(e.target.value)}
            required
          ></textarea>
        </div>
        <button 
          type="submit" 
          className="journal-save-btn" 
          disabled={loading || !moodText.trim()}
        >
          {loading ? 'Processing...' : 'Securely Save Entry'}
          {!loading && <span style={{fontSize:'1.2rem'}}>✨</span>}
        </button>
      </form>
    </div>
  );
}
