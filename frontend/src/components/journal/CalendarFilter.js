/**
 * CalendarFilter Component
 * 
 * Provides a calendar interface and mode selector (Daily, Weekly, Monthly)
 * to filter journal entries or stress history based on selected dates.
 * 
 * Props:
 * - selectedDate: Currently selected date state.
 * - mode: Current viewing mode ('day', 'week', 'month').
 * - onDateChange: Callback fired when the user selects a new date on the calendar.
 * - onModeChange: Callback fired when the user changes the viewing mode.
 */
import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

export default function CalendarFilter({ selectedDate, mode, onDateChange, onModeChange }) {
  return (
    <div className="calendar-filter-card glass-card">
      <div className="calendar-mode-selector">
        {/* Toggle button for Daily view */}
        <button 
          className={`calendar-mode-btn ${mode === 'day' ? 'active' : ''}`}
          onClick={() => onModeChange('day')}
        >
          Daily
        </button>
        
        {/* Toggle button for Weekly view */}
        <button 
          className={`calendar-mode-btn ${mode === 'week' ? 'active' : ''}`}
          onClick={() => onModeChange('week')}
        >
          Weekly
        </button>
        
        {/* Toggle button for Monthly view */}
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
