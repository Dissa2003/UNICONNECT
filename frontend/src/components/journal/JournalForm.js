/**
 * JournalForm Component
 * 
 * Provides a text area for users to log their mood and thoughts.
 * Handles form submission and loading states while the entry is being processed
 * (e.g., sent to the backend for smart stress detection).
 * 
 * Props:
 * - onEntryAdded: Callback function to execute when a new entry is submitted successfully.
 */
import React, { useState } from 'react';

export default function JournalForm({ onEntryAdded }) {
  // State for the text content of the mood journal entry
  const [moodText, setMoodText] = useState('');
  
  // State to disable the button and show a processing indicator during submission
  const [loading, setLoading] = useState(false);

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default browser form refresh
    const text = moodText.trim();

    // Prevent submission if the text area is empty or only contains whitespace
    if (!text) return;

    setLoading(true);
    try {
      // Call the parent handler to save the entry (e.g., to the backend API)
      await onEntryAdded(text);
      
      // Clear the text area on successful submission
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
