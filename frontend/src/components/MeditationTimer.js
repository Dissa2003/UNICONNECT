/**
 * MeditationTimer Component
 * 
 * Provides a customizable countdown timer for meditation sessions.
 * Features a circular SVG progress ring and supports different duration presets.
 * Helps users track their wellness activities.
 * 
 * Props:
 * - pal: The color palette object for styling.
 */
import React, { useState, useEffect, useRef } from 'react';

const DURATIONS = [
  { label: '5 min',  seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: '15 min', seconds: 900 },
];

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function MeditationTimer({ pal }) {
  // Currently selected meditation duration (in seconds)
  const [selected, setSelected]   = useState(DURATIONS[0].seconds);
  
  // Remaining time for the current active session
  const [remaining, setRemaining] = useState(DURATIONS[0].seconds);
  
  // Current status of the timer: 'idle' | 'running' | 'paused' | 'done'
  const [status, setStatus] = useState('idle');
  
  // Ref to hold the interval ID for clearing the timer
  const tickRef = useRef(null);

  const selectDuration = (secs) => {
    if (status !== 'idle') return;
    setSelected(secs);
    setRemaining(secs);
  };

  const start  = () => setStatus('running');
  const pause  = () => setStatus('paused');
  const resume = () => setStatus('running');

  const stop = () => {
    clearInterval(tickRef.current);
    setStatus('idle');
    setRemaining(selected);
  };

  // Effect to manage the countdown timer
  useEffect(() => {
    if (status === 'running') {
      tickRef.current = setInterval(() => {
        setRemaining(prev => {
          // If time is up, clear interval and set status to done
          if (prev <= 1) {
            clearInterval(tickRef.current);
            setStatus('done');
            return 0;
          }
          return prev - 1; // Decrement remaining time by 1 second
        });
      }, 1000);
    } else {
      // Clear interval if not running (e.g., paused or idle)
      clearInterval(tickRef.current);
    }
    
    // Cleanup interval on unmount
    return () => clearInterval(tickRef.current);
  }, [status]);

  // SVG ring progress
  const RADIUS = 54;
  const circumference = 2 * Math.PI * RADIUS;
  const progress = status === 'idle' ? 0 : (selected - remaining) / selected;
  const strokeDashoffset = circumference * (1 - progress);
  const ringColor = status === 'done' ? '#00E5C3' : '#1A6BFF';

  return (
    <div style={{ textAlign: 'center', padding: '1rem 0' }}>

      {/* Duration selector */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: '0.6rem', marginBottom: '1.8rem',
      }}>
        {DURATIONS.map(d => {
          const isActive = selected === d.seconds;
          return (
            <button key={d.seconds} onClick={() => selectDuration(d.seconds)}
              disabled={status !== 'idle'}
              style={{
                padding: '0.45rem 1.1rem', borderRadius: '8px',
                fontSize: '0.83rem', fontWeight: 600,
                cursor: status !== 'idle' ? 'not-allowed' : 'pointer',
                background: isActive ? 'rgba(26,107,255,.15)' : pal.inputBg,
                border: isActive ? '1.5px solid #1A6BFF' : `1.5px solid ${pal.inputBorder}`,
                color: isActive ? '#38BFFF' : pal.textMuted,
                opacity: status !== 'idle' ? 0.5 : 1,
                transition: 'all 0.15s',
              }}>
              {d.label}
            </button>
          );
        })}
      </div>

      {/* Circular progress ring */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.2rem' }}>
        <div style={{ position: 'relative', width: 140, height: 140 }}>
          <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
            {/* Background track */}
            <circle
              cx="70" cy="70" r={RADIUS}
              fill="none" stroke={pal.cardBorder} strokeWidth="8"
            />
            {/* Progress arc */}
            <circle
              cx="70" cy="70" r={RADIUS}
              fill="none"
              stroke={ringColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.95s linear, stroke 0.4s' }}
            />
          </svg>

          {/* Centre display */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)', textAlign: 'center',
          }}>
            {status === 'done' ? (
              <span style={{ fontSize: '2.2rem' }}>✅</span>
            ) : (
              <>
                <div style={{
                  fontSize: '1.65rem', fontWeight: 800,
                  fontFamily: 'Syne, sans-serif', color: '#38BFFF', lineHeight: 1,
                }}>
                  {formatTime(remaining)}
                </div>
                <div style={{
                  fontSize: '0.6rem', color: pal.textDim,
                  textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 3,
                }}>
                  remaining
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status text */}
      <div style={{
        fontSize: '0.85rem', color: pal.textMuted,
        marginBottom: '1.5rem', minHeight: '1.3rem', lineHeight: 1.5,
      }}>
        {status === 'idle'    && 'Select a duration, then press Start to begin.'}
        {status === 'running' && '🧘 Session in progress — find your calm...'}
        {status === 'paused'  && 'Paused — resume whenever you\'re ready.'}
        {status === 'done'    && '🎉 Session complete! Well done taking care of yourself.'}
      </div>

      {/* Control buttons */}
      <div style={{ display: 'flex', gap: '0.7rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {status === 'idle' && (
          <button onClick={start} style={{
            padding: '0.75rem 2rem', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg,#1A6BFF,#38BFFF)', color: '#fff',
            fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(26,107,255,.35)',
          }}>
            ▶ Start
          </button>
        )}

        {status === 'running' && (
          <>
            <button onClick={pause} style={{
              padding: '0.75rem 1.6rem', borderRadius: '10px',
              border: '1.5px solid rgba(245,158,11,.4)',
              background: 'rgba(245,158,11,.1)', color: '#F59E0B',
              fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
            }}>
              ⏸ Pause
            </button>
            <button onClick={stop} style={{
              padding: '0.75rem 1.6rem', borderRadius: '10px',
              border: '1.5px solid rgba(255,82,114,.4)',
              background: 'rgba(255,82,114,.1)', color: '#FF5272',
              fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
            }}>
              ■ Stop
            </button>
          </>
        )}

        {status === 'paused' && (
          <>
            <button onClick={resume} style={{
              padding: '0.75rem 1.6rem', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg,#1A6BFF,#38BFFF)', color: '#fff',
              fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
            }}>
              ▶ Resume
            </button>
            <button onClick={stop} style={{
              padding: '0.75rem 1.6rem', borderRadius: '10px',
              border: '1.5px solid rgba(255,82,114,.4)',
              background: 'rgba(255,82,114,.1)', color: '#FF5272',
              fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
            }}>
              ■ Stop
            </button>
          </>
        )}

        {status === 'done' && (
          <button onClick={stop} style={{
            padding: '0.75rem 2rem', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg,#00E5C3,#38BFFF)', color: '#fff',
            fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,229,195,.3)',
          }}>
            ↩ New Session
          </button>
        )}
      </div>
    </div>
  );
}
