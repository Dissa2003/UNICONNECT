/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const COLORS = [
  '#38BFFF', '#00E5C3', '#FFD166', '#FF6B6B',
  '#B388FF', '#69FF97', '#FF9A3C', '#F06292',
];

function fmt(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function toLocalInput(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TodoList({ pal, isDk }) {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'done'
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', color: COLORS[0], dueDate: '', reminderAt: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const p = pal || {};
  const card = isDk ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,0.9)';
  const border = isDk ? 'rgba(255,255,255,.09)' : 'rgba(26,107,255,.13)';
  const text = isDk ? '#FFFFFF' : '#0d1b3e';
  const muted = isDk ? 'rgba(255,255,255,.5)' : '#5a6a8a';
  const inputBg = isDk ? 'rgba(255,255,255,.06)' : '#f0f4ff';
  const inputBorder = isDk ? 'rgba(255,255,255,.1)' : 'rgba(26,107,255,.2)';

  const fetchTodos = useCallback(async () => {
    try {
      const { data } = await api.get('/todos');
      setTodos(data);
    } catch (_) {
      /* no-op */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTodos(); }, [fetchTodos]);

  const openAdd = () => {
    setEditId(null);
    setForm({ title: '', description: '', color: COLORS[0], dueDate: '', reminderAt: '' });
    setShowForm(true);
  };

  const openEdit = (todo) => {
    setEditId(todo._id);
    setForm({
      title: todo.title,
      description: todo.description || '',
      color: todo.color || COLORS[0],
      dueDate: toLocalInput(todo.dueDate),
      reminderAt: toLocalInput(todo.reminderAt),
    });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description,
        color: form.color,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        reminderAt: form.reminderAt ? new Date(form.reminderAt).toISOString() : null,
      };
      if (editId) {
        const { data } = await api.put(`/todos/${editId}`, payload);
        setTodos(prev => prev.map(t => t._id === editId ? data : t));
      } else {
        const { data } = await api.post('/todos', payload);
        setTodos(prev => [data, ...prev]);
      }
      closeForm();
    } catch (_) {
      /* no-op */
    } finally {
      setSaving(false);
    }
  };

  const toggleComplete = async (todo) => {
    try {
      const { data } = await api.put(`/todos/${todo._id}`, { completed: !todo.completed });
      setTodos(prev => prev.map(t => t._id === todo._id ? data : t));
    } catch (_) { /* no-op */ }
  };

  const deleteTodo = async (id) => {
    setDeletingId(id);
    try {
      await api.delete(`/todos/${id}`);
      setTodos(prev => prev.filter(t => t._id !== id));
    } catch (_) { /* no-op */ }
    setDeletingId(null);
  };

  const filtered = todos.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'done') return t.completed;
    return true;
  });

  const inputStyle = {
    width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px',
    border: `1px solid ${inputBorder}`, background: inputBg,
    color: text, fontSize: '0.88rem', outline: 'none',
  };
  const labelStyle = { fontSize: '0.75rem', fontWeight: 600, color: muted, marginBottom: '0.3rem', display: 'block' };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.8rem' }}>
        <div>
          <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.03em', color: text, margin: 0 }}>📝 To-Do & Sticky Notes</h2>
          <p style={{ color: muted, fontSize: '0.82rem', margin: '0.3rem 0 0' }}>Manage tasks, set reminders, stay on track</p>
        </div>
        <button onClick={openAdd} style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#1A6BFF,#38BFFF)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
          + New Task
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['all', 'active', 'done'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '0.4rem 1rem', borderRadius: '99px', border: `1px solid ${filter === f ? '#1A6BFF' : border}`, background: filter === f ? 'rgba(26,107,255,.15)' : 'transparent', color: filter === f ? '#38BFFF' : muted, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
            {f === 'all' ? `All (${todos.length})` : f === 'active' ? `Active (${todos.filter(t => !t.completed).length})` : `Done (${todos.filter(t => t.completed).length})`}
          </button>
        ))}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(6px)', zIndex: 300, display: 'grid', placeItems: 'center', padding: '1rem' }}>
          <div style={{ background: isDk ? '#12182B' : '#fff', border: `1px solid ${border}`, borderRadius: '16px', padding: '1.8rem', width: '100%', maxWidth: '480px', boxShadow: '0 24px 60px rgba(0,0,0,.35)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <h3 style={{ margin: 0, fontFamily: 'Syne', fontWeight: 800, color: text, fontSize: '1.1rem' }}>{editId ? 'Edit Task' : 'New Task'}</h3>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', color: muted, fontSize: '1.3rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '0.9rem' }}>
                <label style={labelStyle}>Title *</label>
                <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="What needs to be done?" maxLength={200} required />
              </div>
              <div style={{ marginBottom: '0.9rem' }}>
                <label style={labelStyle}>Notes</label>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '72px' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Add details..." maxLength={1000} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '0.9rem' }}>
                <div>
                  <label style={labelStyle}>Due Date</label>
                  <input type="datetime-local" style={inputStyle} value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Reminder</label>
                  <input type="datetime-local" style={inputStyle} value={form.reminderAt} onChange={e => setForm(f => ({ ...f, reminderAt: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={labelStyle}>Note Color</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <div key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, cursor: 'pointer', border: form.color === c ? `3px solid ${text}` : '3px solid transparent', transition: 'border 0.15s' }} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={closeForm} style={{ padding: '0.55rem 1.1rem', borderRadius: '8px', border: `1px solid ${border}`, background: 'transparent', color: muted, fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '0.55rem 1.3rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#1A6BFF,#38BFFF)', color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.85rem', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving…' : editId ? 'Update' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Todo cards grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: muted }}>Loading tasks…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: muted }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <div style={{ fontWeight: 600, marginBottom: '0.4rem', color: text }}>No tasks yet</div>
          <div style={{ fontSize: '0.85rem' }}>Click "+ New Task" to get started</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {filtered.map(todo => (
            <div key={todo._id} style={{ background: card, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.1rem 1.2rem', position: 'relative', borderTop: `4px solid ${todo.color || '#38BFFF'}`, opacity: todo.completed ? 0.65 : 1, transition: 'opacity 0.2s' }}>
              {/* Color accent dot */}
              <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.4rem' }}>
                <button onClick={() => openEdit(todo)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, fontSize: '0.9rem', padding: '2px 4px' }} title="Edit">✏️</button>
                <button onClick={() => deleteTodo(todo._id)} disabled={deletingId === todo._id} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF5272', fontSize: '0.9rem', padding: '2px 4px', opacity: deletingId === todo._id ? 0.5 : 1 }} title="Delete">🗑</button>
              </div>

              {/* Checkbox + title */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem', paddingRight: '3rem' }}>
                <input type="checkbox" checked={todo.completed} onChange={() => toggleComplete(todo)} style={{ marginTop: '3px', accentColor: todo.color || '#38BFFF', cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: '0.92rem', color: text, textDecoration: todo.completed ? 'line-through' : 'none', lineHeight: 1.3 }}>{todo.title}</span>
              </div>

              {todo.description && (
                <p style={{ margin: '0.6rem 0 0', fontSize: '0.8rem', color: muted, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{todo.description}</p>
              )}

              <div style={{ marginTop: '0.8rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {todo.dueDate && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '99px', background: 'rgba(255,209,102,.15)', color: '#FFD166', border: '1px solid rgba(255,209,102,.25)' }}>
                    📅 {fmt(todo.dueDate)}
                  </span>
                )}
                {todo.reminderAt && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '99px', background: todo.reminderSent ? 'rgba(0,229,195,.1)' : 'rgba(179,136,255,.15)', color: todo.reminderSent ? '#00E5C3' : '#B388FF', border: `1px solid ${todo.reminderSent ? 'rgba(0,229,195,.25)' : 'rgba(179,136,255,.25)'}` }}>
                    🔔 {todo.reminderSent ? 'Sent' : fmt(todo.reminderAt)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
