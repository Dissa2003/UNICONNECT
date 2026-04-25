/**
 * JournalSummary Component
 * 
 * Displays aggregate statistics for the user's mood journal entries within
 * the selected time period. Shows counts of High, Medium, and Low stress levels.
 * 
 * Props:
 * - entries: Array of journal entry objects for the current time period.
 * - mode: The current calendar view mode ('day', 'week', 'month').
 * - selectedDate: The currently selected date to derive the month/year label.
 */
import React from 'react';

export default function JournalSummary({ entries, mode, selectedDate }) {
  // Calculate the total number of entries for each stress level
  const stats = {
    high: entries.filter(e => e.stressLevel === 'HIGH').length,
    medium: entries.filter(e => e.stressLevel === 'MEDIUM').length,
    low: entries.filter(e => e.stressLevel === 'LOW').length,
  };

  // Helper function to generate a dynamic title based on the selected mode
  const getTimeLabel = () => {
    if (mode === 'day') return 'Today';
    if (mode === 'week') return 'This Week';
    return selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="journal-summary-card glass-card">
      <div className="summary-title">📈 {getTimeLabel()} Insights</div>
      <div className="summary-stats">
        <div className="stat-item high">
          <div className="stat-value">{stats.high}</div>
          <div className="stat-label">High</div>
        </div>
        <div className="stat-item medium">
          <div className="stat-value">{stats.medium}</div>
          <div className="stat-label">Medium</div>
        </div>
        <div className="stat-item low">
          <div className="stat-value">{stats.low}</div>
          <div className="stat-label">Low</div>
        </div>
      </div>
      <div style={{marginTop: '1.2rem', fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center'}}>
        {entries.length === 0 
          ? 'No data points for this period.' 
          : `Monitoring ${entries.length} data points.`}
      </div>
    </div>
  );
}
