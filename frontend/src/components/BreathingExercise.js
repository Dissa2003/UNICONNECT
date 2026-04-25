/**
 * BreathingExercise Component
 * 
 * This component provides an interactive 4-4-4 breathing exercise (Inhale, Hold, Exhale)
 * to help users manage stress and anxiety. It uses a growing and shrinking circular
 * animation to guide the user's breathing pace.
 * 
 * Props:
 * - pal: The color palette object for consistent UI styling.
 */
import React, { useState, useEffect, useRef } from 'react';

const STEPS = [
  { label: 'Inhale',  duration: 4, color: '#38BFFF', description: 'Breathe in slowly through your nose...' },
  { label: 'Hold',    duration: 4, color: '#A78BFA', description: 'Hold gently — stay still...' },
  { label: 'Exhale',  duration: 4, color: '#00E5C3', description: 'Breathe out slowly through your mouth...' },
];

export default function BreathingExercise({ pal }) {
  // State to track if the exercise is currently running
  const [active, setActive] = useState(false);
  
  // Tracks the current step index (0: Inhale, 1: Hold, 2: Exhale)
  const [stepIdx, setStepIdx] = useState(0);
  
  // Tracks the countdown timer for the current step
  const [countdown, setCountdown] = useState(STEPS[0].duration);
  
  // Ref to hold the interval ID for the timer, allowing us to clear it when stopped
  const tickRef = useRef(null);

  const stop = () => {
    clearInterval(tickRef.current);
    setActive(false);
    setStepIdx(0);
    setCountdown(STEPS[0].duration);
  };

  const start = () => {
    setStepIdx(0);
    setCountdown(STEPS[0].duration);
    setActive(true);
  };

  useEffect(() => {
    // If not active, do not start the timer
    if (!active) return;

    let currentStep = 0;
    let currentCount = STEPS[0].duration;

    // Set up an interval that ticks every second
    tickRef.current = setInterval(() => {
      currentCount -= 1;
      
      // When the countdown reaches 0, transition to the next breathing step
      if (currentCount <= 0) {
        currentStep = (currentStep + 1) % STEPS.length;
        currentCount = STEPS[currentStep].duration;
        setStepIdx(currentStep);
      }
      setCountdown(currentCount);
    }, 1000);

    // Cleanup function to clear the interval when the component unmounts or active state changes
    return () => clearInterval(tickRef.current);
  }, [active]);

  const step = STEPS[stepIdx];

  // Calculate circle size: expand on Inhale, large on Hold, shrink on Exhale
  const elapsed = STEPS[stepIdx].duration - countdown;
  const fraction = elapsed / STEPS[stepIdx].duration;
  let circleSize;
  if (step.label === 'Inhale') {
    circleSize = 100 + fraction * 80;
  } else if (step.label === 'Hold') {
    circleSize = 180;
  } else {
    // Exhale
    circleSize = 180 - fraction * 80;
  }
  if (!active) circleSize = 120;

  return (
    <div style={{ textAlign: 'center', padding: '1rem 0' }}>

      {/* Animated circle */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '220px', marginBottom: '0.5rem',
      }}>
        <div style={{
          width: `${circleSize}px`,
          height: `${circleSize}px`,
          borderRadius: '50%',
          background: `radial-gradient(circle at 40% 35%, ${step.color}40, ${step.color}08)`,
          border: `3px solid ${step.color}`,
          boxShadow: `0 0 ${active ? 36 : 16}px ${step.color}55`,
          transition: 'width 0.9s ease-in-out, height 0.9s ease-in-out, box-shadow 0.4s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
        }}>
          <span style={{
            fontSize: active ? '2rem' : '1.4rem',
            fontWeight: 800, color: step.color,
            fontFamily: 'Syne, sans-serif', lineHeight: 1,
            transition: 'font-size 0.3s',
          }}>
            {active ? countdown : '🌬️'}
          </span>
          {active && (
            <span style={{
              fontSize: '0.65rem', color: step.color, opacity: 0.8,
              fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2,
            }}>
              sec
            </span>
          )}
        </div>
      </div>

      {/* Step label */}
      <div style={{ marginBottom: '0.3rem' }}>
        <span style={{
          fontSize: '1.5rem', fontFamily: 'Syne, sans-serif', fontWeight: 800,
          color: step.color, letterSpacing: '-0.03em',
        }}>
          {active ? step.label : 'Ready to Breathe'}
        </span>
      </div>

      {/* Description */}
      <div style={{
        fontSize: '0.83rem', color: pal.textMuted, marginBottom: '1.8rem',
        minHeight: '1.3rem', lineHeight: 1.5,
      }}>
        {active ? step.description : 'A calming 4-4-4 breathing pattern to reduce tension.'}
      </div>

      {/* Start / Stop button */}
      <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center' }}>
        {!active ? (
          <button onClick={start} style={{
            padding: '0.75rem 2.2rem', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg,#1A6BFF,#38BFFF)', color: '#fff',
            fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(26,107,255,.35)',
          }}>
            ▶ Start
          </button>
        ) : (
          <button onClick={stop} style={{
            padding: '0.75rem 2.2rem', borderRadius: '10px',
            border: '1.5px solid rgba(255,82,114,.4)',
            background: 'rgba(255,82,114,.1)', color: '#FF5272',
            fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
          }}>
            ■ Stop
          </button>
        )}
      </div>

      {/* Step dots indicator */}
      {active && (
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.2rem',
        }}>
          {STEPS.map((s, i) => (
            <div key={s.label} style={{
              width: i === stepIdx ? '24px' : '8px', height: '8px',
              borderRadius: '4px',
              background: i === stepIdx ? s.color : pal.cardBorder,
              transition: 'width 0.3s ease, background 0.3s',
            }} />
          ))}
        </div>
      )}

      {/* Cycle legend */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: '1.2rem',
        marginTop: '1.4rem', flexWrap: 'wrap',
      }}>
        {STEPS.map(s => (
          <div key={s.label} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            fontSize: '0.74rem', color: pal.textDim,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0,
            }} />
            {s.label} · {s.duration}s
          </div>
        ))}
      </div>
    </div>
  );
}
