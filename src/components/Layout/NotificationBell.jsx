import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCircle2, XCircle, X, Send, ArrowRight } from 'lucide-react';
import { collection, query, where, onSnapshot, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const typeStyle = {
  request:  { icon: <Send size={14}/>,         bg: 'bg-[#7BAE7F]/15', text: 'text-[#4F6F52]',  border: 'border-[#7BAE7F]/20' },
  accepted: { icon: <CheckCircle2 size={14}/>,  bg: 'bg-[#7BAE7F]/15', text: 'text-[#4F6F52]',  border: 'border-[#7BAE7F]/20' },
  rejected: { icon: <XCircle size={14}/>,       bg: 'bg-red-50',       text: 'text-red-500',    border: 'border-red-100'      },
  default:  { icon: <Bell size={14}/>,          bg: 'bg-[#F7F5EF]',    text: 'text-[#7A8C7A]',  border: 'border-[#E9E3D5]'   },
};

const timeAgo = (ts) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const ref = useRef(null);

  // Real-time listener on notifications collection
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
        .slice(0, 20); // cap at 20 to keep dropdown manageable
      setNotifications(data);
    });
    return () => unsub();
  }, [user]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifications.filter(n => !n.read).length;

  const markRead = async (n) => {
    if (!n.read) {
      await updateDoc(doc(db, 'notifications', n.id), { read: true });
    }
  };

  const markAllRead = async () => {
    const batch = writeBatch(db);
    notifications.filter(n => !n.read).forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  };

  const handleClick = async (n) => {
    await markRead(n);
    setOpen(false);
    navigate('/requests');
  };

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 text-[#7A8C7A] hover:text-[#4F6F52] hover:bg-[#F7F5EF] rounded-xl transition-colors"
        aria-label="Notifications"
      >
        <Bell size={22} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 bg-[#7BAE7F] text-white text-[9px] font-bold rounded-full border-2 border-white animate-pulse">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute -right-12 sm:right-0 mt-3 w-[280px] sm:w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_12px_48px_rgba(79,111,82,0.16)] border border-[#E9E3D5] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#E9E3D5] flex items-center justify-between bg-[#F7F5EF]/60">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-[#7BAE7F]" />
              <h3 className="font-bold text-[#263326] text-sm">Notifications</h3>
              {unread > 0 && (
                <span className="px-1.5 py-0.5 bg-[#7BAE7F] text-white text-[9px] font-bold rounded-full">{unread}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-[10px] font-semibold text-[#7BAE7F] hover:text-[#4F6F52] transition-colors">
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 text-[#7A8C7A] hover:text-[#263326] rounded-lg hover:bg-[#E9E3D5] transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#F7F5EF]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-[#7A8C7A]">
                <Bell size={28} className="mb-2 opacity-30" />
                <p className="text-sm font-light">No notifications yet</p>
              </div>
            ) : notifications.map(n => {
              const s = typeStyle[n.type] || typeStyle.default;
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-[#F7F5EF] transition-colors flex gap-3 items-start ${!n.read ? 'bg-[#7BAE7F]/5' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${s.bg} ${s.text} ${s.border}`}>
                    {s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${!n.read ? 'text-[#263326]' : 'text-[#7A8C7A]'}`}>{n.title}</p>
                    <p className="text-[11px] text-[#7A8C7A] font-light leading-relaxed line-clamp-2 mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-[#A8C9A3] mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.read && <div className="w-2 h-2 bg-[#7BAE7F] rounded-full flex-shrink-0 mt-1" />}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-[#E9E3D5] px-4 py-2.5 bg-[#F7F5EF]/60">
            <button
              onClick={() => { setOpen(false); navigate('/requests'); }}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-[#4F6F52] hover:text-[#263326] transition-colors py-1"
            >
              View all requests <ArrowRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
