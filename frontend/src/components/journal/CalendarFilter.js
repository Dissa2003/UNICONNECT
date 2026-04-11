import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

export default function CalendarFilter({ selectedDate, mode, onDateChange, onModeChange }) {
  return (
    <div className="calendar-filter-card glass-card">
      <div className="calendar-mode-selector">
        <button 
          className={`calendar-mode-btn ${mode === 'day' ? 'active' : ''}`}
          onClick={() => onModeChange('day')}
        >
          Daily
        </button>
        <button 
          className={`calendar-mode-btn ${mode === 'week' ? 'active' : ''}`}
          onClick={() => onModeChange('week')}
        >
          Weekly
        </button>
        <button 
          className={`calendar-mode-btn ${mode === 'month' ? 'active' : ''}`}
          onClick={() => onModeChange('month')}
        >
          Monthly
        </button>
      </div>

      <Calendar 
        onChange={onDateChange} 
        value={selectedDate} 
        className="premium-calendar"
        calendarType="iso8601"
      />
    </div>
  );
}
