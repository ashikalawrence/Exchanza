import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc, addDoc, serverTimestamp, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, Shield, LogOut, RefreshCw, Search, AlertTriangle, Ban, CheckCircle, Trash2, Eye, X, Home, Flag, CheckCircle2, Clock, Loader2 } from 'lucide-react';

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState({ users: 0, books: 0, requests: 0, circles: 0, reports: 0 });
  const [userList, setUserList] = useState([]);
  const [bookList, setBookList] = useState([]);
  const [reportList, setReportList] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [warnUser, setWarnUser] = useState(null);
  const [warnMsg, setWarnMsg] = useState('');
  const [viewBook, setViewBook] = useState(null);
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState('');

  const notify = msg => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const [us, bs, rs, cs, reps] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'books')),
        getDocs(collection(db, 'exchangeRequests')),
        getDocs(collection(db, 'bookCircles')),
        getDocs(collection(db, 'reports')),
      ]);
      const bArr = bs.docs.map(d => ({ id: d.id, ...d.data() }));
      const cnt = {};
      bArr.forEach(b => { if (b.ownerId) cnt[b.ownerId] = (cnt[b.ownerId] || 0) + 1; });
      setStats({ users: us.size, books: bs.size, requests: rs.size, circles: cs.size, reports: reps.size });
      setUserList(us.docs.map(d => ({ id: d.id, ...d.data(), bookCount: cnt[d.id] || 0 })));
      setBookList(bArr);
    } catch (e) { notify('Error: ' + e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const banToggle = async u => {
    setBusy(u.id + 'b');
    await updateDoc(doc(db, 'users', u.id), { banned: !u.banned });
    setUserList(p => p.map(x => x.id === u.id ? { ...x, banned: !x.banned } : x));
    notify(u.banned ? 'User unbanned' : 'User banned');
    setBusy('');
  };

  const sendWarn = async () => {
    if (!warnMsg.trim()) return;
    setBusy('w');
    await addDoc(collection(db, 'notifications'), { userId: warnUser.id, type: 'warning', title: '⚠️ Admin Warning', message: warnMsg, read: false, createdAt: serverTimestamp() });
    await addDoc(collection(db, 'warnings'), { userId: warnUser.id, userEmail: warnUser.email, userName: warnUser.displayName || 'Unknown', message: warnMsg, issuedBy: user.uid, createdAt: serverTimestamp() });
    notify('Warning sent'); setWarnUser(null); setWarnMsg(''); setBusy('');
  };

  const delBook = async id => {
    setBusy(id);
    await deleteDoc(doc(db, 'books', id));
    setBookList(p => p.filter(b => b.id !== id));
    setStats(p => ({ ...p, books: p.books - 1 }));
    notify('Book deleted'); setBusy('');
  };

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const snap = await getDocs(collection(db, 'reports'));
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setReportList(data);
    } catch (e) { notify('Error loading reports: ' + e.message); }
    finally { setLoadingReports(false); }
  };

  const resolveReport = async (reportId) => {
    setBusy(reportId);
    try {
      await updateDoc(doc(db, 'reports', reportId), { status: 'resolved' });
      setReportList(p => p.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
      setStats(p => ({ ...p, reports: Math.max(0, p.reports - 1) }));
      notify('Report marked as resolved.');
    } catch (e) { notify('Failed: ' + e.message); }
    finally { setBusy(''); }
  };

  const deleteSeededCircles = async () => {
    if (!window.confirm('Delete ALL system-seeded circles? This is permanent and cannot be undone.')) return;
    setBusy('seedClean');
    try {
      const snap = await getDocs(query(collection(db, 'bookCircles'), where('creatorId', '==', 'system')));
      if (snap.empty) { notify('No seeded circles found — already clean!'); setBusy(''); return; }
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      notify(`Deleted ${snap.size} seeded circle(s) successfully.`);
      await load();
    } catch (e) {
      notify('Cleanup failed: ' + e.message);
    } finally {
      setBusy('');
    }
  };

  const filtered = arr => arr.filter(x =>
    (x.displayName || x.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (x.email || x.author || '').toLowerCase().includes(search.toLowerCase())
  );

  const NAV = [['overview', 'Overview', LayoutDashboard], ['users', 'Users', Users], ['books', 'Books', BookOpen], ['reports', 'User Reports', Flag]];
  const STATS = [
    { l: 'Total Users', v: stats.users, c: '#7BAE7F' },
    { l: 'Total Books', v: stats.books, c: '#6366F1' },
    { l: 'Exchange Requests', v: stats.requests, c: '#F59E0B' },
    { l: 'Book Circles', v: stats.circles, c: '#EC4899' },
    { l: 'Open Reports', v: stats.reports, c: '#EF4444' },
  ];

  const sideBtn = (active) => ({ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 8, border: 'none', marginBottom: 3, cursor: 'pointer', background: active ? 'rgba(123,174,127,.15)' : 'transparent', color: active ? '#7BAE7F' : 'rgba(255,255,255,.45)', fontWeight: active ? 600 : 400, fontSize: 13, borderLeft: active ? '3px solid #7BAE7F' : '3px solid transparent', textAlign: 'left' });
  const actionBtn = (bg, border, color) => ({ padding: '5px 9px', borderRadius: 7, border: `1px solid ${border}`, background: bg, color, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter,sans-serif', background: '#F7F5EF' }}>
      {toast && <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: '#D1FAE5', color: '#065F46', padding: '12px 20px', borderRadius: 12, fontWeight: 600, fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,.1)' }}>{toast}</div>}

      {/* Sidebar */}
      <aside style={{ width: 230, background: 'linear-gradient(180deg,#1a2e1b,#263326)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', flexShrink: 0 }}>
        <div style={{ padding: '22px 18px 14px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#7BAE7F,#4F6F52)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 17 }}>E</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Exchanza</div>
              <div style={{ color: '#7BAE7F', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>Admin Panel</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '10px 8px' }}>
          {NAV.map(([id, label, Icon]) => (
            <button key={id} onClick={() => { setTab(id); setSearch(''); if (id === 'reports') loadReports(); }} style={sideBtn(tab === id)}>
              <Icon size={15} />{label}
              {id === 'reports' && stats.reports > 0 && (
                <span style={{ marginLeft: 'auto', background: '#EF4444', color: '#fff', borderRadius: 20, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>{stats.reports}</span>
              )}
            </button>
          ))}
        </nav>
        <div style={{ padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <button
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(123,174,127,.12)', color: '#A8C9A3', fontSize: 12, fontWeight: 500, marginBottom: 5 }}
          >
            <Home size={13} /> Back to Home
          </button>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: 'rgba(255,255,255,.35)', fontSize: 12, marginBottom: 5 }}><RefreshCw size={13} />Refresh</button>
          <button onClick={async () => { await logout(); navigate('/login'); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,.1)', color: '#F87171', fontSize: 12, fontWeight: 500 }}><LogOut size={13} />Sign Out</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ padding: '18px 26px', background: '#fff', borderBottom: '1px solid #E9E3D5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: '#263326' }}>
            {tab === 'overview' ? 'Dashboard Overview' : tab === 'users' ? 'User Management' : tab === 'reports' ? 'User Reports' : 'Book Moderation'}
          </h1>
            <p style={{ margin: '1px 0 0', fontSize: 12, color: '#7A8C7A' }}>{new Date().toDateString()}</p>
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 13px', borderRadius: 20, background: '#F0FAF0', border: '1px solid #A8C9A3', color: '#4F6F52', fontSize: 12, fontWeight: 600 }}><Shield size={13} />Admin</span>
        </div>

        <div style={{ padding: 26 }}>
          {loading && <p style={{ textAlign: 'center', padding: 60, color: '#7A8C7A' }}>Loading…</p>}

          {/* OVERVIEW */}
          {!loading && tab === 'overview' && <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(185px,1fr))', gap: 16, marginBottom: 22 }}>
              {STATS.map(s => (
                <div key={s.l} style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #E9E3D5', boxShadow: '0 2px 10px rgba(0,0,0,.04)' }}>
                  <div style={{ fontSize: 34, fontWeight: 800, color: s.c, lineHeight: 1 }}>{s.v}</div>
                  <div style={{ fontSize: 13, color: '#7A8C7A', marginTop: 6 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #E9E3D5', boxShadow: '0 2px 10px rgba(0,0,0,.04)', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#263326' }}>🧹 Data Cleanup</div>
                <span style={{ fontSize: 11, color: '#7A8C7A', fontStyle: 'italic' }}>One-time utility for removing old seeded data</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#FEF9EC', border: '1px solid #FDE68A', borderRadius: 10 }}>
                <AlertTriangle size={16} color="#D97706" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 12, color: '#92400E' }}>Seeded demo circles from old code may still exist in Firestore. Click to permanently delete all circles with <code>creatorId === "system"</code>.</div>
                <button
                  onClick={deleteSeededCircles}
                  disabled={busy === 'seedClean'}
                  style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 8, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#991B1B', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, opacity: busy === 'seedClean' ? 0.6 : 1 }}
                >
                  <Trash2 size={12} /> {busy === 'seedClean' ? 'Cleaning…' : 'Delete Seeded Circles'}
                </button>
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #E9E3D5', boxShadow: '0 2px 10px rgba(0,0,0,.04)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#263326', marginBottom: 12 }}>Recent Users</div>
              {userList.slice(0, 5).map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #F7F5EF' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7BAE7F,#A8C9A3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, marginRight: 10, flexShrink: 0 }}>{(u.displayName || u.email || '?')[0].toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#263326' }}>{u.displayName || 'No name'}</div>
                    <div style={{ fontSize: 11, color: '#7A8C7A' }}>{u.email}</div>
                  </div>
                  {u.banned && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#FEE2E2', color: '#991B1B', fontWeight: 600 }}>Banned</span>}
                </div>
              ))}
            </div>
          </>}

          {/* USERS */}
          {!loading && tab === 'users' && <>
            <div style={{ position: 'relative', maxWidth: 370, marginBottom: 16 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7A8C7A' }} />
              <input placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10, border: '1px solid #E9E3D5', background: '#fff', fontSize: 13, color: '#263326', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E9E3D5', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,.04)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#F7F5EF' }}>
                    {['User', 'Email', 'Joined', 'Books', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#7A8C7A', textTransform: 'uppercase', letterSpacing: .5, borderBottom: '1px solid #E9E3D5' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {filtered(userList).map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid #F7F5EF' }}>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#7BAE7F,#A8C9A3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{(u.displayName || u.email || '?')[0].toUpperCase()}</div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#263326' }}>{u.displayName || '—'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 13, color: '#7A8C7A' }}>{u.email}</td>
                        <td style={{ padding: '11px 14px', fontSize: 12, color: '#7A8C7A' }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                        <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: '#263326' }}>{u.bookCount}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, fontWeight: 600, background: u.banned ? '#FEE2E2' : '#D1FAE5', color: u.banned ? '#991B1B' : '#065F46' }}>{u.banned ? 'Banned' : 'Active'}</span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button onClick={() => { setWarnUser(u); setWarnMsg(''); }} style={actionBtn('#FFFBEB', '#FDE68A', '#92400E')}><AlertTriangle size={12} />Warn</button>
                            <button onClick={() => banToggle(u)} disabled={busy === u.id + 'b'} style={actionBtn(u.banned ? '#ECFDF5' : '#FEF2F2', u.banned ? '#A7F3D0' : '#FECACA', u.banned ? '#065F46' : '#991B1B')}>
                              {u.banned ? <><CheckCircle size={12} />Unban</> : <><Ban size={12} />Ban</>}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered(userList).length === 0 && <p style={{ textAlign: 'center', padding: 28, color: '#7A8C7A', fontSize: 13 }}>No users found.</p>}
              </div>
            </div>
          </>}

          {/* BOOKS */}
          {!loading && tab === 'books' && <>
            <div style={{ position: 'relative', maxWidth: 370, marginBottom: 16 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7A8C7A' }} />
              <input placeholder="Search books…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10, border: '1px solid #E9E3D5', background: '#fff', fontSize: 13, color: '#263326', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
              {filtered(bookList).map(b => (
                <div key={b.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E9E3D5', padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,.04)' }}>
                  <div style={{ width: '100%', height: 90, borderRadius: 10, background: 'linear-gradient(135deg,#F0FAF0,#E9E3D5)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, overflow: 'hidden' }}>
                    {b.coverURL ? <img src={b.coverURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} /> : <BookOpen size={26} color="#A8C9A3" />}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#263326', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title || 'Untitled'}</div>
                  <div style={{ fontSize: 12, color: '#7A8C7A', marginBottom: 10 }}>{b.author || 'Unknown'}</div>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <button onClick={() => setViewBook(b)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: '1px solid #E9E3D5', background: '#F7F5EF', color: '#4F6F52', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Eye size={12} />Details</button>
                    <button onClick={() => delBook(b.id)} disabled={busy === b.id} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#991B1B', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Trash2 size={12} />Delete</button>
                  </div>
                </div>
              ))}
            </div>
            {filtered(bookList).length === 0 && <p style={{ textAlign: 'center', padding: 40, color: '#7A8C7A', fontSize: 13 }}>No books found.</p>}
          </>}

          {/* REPORTS */}
          {tab === 'reports' && <>
            {loadingReports ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                <Loader2 size={30} color="#7BAE7F" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : reportList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <Flag size={40} color="#A8C9A3" style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: '#263326', margin: '0 0 6px' }}>No reports yet</p>
                <p style={{ fontSize: 13, color: '#7A8C7A', margin: 0 }}>User-submitted reports will appear here.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {reportList.map(r => {
                  const isOpen = r.status === 'open';
                  const date = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
                  return (
                    <div key={r.id} style={{ background: '#fff', borderRadius: 14, border: `1px solid ${isOpen ? '#FECACA' : '#E9E3D5'}`, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <Flag size={14} color={isOpen ? '#EF4444' : '#7BAE7F'} />
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#263326' }}>{r.title}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: isOpen ? '#FEE2E2' : '#D1FAE5', color: isOpen ? '#991B1B' : '#065F46' }}>
                              {isOpen ? 'Open' : 'Resolved'}
                            </span>
                          </div>
                          <p style={{ fontSize: 13, color: '#4F6F52', margin: '0 0 10px', lineHeight: 1.6 }}>{r.description}</p>
                          {r.screenshotUrl && (
                            <a href={r.screenshotUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#6366F1', textDecoration: 'underline', marginBottom: 10, display: 'inline-block' }}>
                              📎 View Screenshot
                            </a>
                          )}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 4 }}>
                            <span style={{ fontSize: 11, color: '#7A8C7A', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,#7BAE7F,#4F6F52)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 9 }}>
                                {(r.userName || r.userEmail || '?')[0].toUpperCase()}
                              </div>
                              {r.userName || 'Anonymous'} &bull; {r.userEmail}
                            </span>
                            <span style={{ fontSize: 11, color: '#7A8C7A', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={11} /> {date}
                            </span>
                          </div>
                        </div>
                        {isOpen && (
                          <button
                            onClick={() => resolveReport(r.id)}
                            disabled={busy === r.id}
                            style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 8, border: '1px solid #A7F3D0', background: '#ECFDF5', color: '#065F46', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, opacity: busy === r.id ? 0.6 : 1 }}
                          >
                            <CheckCircle2 size={13} /> {busy === r.id ? 'Saving…' : 'Mark Resolved'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>}
        </div>
      </main>

      {/* Warning Modal */}
      {warnUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 26, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#263326' }}>Send Warning</h2>
              <button onClick={() => setWarnUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A8C7A' }}><X size={19} /></button>
            </div>
            <p style={{ fontSize: 13, color: '#7A8C7A', marginBottom: 13 }}>Warning to <strong style={{ color: '#263326' }}>{warnUser.displayName || warnUser.email}</strong></p>
            <textarea value={warnMsg} onChange={e => setWarnMsg(e.target.value)} placeholder="Write the warning message…" rows={4} style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #E9E3D5', fontSize: 13, color: '#263326', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
              <button onClick={() => setWarnUser(null)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: '1px solid #E9E3D5', background: '#F7F5EF', color: '#4F6F52', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={sendWarn} disabled={!warnMsg.trim() || busy === 'w'} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', background: '#F59E0B', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: !warnMsg.trim() ? .5 : 1 }}>Send Warning</button>
            </div>
          </div>
        </div>
      )}

      {/* Book Detail Modal */}
      {viewBook && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 26, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,.18)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#263326' }}>Book Details</h2>
              <button onClick={() => setViewBook(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A8C7A' }}><X size={19} /></button>
            </div>
            {viewBook.coverURL && <img src={viewBook.coverURL} alt="" style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 12, marginBottom: 14 }} />}
            {[['Title', viewBook.title], ['Author', viewBook.author], ['Genre', viewBook.genre], ['Condition', viewBook.condition], ['Description', viewBook.description]].map(([k, v]) => v ? (
              <div key={k} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#7A8C7A', textTransform: 'uppercase', letterSpacing: .5 }}>{k}</div>
                <div style={{ fontSize: 13, color: '#263326', marginTop: 2 }}>{v}</div>
              </div>
            ) : null)}
            <button onClick={() => setViewBook(null)} style={{ width: '100%', padding: '9px 0', borderRadius: 10, border: '1px solid #E9E3D5', background: '#F7F5EF', color: '#4F6F52', fontWeight: 600, fontSize: 13, cursor: 'pointer', marginTop: 8 }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
