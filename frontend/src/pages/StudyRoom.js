/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../services/api';
import { useTheme } from '../ThemeContext';
import VoiceActionCenter from '../components/VoiceActionCenter';

const SOCKET_URL = 'http://localhost:5000';

export default function StudyRoom({ initialGroupId = '', hideReferenceFlow = false, layoutOffset = 72, showCustomCursor = true, theme = 'student' }) {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [members, setMembers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [botTyping, setBotTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [membersOpen, setMembersOpen] = useState(false);
  const isTutorTheme = theme === 'tutor';
  const { theme: globalTheme } = useTheme();
  const isLight = isTutorTheme || globalTheme === 'light';
  const styles = isLight ? getTutorStyles(baseStyles) : baseStyles;
  const pal = {
    otherBubbleBg:       isLight ? 'rgba(0,0,0,.06)'        : 'rgba(255,255,255,.06)',
    otherBubbleBorder:   isLight ? 'rgba(0,0,0,.1)'          : 'rgba(255,255,255,.1)',
    arrowColor:          isLight ? 'rgba(0,0,0,.3)'           : 'rgba(255,255,255,.3)',
    groupInactiveBorder: isLight ? 'rgba(26,107,255,.12)'    : 'rgba(255,255,255,.08)',
    noGroupText:         isLight ? '#5f6f9a'                  : 'rgba(255,255,255,.45)',
  };

  // Reference Flow state
  const [refOpen, setRefOpen] = useState(false);
  const [refMessages, setRefMessages] = useState([]);
  const [refInput, setRefInput] = useState('');
  const [refLoading, setRefLoading] = useState(false);
  const [refPdf, setRefPdf] = useState(null); // { fileName, totalChunks, pages }
  const [refUploading, setRefUploading] = useState(false);
  const refFileInputRef = useRef(null);
  const refEndRef = useRef(null);

  // Sync body background with theme
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = isLight ? '#f0f4ff' : '#03121f';
    return () => { document.body.style.background = prev; };
  }, [isLight]);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const currentUserId = useRef(null);

  // Get current user id from JWT
  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/login'); return; }
      const payload = JSON.parse(atob(token.split('.')[1]));
      currentUserId.current = payload.id;
    } catch {
      navigate('/login');
    }
  }, []);

  // Connect socket
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => console.log('🔌 Socket connected'));
    socket.on('connect_error', (err) => console.error('Socket error:', err.message));

    socket.on('new-message', (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on('user-typing', ({ userName }) => {
      setTypingUsers((prev) => (prev.includes(userName) ? prev : [...prev, userName]));
    });

    socket.on('user-stop-typing', ({ userId }) => {
      setTypingUsers((prev) => prev.filter((u) => u !== userId));
    });

    socket.on('bot-typing', () => setBotTyping(true));
    socket.on('bot-stop-typing', () => setBotTyping(false));

    // Reference Flow private replies
    socket.on('ref-reply', ({ answer }) => {
      setRefLoading(false);
      setRefMessages((prev) => [...prev, { role: 'bot', content: answer }]);
    });
    socket.on('ref-typing', () => setRefLoading(true));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Fetch groups on mount
  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (!initialGroupId || groups.length === 0) return;
    const target = groups.find((g) => String(g._id) === String(initialGroupId));
    if (target && String(activeGroup) !== String(target._id)) {
      selectGroup(target);
    }
  }, [initialGroupId, groups, activeGroup]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Scroll ref chat
  useEffect(() => {
    refEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [refMessages, refLoading]);

  // Check if user has a Reference Flow PDF loaded
  useEffect(() => {
    if (hideReferenceFlow) return;
    api.get('/studyroom/ref-info')
      .then((res) => { if (res.data?.loaded) setRefPdf(res.data); })
      .catch(() => {});
  }, [hideReferenceFlow]);

  // Custom cursor movement
  useEffect(() => {
    const cO = document.getElementById('cO');
    const cI = document.getElementById('cI');
    if (!cO || !cI) return;
    const move = (e) => {
      cI.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
      cO.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
    };
    document.addEventListener('mousemove', move);

    const enter = () => { const ring = cO.querySelector('.cur-ring'); if (ring) ring.style.cssText += 'width:52px;height:52px;opacity:.35;'; };
    const leave = () => { const ring = cO.querySelector('.cur-ring'); if (ring) ring.style.cssText += 'width:34px;height:34px;opacity:.65;'; };
    const hoverEls = document.querySelectorAll('a,button,input,.pill,.role-btn,.remember');
    hoverEls.forEach(el => {
      el.addEventListener('mouseenter', enter);
      el.addEventListener('mouseleave', leave);
    });

    return () => {
      document.removeEventListener('mousemove', move);
      hoverEls.forEach(el => {
        el.removeEventListener('mouseenter', enter);
        el.removeEventListener('mouseleave', leave);
      });
    };
  }, [loading, activeGroup, membersOpen]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await api.get('/studyroom/my-groups');
      setGroups(res.data || []);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectGroup = useCallback(async (group) => {
    setActiveGroup(group._id);
    setGroupName(group.name);
    setMessages([]);
    setTypingUsers([]);

    try {
      const [msgRes, memRes] = await Promise.all([
        api.get(`/studyroom/${group._id}/messages`),
        api.get(`/studyroom/${group._id}/members`),
      ]);
      setMessages(msgRes.data || []);
      setMembers(memRes.data?.members || []);
      if (memRes.data?.name) setGroupName(memRes.data.name);
    } catch (err) {
      console.error('Failed to load group data:', err);
    }
  }, []);

  const sendMessage = () => {
    if (!input.trim() || !activeGroup) return;

    if (socketRef.current?.connected) {
      socketRef.current.emit('send-message', { groupId: activeGroup, content: input.trim() });
    } else {
      // REST fallback
      api.post(`/studyroom/${activeGroup}/messages`, { content: input.trim() })
        .then((res) => {
          setMessages((prev) => {
            if (prev.some((m) => m._id === res.data._id)) return prev;
            return [...prev, res.data];
          });
        })
        .catch((err) => console.error('send error:', err));
    }

    setInput('');
    if (socketRef.current) {
      socketRef.current.emit('stop-typing', { groupId: activeGroup });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!activeGroup || !socketRef.current) return;

    socketRef.current.emit('typing', { groupId: activeGroup });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socketRef.current?.emit('stop-typing', { groupId: activeGroup });
    }, 2000);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeGroup) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post(`/studyroom/${activeGroup}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed. Max 10 MB, PDF/images/docs only.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getFileIcon = (name) => {
    if (!name) return '📎';
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) return '🖼️';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['ppt', 'pptx'].includes(ext)) return '📊';
    return '📎';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ── Reference Flow helpers ──
  const handleRefUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRefUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/studyroom/ref-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRefPdf(res.data);
      setRefMessages([{ role: 'bot', content: `📄 "${res.data.fileName}" loaded (${res.data.pages} pages, ${res.data.totalChunks} chunks). Ask me anything about it!` }]);
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed. Only PDF files allowed.');
    } finally {
      setRefUploading(false);
      if (refFileInputRef.current) refFileInputRef.current.value = '';
    }
  };

  const handleRefClear = async () => {
    try {
      await api.delete('/studyroom/ref-clear');
      setRefPdf(null);
      setRefMessages([]);
    } catch {}
  };

  const sendRefQuery = () => {
    if (!refInput.trim() || !socketRef.current) return;
    const question = refInput.trim();
    setRefMessages((prev) => [...prev, { role: 'user', content: question }]);
    setRefInput('');
    setRefLoading(true);
    socketRef.current.emit('ref-query', { question });
  };

  const handleRefKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendRefQuery();
    }
  };

  // Group messages by date for date separators
  const renderMessages = () => {
    let lastDate = '';
    return messages.map((msg) => {
      const dateStr = formatDate(msg.createdAt);
      const showDate = dateStr !== lastDate;
      lastDate = dateStr;
      const isMe = String(msg.sender?._id || msg.sender) === currentUserId.current;
      const isBot = msg.isBot || String(msg.sender?._id) === 'bot';

      return (
        <React.Fragment key={msg._id}>
          {showDate && (
            <div style={styles.dateSeparator}>
              <span style={styles.dateBadge}>{dateStr}</span>
            </div>
          )}
          <div style={{ ...styles.messageBubbleRow, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
            {isBot && <div style={styles.botAvatar}>🤖</div>}
            <div style={{
              ...styles.messageBubble,
              background: isBot ? 'rgba(138,80,255,.12)' : isMe ? 'rgba(26,107,255,.18)' : pal.otherBubbleBg,
              borderColor: isBot ? 'rgba(138,80,255,.3)' : isMe ? 'rgba(26,107,255,.3)' : pal.otherBubbleBorder,
            }}>
              {isBot ? (
                <div style={styles.botSenderName}>@bot</div>
              ) : !isMe ? (
                <div style={styles.senderName}>{msg.sender?.name || 'User'}</div>
              ) : null}
              {msg.type === 'file' ? (
                <a
                  href={`${SOCKET_URL}${msg.fileUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.fileLink}
                >
                  <span style={{ fontSize: '1.5rem' }}>{getFileIcon(msg.fileName)}</span>
                  <div>
                    <div style={styles.fileName}>{msg.fileName}</div>
                    <div style={styles.fileSize}>{formatFileSize(msg.fileSize)}</div>
                  </div>
                </a>
              ) : (
                <div style={styles.messageText}>{msg.content}</div>
              )}
              <div style={styles.messageTime}>{formatTime(msg.createdAt)}</div>
            </div>
          </div>
        </React.Fragment>
      );
    });
  };

  // ────────── RENDER ──────────
  const containerStyle = {
    ...styles.container,
    height: `calc(100vh - ${layoutOffset}px)`,
    cursor: showCustomCursor ? 'none' : 'default',
  };

  return (
    <div style={containerStyle}>
      {/* Custom cursor */}
      {showCustomCursor && <div id="cO" style={styles.cursorOuter}><div className="cur-ring" style={styles.curRing} /></div>}
      {showCustomCursor && <div id="cI" style={styles.cursorInner}><div style={styles.curDot} /></div>}

      {/* Sidebar – group list */}
      <div style={{ ...styles.sidebar, transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.sidebarTitle}>📚 Study Rooms</h2>
        </div>

        {!hideReferenceFlow && (
          <button
            type="button"
            onClick={() => setRefOpen(!refOpen)}
            style={{
              ...styles.refFlowBtn,
              background: refOpen ? 'rgba(138,80,255,.15)' : 'rgba(138,80,255,.06)',
              borderColor: refOpen ? 'rgba(138,80,255,.4)' : 'rgba(138,80,255,.15)',
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>🔮</span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={styles.refFlowTitle}>Reference Flow</div>
              <div style={styles.refFlowSub}>
                {refPdf ? `📄 ${refPdf.fileName}` : 'AI Chat & PDF Assistant'}
              </div>
            </div>
            <span style={{ fontSize: '0.7rem', color: pal.arrowColor }}>
              {refOpen ? '▲' : '▼'}
            </span>
          </button>
        )}

        {loading ? (
          <div style={styles.emptyState}>Loading...</div>
        ) : groups.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
            No study rooms yet.<br />
            Form a group from the Matching section to get started.
          </div>
        ) : (
          <div style={styles.groupList}>
            {groups.map((g) => (
              <button
                type="button"
                key={g._id}
                onClick={() => selectGroup(g)}
                style={{
                  ...styles.groupItem,
                  background: activeGroup === g._id ? 'rgba(26,107,255,.15)' : 'transparent',
                  borderColor: activeGroup === g._id ? 'rgba(26,107,255,.35)' : pal.groupInactiveBorder,
                }}
              >
                <div style={styles.groupIcon}>💬</div>
                <div style={styles.groupInfo}>
                  <div style={styles.groupItemName}>{g.name}</div>
                  <div style={styles.groupItemMembers}>
                    {g.members?.length || 0} members
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main chat area */}
      <div style={styles.chatArea}>
        {!hideReferenceFlow && refOpen ? (
          /* ── Reference Flow Panel ── */
          <div style={styles.refPanel}>
            <div style={styles.refHeader}>
              <span style={{ fontSize: '1.3rem' }}>🔮</span>
              <div>
                <div style={styles.refHeaderTitle}>Reference Flow</div>
                <div style={styles.refHeaderSub}>
                  {refPdf ? `📄 ${refPdf.fileName}` : 'Chat or upload a PDF to get started'}
                </div>
              </div>
              <button type="button" onClick={() => setRefOpen(false)} style={styles.refCloseBtn}>✕</button>
            </div>

            {/* Upload area */}
            <div style={styles.refUploadArea}>
              <input
                ref={refFileInputRef}
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={handleRefUpload}
              />
              {!refPdf ? (
                <button
                  type="button"
                  onClick={() => refFileInputRef.current?.click()}
                  disabled={refUploading}
                  style={styles.refUploadBtn}
                >
                  {refUploading ? '⏳ Processing...' : '📄 Upload PDF'}
                </button>
              ) : (
                <div style={styles.refPdfInfo}>
                  <span>📄 {refPdf.fileName}</span>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button type="button" onClick={() => refFileInputRef.current?.click()} disabled={refUploading} style={styles.refSmallBtn}>
                      {refUploading ? '⏳' : '🔄 Replace'}
                    </button>
                    <button type="button" onClick={handleRefClear} style={styles.refSmallBtn}>
                      🗑️ Clear
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Chat messages */}
            <div style={styles.refMessagesArea}>
              {refMessages.length === 0 && (
                <div style={styles.refEmptyState}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>🔮</div>
                  <div style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '0.4rem' }}>Reference Flow</div>
                  <div>{refPdf ? 'PDF loaded! Ask me anything about it.' : 'Chat with AI or upload a PDF to ask questions about it.'}</div>
                </div>
              )}
              {refMessages.map((msg, i) => (
                <div key={i} style={{
                  ...styles.refMsgRow,
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}>
                  {msg.role === 'bot' && <div style={styles.refBotAvatar}>🔮</div>}
                  <div style={{
                    ...styles.refMsgBubble,
                    background: msg.role === 'user' ? 'rgba(26,107,255,.18)' : 'rgba(138,80,255,.12)',
                    borderColor: msg.role === 'user' ? 'rgba(26,107,255,.3)' : 'rgba(138,80,255,.3)',
                  }}>
                    <div style={styles.refMsgText}>{msg.content}</div>
                  </div>
                </div>
              ))}
              {refLoading && (
                <div style={styles.refMsgRow}>
                  <div style={styles.refBotAvatar}>🔮</div>
                  <div style={{ ...styles.refMsgBubble, background: 'rgba(138,80,255,.08)', borderColor: 'rgba(138,80,255,.2)' }}>
                    <div style={styles.refTyping}>Thinking...</div>
                  </div>
                </div>
              )}
              <div ref={refEndRef} />
            </div>

            {/* Input */}
            <div style={styles.refInputBar}>
              <input
                type="text"
                placeholder={refPdf ? 'Ask about your PDF...' : 'Ask anything...'}
                value={refInput}
                onChange={(e) => setRefInput(e.target.value)}
                onKeyDown={handleRefKeyDown}
                disabled={refLoading}
                style={styles.refTextInput}
              />
              <button
                type="button"
                onClick={sendRefQuery}
                disabled={!refInput.trim() || refLoading}
                style={styles.refSendBtn}
              >
                ➤
              </button>
            </div>
          </div>
        ) : !activeGroup ? (
          <div style={styles.noChatSelected}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
            <h3 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '0.5rem' }}>Welcome to Study Room</h3>
            <p style={{ color: pal.noGroupText, maxWidth: 340 }}>
              Select a study group from the sidebar to start chatting, sharing notes, and collaborating with your peers.
            </p>
            <button type="button" onClick={() => setSidebarOpen(true)} style={styles.showSidebarBtn}>
              Show Groups
            </button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={styles.chatHeader}>
              <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)} style={styles.hamburger}>☰</button>
              <div>
                <div style={styles.chatTitle}>{groupName}</div>
                <div style={styles.chatSubtitle}>{members.length} members</div>
              </div>
              <button type="button" onClick={() => setMembersOpen(!membersOpen)} style={styles.membersToggle}>
                👥 Members
              </button>
            </div>

            {/* Voice Action Center — schedule + join voice calls for this chat lor */}
            {activeGroup && (() => {
              // Find the other member (not the current user) to pass as participantId lah
              // Decode current user email from JWT lor
              let currentUserEmail = '';
              try {
                const payload = JSON.parse(atob(localStorage.getItem('token').split('.')[1]));
                currentUserEmail = payload.email || '';
              } catch { /* ignore lah */ }
              return (
                <VoiceActionCenter
                  chatId={String(activeGroup)}
                  members={members}
                  currentUserId={String(currentUserId.current)}
                  currentUserEmail={currentUserEmail}
                />
              );
            })()}

            {/* Members panel */}
            {membersOpen && (
              <div style={styles.membersPanel}>
                <div style={styles.membersPanelTitle}>Group Members</div>
                {members.map((m) => (
                  <div key={m.user?._id || m.user} style={styles.memberRow}>
                    <div style={styles.memberAvatar}>
                      {(m.user?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={styles.memberName}>
                        {m.user?.name || 'User'}
                        {m.role === 'admin' && <span style={styles.adminBadge}>Admin</span>}
                      </div>
                      <div style={styles.memberEmail}>{m.user?.email || ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Messages */}
            <div style={styles.messagesContainer}>
              {messages.length === 0 ? (
                <div style={styles.emptyMessages}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
                  No messages yet. Say hello to your study group!
                </div>
              ) : (
                renderMessages()
              )}
              {typingUsers.length > 0 && (
                <div style={styles.typingIndicator}>
                  {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </div>
              )}
              {botTyping && (
                <div style={styles.botTypingIndicator}>
                  🤖 @bot is thinking...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div style={styles.inputBar}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.ppt,.pptx,.txt"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={styles.attachBtn}
                title="Upload file"
              >
                {uploading ? '⏳' : '📎'}
              </button>
              <input
                type="text"
                placeholder="Type a message..."
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                style={styles.textInput}
              />
              <button type="button" onClick={sendMessage} style={styles.sendBtn}>
                ➤
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ────────── STYLES ──────────

function getTutorStyles(base) {
  return {
    ...base,
    container: {
      ...base.container,
      background: '#f0f4ff',
      color: '#0d1b3e',
    },
    sidebar: {
      ...base.sidebar,
      borderRight: '1px solid rgba(26,107,255,.12)',
      background: '#ffffff',
    },
    sidebarHeader: {
      ...base.sidebarHeader,
      borderBottom: '1px solid rgba(26,107,255,.12)',
    },
    sidebarTitle: {
      ...base.sidebarTitle,
      color: '#0a1744',
    },
    emptyState: {
      ...base.emptyState,
      color: '#7a86a8',
    },
    groupItem: {
      ...base.groupItem,
      color: '#0d1b3e',
      border: '1px solid rgba(26,107,255,.12)',
      background: '#f7f9ff',
    },
    groupItemMembers: {
      ...base.groupItemMembers,
      color: '#7a86a8',
    },
    chatHeader: {
      ...base.chatHeader,
      borderBottom: '1px solid rgba(26,107,255,.12)',
      background: '#ffffff',
    },
    hamburger: {
      ...base.hamburger,
      color: '#0d1b3e',
    },
    chatTitle: {
      ...base.chatTitle,
      color: '#0a1744',
    },
    chatSubtitle: {
      ...base.chatSubtitle,
      color: '#7a86a8',
    },
    membersToggle: {
      ...base.membersToggle,
      background: 'rgba(26,107,255,.08)',
      border: '1px solid rgba(26,107,255,.18)',
      color: '#0d1b3e',
    },
    membersPanel: {
      ...base.membersPanel,
      borderBottom: '1px solid rgba(26,107,255,.12)',
      background: '#f7f9ff',
    },
    membersPanelTitle: {
      ...base.membersPanelTitle,
      color: '#7a86a8',
    },
    memberEmail: {
      ...base.memberEmail,
      color: '#7a86a8',
    },
    messagesContainer: {
      ...base.messagesContainer,
      background: '#f7f9ff',
    },
    emptyMessages: {
      ...base.emptyMessages,
      color: '#7a86a8',
    },
    dateBadge: {
      ...base.dateBadge,
      background: 'rgba(26,107,255,.08)',
      color: '#5f6f9a',
    },
    noChatSelected: {
      ...base.noChatSelected,
      color: '#5f6f9a',
    },
    textInput: {
      ...base.textInput,
      background: '#ffffff',
      border: '1px solid rgba(26,107,255,.12)',
      color: '#0d1b3e',
    },
    inputBar: {
      ...base.inputBar,
      borderTop: '1px solid rgba(26,107,255,.12)',
      background: '#ffffff',
    },
    attachBtn: {
      ...base.attachBtn,
      background: 'rgba(26,107,255,.08)',
      border: '1px solid rgba(26,107,255,.15)',
      color: '#0d1b3e',
    },
    refEmptyState: {
      ...base.refEmptyState,
      color: '#5f6f9a',
    },
    refHeaderSub: {
      ...base.refHeaderSub,
      color: '#5f6f9a',
    },
    refFlowSub: {
      ...base.refFlowSub,
      color: '#5f6f9a',
    },
  };
}

const baseStyles = {
  container: {
    display: 'flex',
    height: 'calc(100vh - 72px)',
    marginTop: 0,
    background: '#03121f',
    color: '#fff',
    fontFamily: "'DM Sans', sans-serif",
    overflow: 'hidden',
    cursor: 'none',
  },
  // Cursor
  cursorOuter: { position: 'fixed', top: 0, left: 0, pointerEvents: 'none', zIndex: 9999 },
  curRing: { width: 34, height: 34, borderRadius: '50%', border: '1.5px solid rgba(26,107,255,.55)', transition: 'all .25s', transform: 'translate(-50%,-50%)' },
  cursorInner: { position: 'fixed', top: 0, left: 0, pointerEvents: 'none', zIndex: 9999 },
  curDot: { width: 8, height: 8, borderRadius: '50%', background: '#1A6BFF', transform: 'translate(-50%,-50%)' },

  // Sidebar
  sidebar: {
    width: 300,
    minWidth: 300,
    borderRight: '1px solid rgba(255,255,255,.08)',
    background: 'rgba(255,255,255,.02)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.3s',
    overflow: 'hidden',
  },
  sidebarHeader: {
    padding: '1.2rem 1rem',
    borderBottom: '1px solid rgba(255,255,255,.08)',
  },
  sidebarTitle: {
    fontFamily: 'Syne',
    fontWeight: 800,
    fontSize: '1.1rem',
    letterSpacing: '-0.02em',
    margin: '0 0 0.6rem 0',
  },

  emptyState: {
    padding: '2rem 1.2rem',
    textAlign: 'center',
    color: 'rgba(255,255,255,.4)',
    fontSize: '0.85rem',
    lineHeight: 1.6,
  },
  groupList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0.5rem',
  },
  groupItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '0.7rem',
    padding: '0.75rem 0.8rem',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,.08)',
    background: 'transparent',
    color: '#fff',
    cursor: 'pointer',
    marginBottom: '0.35rem',
    textAlign: 'left',
    transition: 'background 0.2s, border-color 0.2s',
  },
  groupIcon: { fontSize: '1.4rem' },
  groupInfo: { flex: 1, overflow: 'hidden' },
  groupItemName: {
    fontWeight: 600,
    fontSize: '0.88rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  groupItemMembers: {
    fontSize: '0.72rem',
    color: 'rgba(255,255,255,.4)',
    marginTop: 2,
  },

  // Chat area
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  noChatSelected: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255,255,255,.55)',
  },
  showSidebarBtn: {
    marginTop: '1rem',
    padding: '0.6rem 1.2rem',
    borderRadius: 10,
    background: '#1A6BFF',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
  },

  // Chat header
  chatHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
    padding: '0.8rem 1.2rem',
    borderBottom: '1px solid rgba(255,255,255,.08)',
    background: 'rgba(255,255,255,.02)',
  },
  hamburger: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '1.2rem',
    cursor: 'pointer',
    padding: '0.3rem',
  },
  chatTitle: {
    fontFamily: 'Syne',
    fontWeight: 700,
    fontSize: '1rem',
  },
  chatSubtitle: {
    fontSize: '0.72rem',
    color: 'rgba(255,255,255,.4)',
  },
  membersToggle: {
    marginLeft: 'auto',
    background: 'rgba(255,255,255,.05)',
    border: '1px solid rgba(255,255,255,.1)',
    color: '#fff',
    borderRadius: 8,
    padding: '0.4rem 0.8rem',
    cursor: 'pointer',
    fontSize: '0.78rem',
  },

  // Members panel
  membersPanel: {
    padding: '0.8rem 1.2rem',
    borderBottom: '1px solid rgba(255,255,255,.08)',
    background: 'rgba(255,255,255,.03)',
    maxHeight: 200,
    overflowY: 'auto',
  },
  membersPanelTitle: {
    fontWeight: 700,
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'rgba(255,255,255,.4)',
    marginBottom: '0.6rem',
  },
  memberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.4rem 0',
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #1A6BFF, #00E5C3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.82rem',
  },
  memberName: {
    fontWeight: 600,
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  adminBadge: {
    fontSize: '0.62rem',
    padding: '0.15rem 0.4rem',
    borderRadius: 99,
    background: 'rgba(26,107,255,.15)',
    color: '#5b9dff',
    fontWeight: 600,
  },
  memberEmail: {
    fontSize: '0.72rem',
    color: 'rgba(255,255,255,.35)',
  },

  // Messages
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem 1.2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  emptyMessages: {
    textAlign: 'center',
    color: 'rgba(255,255,255,.35)',
    marginTop: '3rem',
    fontSize: '0.88rem',
  },
  dateSeparator: {
    display: 'flex',
    justifyContent: 'center',
    margin: '0.8rem 0',
  },
  dateBadge: {
    fontSize: '0.7rem',
    padding: '0.25rem 0.8rem',
    borderRadius: 99,
    background: 'rgba(255,255,255,.06)',
    color: 'rgba(255,255,255,.4)',
  },
  messageBubbleRow: {
    display: 'flex',
  },
  messageBubble: {
    maxWidth: '65%',
    padding: '0.6rem 0.9rem',
    borderRadius: 12,
    border: '1px solid',
    position: 'relative',
  },
  senderName: {
    fontSize: '0.72rem',
    fontWeight: 700,
    color: '#00E5C3',
    marginBottom: '0.2rem',
  },
  messageText: {
    fontSize: '0.88rem',
    lineHeight: 1.5,
    wordBreak: 'break-word',
  },
  messageTime: {
    fontSize: '0.62rem',
    color: 'rgba(255,255,255,.3)',
    textAlign: 'right',
    marginTop: '0.25rem',
  },
  fileLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    color: '#fff',
    textDecoration: 'none',
    padding: '0.3rem 0',
  },
  fileName: {
    fontSize: '0.82rem',
    fontWeight: 600,
    wordBreak: 'break-word',
  },
  fileSize: {
    fontSize: '0.68rem',
    color: 'rgba(255,255,255,.35)',
  },

  // Typing
  typingIndicator: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,.35)',
    fontStyle: 'italic',
    padding: '0.2rem 0',
  },
  botTypingIndicator: {
    fontSize: '0.78rem',
    color: 'rgba(138,80,255,.7)',
    fontStyle: 'italic',
    padding: '0.3rem 0',
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(138,80,255,.3), rgba(26,107,255,.3))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.9rem',
    flexShrink: 0,
    marginRight: '0.3rem',
  },
  botSenderName: {
    fontSize: '0.72rem',
    fontWeight: 700,
    color: '#b98bff',
    marginBottom: '0.2rem',
  },

  // Input bar
  inputBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.8rem 1.2rem',
    borderTop: '1px solid rgba(255,255,255,.08)',
    background: 'rgba(255,255,255,.02)',
  },
  attachBtn: {
    background: 'rgba(255,255,255,.06)',
    border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 10,
    padding: '0.55rem 0.7rem',
    cursor: 'pointer',
    fontSize: '1.1rem',
    color: '#fff',
    transition: 'background 0.2s',
  },
  textInput: {
    flex: 1,
    padding: '0.7rem 1rem',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,.1)',
    background: 'rgba(255,255,255,.04)',
    color: '#fff',
    fontSize: '0.88rem',
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
  },
  sendBtn: {
    background: 'linear-gradient(135deg, #1A6BFF, #3a8bff)',
    border: 'none',
    borderRadius: 10,
    padding: '0.55rem 1rem',
    cursor: 'pointer',
    fontSize: '1.1rem',
    color: '#fff',
    fontWeight: 700,
    transition: 'opacity 0.2s',
  },

  // Reference Flow sidebar button
  refFlowBtn: {
    width: 'calc(100% - 1rem)',
    margin: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.7rem 0.8rem',
    borderRadius: 10,
    border: '1px solid rgba(138,80,255,.15)',
    color: '#fff',
    cursor: 'pointer',
    transition: 'background 0.2s, border-color 0.2s',
  },
  refFlowTitle: {
    fontWeight: 700,
    fontSize: '0.85rem',
    fontFamily: 'Syne',
    color: '#c9a5ff',
  },
  refFlowSub: {
    fontSize: '0.68rem',
    color: 'rgba(255,255,255,.4)',
    marginTop: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 180,
  },

  // Reference Flow panel (main area)
  refPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  refHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.7rem',
    padding: '0.8rem 1.2rem',
    borderBottom: '1px solid rgba(138,80,255,.15)',
    background: 'rgba(138,80,255,.04)',
  },
  refHeaderTitle: {
    fontFamily: 'Syne',
    fontWeight: 700,
    fontSize: '1rem',
    color: '#c9a5ff',
  },
  refHeaderSub: {
    fontSize: '0.72rem',
    color: 'rgba(255,255,255,.4)',
  },
  refCloseBtn: {
    marginLeft: 'auto',
    background: 'rgba(255,255,255,.05)',
    border: '1px solid rgba(255,255,255,.1)',
    color: 'rgba(255,255,255,.5)',
    borderRadius: 8,
    width: 28,
    height: 28,
    cursor: 'pointer',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refUploadArea: {
    padding: '0.6rem 1.2rem',
    borderBottom: '1px solid rgba(138,80,255,.1)',
  },
  refUploadBtn: {
    width: '100%',
    padding: '0.7rem',
    borderRadius: 10,
    border: '1.5px dashed rgba(138,80,255,.35)',
    background: 'rgba(138,80,255,.06)',
    color: '#c9a5ff',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
    transition: 'background 0.2s',
  },
  refPdfInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,.6)',
  },
  refSmallBtn: {
    background: 'rgba(255,255,255,.05)',
    border: '1px solid rgba(255,255,255,.1)',
    color: 'rgba(255,255,255,.55)',
    borderRadius: 6,
    padding: '0.25rem 0.5rem',
    cursor: 'pointer',
    fontSize: '0.7rem',
  },
  refMessagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem 1.2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  refEmptyState: {
    textAlign: 'center',
    color: 'rgba(255,255,255,.35)',
    marginTop: '3rem',
    fontSize: '0.85rem',
    lineHeight: 1.6,
  },
  refMsgRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.4rem',
  },
  refBotAvatar: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(138,80,255,.3), rgba(200,120,255,.3))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
    flexShrink: 0,
  },
  refMsgBubble: {
    maxWidth: '80%',
    padding: '0.55rem 0.85rem',
    borderRadius: 12,
    border: '1px solid',
  },
  refMsgText: {
    fontSize: '0.85rem',
    lineHeight: 1.55,
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
  },
  refTyping: {
    fontSize: '0.8rem',
    color: 'rgba(138,80,255,.7)',
    fontStyle: 'italic',
  },
  refInputBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.8rem 1.2rem',
    borderTop: '1px solid rgba(138,80,255,.1)',
    background: 'rgba(138,80,255,.02)',
  },
  refTextInput: {
    flex: 1,
    padding: '0.65rem 1rem',
    borderRadius: 10,
    border: '1px solid rgba(138,80,255,.2)',
    background: 'rgba(255,255,255,.04)',
    color: '#fff',
    fontSize: '0.85rem',
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
  },
  refSendBtn: {
    background: 'linear-gradient(135deg, #8a50ff, #b98bff)',
    border: 'none',
    borderRadius: 10,
    padding: '0.55rem 1rem',
    cursor: 'pointer',
    fontSize: '1.1rem',
    color: '#fff',
    fontWeight: 700,
    transition: 'opacity 0.2s',
  },
};
