/**
 * StressHistoryChart Component
 * 
 * This component visualizes the user's stress history using Recharts.
 * It provides a Line chart for chronological scores, a List view for details,
 * and a Pie chart for stress level distribution.
 * 
 * Props:
 * - records: Array of stress history records.
 * - pal: Color palette for theming.
 * - onClearHistory: Callback function to clear the history.
 */
import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const LEVEL_COLOR = { Low: '#00E5C3', Medium: '#F59E0B', High: '#FF5272' };
const FILTER_OPTIONS = [
  { label: 'Last 7 days',  days: 7  },
  { label: 'Last 30 days', days: 30 },
  { label: 'All time',     days: 0  },
];

// Returns ISO date string N days ago
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ----------- Custom Tooltip for Line Chart -----------
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const { score, level } = payload[0].payload;
  return (
    <div style={{
      background: '#0D1730', border: `1px solid ${LEVEL_COLOR[level] || '#1A6BFF'}33`,
      borderRadius: 10, padding: '0.7rem 1rem', fontSize: '0.82rem', lineHeight: 1.6,
    }}>
      <div style={{ color: '#fff', fontWeight: 700, marginBottom: 2 }}>{label}</div>
      <div style={{ color: LEVEL_COLOR[level] || '#38BFFF' }}>Score: <strong>{score}</strong></div>
      <div style={{ color: LEVEL_COLOR[level] || '#38BFFF' }}>Level: <strong>{level}</strong></div>
    </div>
  );
}

// ----------- History Row -----------
function HistoryRow({ record, isHighest, pal }) {
  const color  = LEVEL_COLOR[record.level] || '#38BFFF';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '1rem',
      padding: '0.75rem 1rem', borderRadius: 10,
      background: isHighest ? `${color}0D` : pal.surfaceBg,
      border: `1px solid ${isHighest ? color + '33' : pal.cardBorder}`,
      marginBottom: '0.5rem', transition: 'all 0.2s',
    }}>
      {/* Date */}
      <div style={{ minWidth: 90, fontSize: '0.8rem', color: pal.textDim, fontWeight: 500 }}>
        {record.date}
      </div>

      {/* Score bar */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{
          height: 6, borderRadius: 3, background: pal.progressBg, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: `${record.score}%`, borderRadius: 3,
            background: `linear-gradient(90deg, ${color}, ${color}99)`,
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      {/* Score number */}
      <div style={{ minWidth: 36, textAlign: 'right', fontSize: '0.88rem', fontWeight: 700, color }}>
        {record.score}
      </div>

      {/* Level badge */}
      <div style={{
        padding: '0.2rem 0.6rem', borderRadius: 6,
        fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em',
        background: `${color}18`, color, border: `1px solid ${color}33`,
      }}>
        {record.level}
      </div>

      {isHighest && (
        <span title="Highest stress day" style={{ fontSize: '0.85rem' }}>⚠️</span>
      )}
    </div>
  );
}

// ----------- Main Component -----------
export default function StressHistoryChart({ records = [], pal, onClearHistory }) {
  const [filter, setFilter]     = useState(7);
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'list' | 'pie'
  const [confirmClear, setConfirmClear] = useState(false);

  // Apply time filter
  const filtered = useMemo(() => {
    if (filter === 0) return [...records];
    const cutoff = daysAgo(filter);
    return records.filter(r => r.date >= cutoff);
  }, [records, filter]);

  // Chart data (oldest → newest)
  const chartData = useMemo(() => [...filtered].reverse(), [filtered]);

  // Calculate average score across the currently filtered records
  const avgScore = useMemo(() => {
    if (!filtered.length) return 0;
    return Math.round(filtered.reduce((s, r) => s + r.score, 0) / filtered.length);
  }, [filtered]);

  // Find the record with the highest stress score
  const highestRecord = useMemo(() => {
    if (!filtered.length) return null;
    return filtered.reduce((max, r) => r.score > max.score ? r : max, filtered[0]);
  }, [filtered]);

  const trend = useMemo(() => {
    if (filtered.length < 2) return null;
    const recent = filtered.slice(0, Math.min(3, filtered.length));
    const older  = filtered.slice(Math.min(3, filtered.length));
    if (!older.length) return null;
    const recentAvg = recent.reduce((s, r) => s + r.score, 0) / recent.length;
    const olderAvg  = older.reduce((s,  r) => s + r.score, 0) / older.length;
    if (recentAvg < olderAvg - 5)  return { text: '📉 Your stress has decreased recently. Keep it up!',  color: '#00E5C3' };
    if (recentAvg > olderAvg + 5)  return { text: '📈 Your stress has increased recently. Try a relaxation exercise.', color: '#FF5272' };
    return { text: '➡️ Your stress has been relatively stable lately.', color: '#F59E0B' };
  }, [filtered]);

  // Pie chart data
  const pieData = useMemo(() => {
    const counts = { Low: 0, Medium: 0, High: 0 };
    filtered.forEach(r => { counts[r.level] = (counts[r.level] || 0) + 1; });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [filtered]);

  if (!records.length) {
    return (
      <div style={{
        textAlign: 'center', padding: '2.5rem 1rem',
        color: pal.textDim, fontSize: '0.87rem', lineHeight: 1.7,
      }}>
        <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>📊</div>
        No stress records yet. Complete a wellness assessment to start tracking!
      </div>
    );
  }

  const tabStyle = (tab) => ({
    padding: '0.45rem 1.1rem', borderRadius: 8,
    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
    background: activeTab === tab ? 'rgba(26,107,255,.15)' : 'transparent',
    border: activeTab === tab ? '1.5px solid #1A6BFF' : `1.5px solid ${pal.cardBorder}`,
    color: activeTab === tab ? '#38BFFF' : pal.textMuted,
    transition: 'all 0.15s',
  });

  return (
    <div>
      {/* ── Stats row ── */}
      <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '1.4rem' }}>
        {[
          { label: 'Records', value: records.length, color: '#38BFFF' },
          { label: 'Avg Score', value: `${avgScore}/100`, color: LEVEL_COLOR[avgScore <= 30 ? 'Low' : avgScore <= 70 ? 'Medium' : 'High'] },
          { label: 'Latest', value: records[0]?.level || '—', color: LEVEL_COLOR[records[0]?.level] || pal.textDim },
        ].map(stat => (
          <div key={stat.label} style={{
            flex: '1 1 90px', padding: '0.8rem 1rem', borderRadius: 10,
            background: pal.inputBg, border: `1px solid ${pal.cardBorder}`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: stat.color, fontFamily: 'Syne, sans-serif' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '0.68rem', color: pal.textDim, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>
              {stat.label}
            </div>
          </div>
        ))}
        {highestRecord && (
          <div style={{
            flex: '1 1 90px', padding: '0.8rem 1rem', borderRadius: 10,
            background: 'rgba(255,82,114,.06)', border: '1px solid rgba(255,82,114,.2)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FF5272', fontFamily: 'Syne, sans-serif' }}>
              {highestRecord.score}
            </div>
            <div style={{ fontSize: '0.68rem', color: pal.textDim, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>
              Peak Score
            </div>
          </div>
        )}
      </div>

      {/* ── Progress insight ── */}
      {trend && (
        <div style={{
          padding: '0.7rem 1rem', borderRadius: 10, marginBottom: '1.2rem',
          background: `${trend.color}10`, border: `1px solid ${trend.color}30`,
          fontSize: '0.83rem', color: trend.color, fontWeight: 500,
        }}>
          {trend.text}
        </div>
      )}

      {/* ── Controls row ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1rem' }}>
        {/* Filter pill group */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {FILTER_OPTIONS.map(opt => (
            <button key={opt.days} onClick={() => setFilter(opt.days)} style={{
              padding: '0.35rem 0.9rem', borderRadius: 7,
              fontSize: '0.77rem', fontWeight: 600, cursor: 'pointer',
              background: filter === opt.days ? 'rgba(26,107,255,.14)' : pal.inputBg,
              border: filter === opt.days ? '1.5px solid #1A6BFF' : `1.5px solid ${pal.inputBorder}`,
              color: filter === opt.days ? '#38BFFF' : pal.textMuted,
              transition: 'all 0.15s',
            }}>{opt.label}</button>
          ))}
        </div>

        {/* View tabs */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button style={tabStyle('chart')} onClick={() => setActiveTab('chart')}>📈 Line</button>
          <button style={tabStyle('list')}  onClick={() => setActiveTab('list')}>📋 List</button>
          <button style={tabStyle('pie')}   onClick={() => setActiveTab('pie')}>🥧 Pie</button>
        </div>
      </div>

      {/* ── Empty filtered result ── */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: pal.textDim, fontSize: '0.85rem' }}>
          No records in this time range.
        </div>
      )}

      {/* ── Line Chart ── */}
      {activeTab === 'chart' && filtered.length > 0 && (
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={pal.cardBorder} />
              <XAxis
                dataKey="date"
                tick={{ fill: pal.textDim, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: pal.cardBorder }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: pal.textDim, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                ticks={[0, 30, 70, 100]}
              />
              {/* Reference zones */}
              <CartesianGrid
                horizontal={false}
                vertical={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#1A6BFF"
                strokeWidth={2.5}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  return (
                    <circle
                      key={`dot-${payload.date}`}
                      cx={cx} cy={cy} r={5}
                      fill={LEVEL_COLOR[payload.level] || '#1A6BFF'}
                      stroke="#0D1730" strokeWidth={2}
                    />
                  );
                }}
                activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── History List ── */}
      {activeTab === 'list' && filtered.length > 0 && (
        <div style={{ maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
          {/* Header */}
          <div style={{ display: 'flex', gap: '1rem', padding: '0 1rem 0.4rem', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: pal.textDim }}>
            <span style={{ minWidth: 90 }}>Date</span>
            <span style={{ flex: 1 }}>Score</span>
            <span style={{ minWidth: 36, textAlign: 'right' }}>#</span>
            <span style={{ minWidth: 60 }}>Level</span>
          </div>
          {filtered.map((r, i) => (
            <HistoryRow
              key={`${r.date}-${i}`}
              record={r}
              isHighest={highestRecord && r.date === highestRecord.date && r.score === highestRecord.score}
              pal={pal}
            />
          ))}
        </div>
      )}

      {/* ── Pie Chart ── */}
      {activeTab === 'pie' && pieData.length > 0 && (
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
                labelLine={false}
                label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={LEVEL_COLOR[entry.name] || '#1A6BFF'} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`${value} session${value > 1 ? 's' : ''}`, name]}
                contentStyle={{ background: '#0D1730', border: '1px solid #ffffff18', borderRadius: 8, fontSize: '0.82rem' }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.8rem', color: pal.textMuted }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Clear history ── */}
      {onClearHistory && (
        <div style={{ marginTop: '1.2rem', textAlign: 'right' }}>
          {!confirmClear ? (
            <button onClick={() => setConfirmClear(true)} style={{
              fontSize: '0.75rem', color: pal.textDim, background: 'none',
              border: 'none', cursor: 'pointer', textDecoration: 'underline',
            }}>
              Clear history
            </button>
          ) : (
            <span style={{ fontSize: '0.8rem', color: pal.textMuted }}>
              Are you sure?&nbsp;
              <button onClick={() => { onClearHistory(); setConfirmClear(false); }} style={{
                color: '#FF5272', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700,
              }}>Yes, clear</button>
              &nbsp;/&nbsp;
              <button onClick={() => setConfirmClear(false)} style={{
                color: pal.textMuted, background: 'none', border: 'none', cursor: 'pointer',
              }}>Cancel</button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
