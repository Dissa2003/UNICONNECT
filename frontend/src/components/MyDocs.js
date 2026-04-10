/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function fmtDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function MyDocs({ pal, isDk }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [fileInput, setFileInput] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const card = isDk ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,0.9)';
  const border = isDk ? 'rgba(255,255,255,.09)' : 'rgba(26,107,255,.13)';
  const text = isDk ? '#FFFFFF' : '#0d1b3e';
  const muted = isDk ? 'rgba(255,255,255,.5)' : '#5a6a8a';
  const inputBg = isDk ? 'rgba(255,255,255,.06)' : '#f0f4ff';
  const inputBorder = isDk ? 'rgba(255,255,255,.1)' : 'rgba(26,107,255,.2)';

  const fetchDocs = useCallback(async () => {
    try {
      const { data } = await api.get('/docs');
      setDocs(data);
    } catch (_) { /* no-op */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleUpload = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') { setError('Only PDF files are supported.'); return; }
    if (file.size > 20 * 1024 * 1024) { setError('File must be under 20 MB.'); return; }
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', uploadTitle.trim() || file.name.replace(/\.pdf$/i, ''));
      const { data } = await api.post('/docs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocs(prev => [data, ...prev]);
      setUploadTitle('');
      setFileInput(null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) handleUpload(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const deleteDoc = async (id) => {
    setDeletingId(id);
    try {
      await api.delete(`/docs/${id}`);
      setDocs(prev => prev.filter(d => d._id !== id));
    } catch (_) { /* no-op */ }
    setDeletingId(null);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.03em', color: text, margin: '0 0 0.3rem' }}>📂 MyDocs</h2>
        <p style={{ color: muted, fontSize: '0.82rem', margin: 0 }}>Store and access your PDF documents from anywhere</p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragOver ? '#38BFFF' : inputBorder}`,
          borderRadius: '14px', padding: '2rem', textAlign: 'center',
          background: dragOver ? 'rgba(56,191,255,.07)' : inputBg,
          marginBottom: '1.5rem', transition: 'all 0.2s', cursor: 'pointer',
        }}
        onClick={() => document.getElementById('pdf-file-input').click()}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '0.6rem' }}>📄</div>
        <div style={{ fontWeight: 700, color: text, marginBottom: '0.3rem' }}>
          {uploading ? 'Uploading…' : 'Drop a PDF here or click to browse'}
        </div>
        <div style={{ fontSize: '0.78rem', color: muted }}>PDF only · Max 20 MB</div>
        {error && <div style={{ marginTop: '0.8rem', color: '#FF5272', fontSize: '0.82rem', fontWeight: 600 }}>{error}</div>}
        <input id="pdf-file-input" type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFileChange} />
      </div>

      {/* Optional custom title */}
      <div style={{ display: 'flex', gap: '0.7rem', marginBottom: '1.8rem', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Custom title (optional — defaults to filename)"
          value={uploadTitle}
          onChange={e => setUploadTitle(e.target.value)}
          maxLength={200}
          style={{ flex: 1, padding: '0.55rem 0.8rem', borderRadius: '8px', border: `1px solid ${inputBorder}`, background: inputBg, color: text, fontSize: '0.85rem', outline: 'none' }}
        />
        <button
          onClick={() => document.getElementById('pdf-file-input').click()}
          disabled={uploading}
          style={{ padding: '0.55rem 1.2rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#1A6BFF,#38BFFF)', color: '#fff', fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer', fontSize: '0.85rem', opacity: uploading ? 0.7 : 1, whiteSpace: 'nowrap' }}
        >
          {uploading ? 'Uploading…' : '⬆ Upload PDF'}
        </button>
      </div>

      {/* Documents list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: muted }}>Loading documents…</div>
      ) : docs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: muted }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗂</div>
          <div style={{ fontWeight: 600, marginBottom: '0.4rem', color: text }}>No documents yet</div>
          <div style={{ fontSize: '0.85rem' }}>Upload your first PDF above</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {docs.map(doc => (
            <div key={doc._id} style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', padding: '1rem 1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '2rem', flexShrink: 0 }}>📑</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: text, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
                <div style={{ fontSize: '0.74rem', color: muted, marginTop: '0.2rem' }}>
                  {fmtDate(doc.createdAt)}{doc.size ? ` · ${fmtSize(doc.size)}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <a href={doc.fileUrl} target="_blank" rel="noreferrer" style={{ padding: '0.4rem 0.9rem', borderRadius: '8px', border: `1px solid ${border}`, background: 'rgba(56,191,255,.12)', color: '#38BFFF', fontWeight: 700, fontSize: '0.78rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  👁 View
                </a>
                <button
                  onClick={() => deleteDoc(doc._id)}
                  disabled={deletingId === doc._id}
                  style={{ padding: '0.4rem 0.9rem', borderRadius: '8px', border: '1px solid rgba(255,82,114,.3)', background: 'rgba(255,82,114,.1)', color: '#FF5272', fontWeight: 700, fontSize: '0.78rem', cursor: deletingId === doc._id ? 'not-allowed' : 'pointer', opacity: deletingId === doc._id ? 0.6 : 1 }}
                >
                  🗑 Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
