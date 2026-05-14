import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, serverTimestamp, addDoc, setDoc, getDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  Send, Clock, CheckCircle2, XCircle, ArrowLeft,
  Inbox, User, Calendar, MessageCircle, BookOpen, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatDate = (ts) => {
  if (!ts) return 'Just now';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const StatusBadge = ({ status }) => {
  const map = {
    accepted: { cls: 'bg-[#7BAE7F]/15 text-[#4F6F52] border-[#7BAE7F]/30', icon: <CheckCircle2 size={11} />, label: 'Accepted' },
    rejected: { cls: 'bg-red-50 text-red-600 border-red-200', icon: <XCircle size={11} />, label: 'Rejected' },
    pending:  { cls: 'bg-amber-50 text-amber-600 border-amber-200', icon: <Clock size={11} />, label: 'Pending' },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
};

// ── Incoming Request Card (for book owner) ────────────────────────────────────

const IncomingCard = ({ req, onAccept, onReject }) => (
  <div className="bg-white rounded-2xl p-5 border border-[#E9E3D5] shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row gap-5">
    {/* Book cover */}
    <div className="w-20 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-[#F7F5EF] border border-[#E9E3D5] flex items-center justify-center">
      {req.bookImage
        ? <img src={req.bookImage} alt={req.bookTitle} className="w-full h-full object-cover" />
        : <span className="text-3xl font-bold text-[#A8C9A3]">{req.bookTitle?.charAt(0) || '?'}</span>
      }
    </div>

    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-bold text-[#263326] truncate">{req.bookTitle}</h3>
        <StatusBadge status={req.status} />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-[#7BAE7F] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
          {req.requesterName?.charAt(0) || 'U'}
        </div>
        <p className="text-sm text-[#7A8C7A] font-light">
          <span className="font-semibold text-[#263326]">{req.requesterName || 'Someone'}</span> wants to exchange
        </p>
      </div>

      <div className="flex items-center gap-4 text-xs text-[#7A8C7A] mb-4">
        <span className="flex items-center gap-1"><Calendar size={11} /> {formatDate(req.createdAt)}</span>
        <span className="px-2 py-0.5 bg-[#F7F5EF] text-[#4F6F52] border border-[#E9E3D5] rounded-lg font-semibold uppercase text-[10px]">{req.type || 'Exchange'}</span>
      </div>

      {req.status === 'pending' && (
        <div className="flex gap-2 mt-auto">
          <button
            onClick={() => onAccept(req)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#7BAE7F] hover:bg-[#4F6F52] text-white text-sm font-bold rounded-xl transition-all active:scale-95 shadow-sm"
          >
            <CheckCircle2 size={14} /> Accept
          </button>
          <button
            onClick={() => onReject(req)}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-bold rounded-xl border border-red-200 transition-all active:scale-95"
          >
            <XCircle size={14} /> Decline
          </button>
        </div>
      )}
      {req.status !== 'pending' && (
        <p className="text-xs text-[#7A8C7A] font-light italic mt-auto">
          {req.status === 'accepted' ? '✓ You accepted this request.' : '✗ You declined this request.'}
        </p>
      )}
    </div>
  </div>
);

// ── Outgoing Request Card ─────────────────────────────────────────────────────

const OutgoingCard = ({ req, onMessage }) => (
  <div className="bg-white rounded-2xl p-5 border border-[#E9E3D5] shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row gap-5">
    <div className="w-20 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-[#F7F5EF] border border-[#E9E3D5] flex items-center justify-center">
      {req.bookImage
        ? <img src={req.bookImage} alt={req.bookTitle} className="w-full h-full object-cover" />
        : <span className="text-3xl font-bold text-[#A8C9A3]">{req.bookTitle?.charAt(0) || '?'}</span>
      }
    </div>

    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-bold text-[#263326] truncate">{req.bookTitle}</h3>
        <StatusBadge status={req.status} />
      </div>

      <div className="flex items-center gap-4 text-xs text-[#7A8C7A] mb-3">
        <span className="flex items-center gap-1"><Calendar size={11} /> {formatDate(req.createdAt)}</span>
        <span className="px-2 py-0.5 bg-[#F7F5EF] text-[#4F6F52] border border-[#E9E3D5] rounded-lg font-semibold uppercase text-[10px]">{req.type || 'Exchange'}</span>
      </div>

      {req.status === 'accepted' && (
        <div className="mb-3 p-3 bg-[#7BAE7F]/10 border border-[#7BAE7F]/20 rounded-xl text-sm text-[#4F6F52] font-medium">
          🎉 The owner accepted your request! You can now chat to arrange the exchange.
        </div>
      )}
      {req.status === 'rejected' && (
        <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
          The owner declined this request.
        </div>
      )}

      <button
        onClick={onMessage}
        className="self-start flex items-center gap-1.5 px-4 py-2 bg-[#F7F5EF] hover:bg-[#E9E3D5] text-[#4F6F52] text-sm font-semibold rounded-xl border border-[#E9E3D5] transition-all active:scale-95"
      >
        <MessageCircle size={14} /> Message Owner
      </button>
    </div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

const ExchangeRequests = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('incoming');
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loadingIn, setLoadingIn] = useState(true);
  const [loadingOut, setLoadingOut] = useState(true);

  // Live incoming requests (where I am the book owner)
  useEffect(() => {
    if (!user) { setLoadingIn(false); return; }
    const q = query(collection(db, 'exchangeRequests'), where('ownerId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setIncoming(data);
      setLoadingIn(false);
    }, () => setLoadingIn(false));
    return () => unsub();
  }, [user]);

  // Live outgoing requests (where I am the requester)
  useEffect(() => {
    if (!user) { setLoadingOut(false); return; }
    const q = query(collection(db, 'exchangeRequests'), where('requesterId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setOutgoing(data);
      setLoadingOut(false);
    }, () => setLoadingOut(false));
    return () => unsub();
  }, [user]);

  const toast = (title, message) => {
    window.dispatchEvent(new CustomEvent('showGlobalToast', { detail: { title, message } }));
  };

  const handleAccept = async (req) => {
    try {
      await updateDoc(doc(db, 'exchangeRequests', req.id), {
        status: 'accepted', updatedAt: serverTimestamp()
      });

      // Notify requester
      await addDoc(collection(db, 'notifications'), {
        userId: req.requesterId,
        type: 'accepted',
        title: 'Request Accepted! 🎉',
        message: `Your request for "${req.bookTitle}" was accepted. Chat to arrange the exchange.`,
        createdAt: serverTimestamp(),
        read: false,
      });

      // Build deterministic chat ID (same algorithm as BookCard)
      const ids = [user.uid, req.requesterId].sort();
      const chatId = `${ids[0]}_${ids[1]}`;
      const acceptText = `✅ I've accepted your exchange request for "${req.bookTitle}"! Let's arrange the handover.`;

      // Fetch latest requester details — use username first (Exchanza handle, not Firebase displayName)
      let requesterName = req.requesterName || 'User';
      let requesterPhoto = null;
      try {
        const reqSnap = await getDoc(doc(db, 'users', req.requesterId));
        if (reqSnap.exists()) {
          const reqData = reqSnap.data();
          requesterName = reqData.username || reqData.fullName || reqData.displayName || requesterName;
          requesterPhoto = reqData.photoURL || reqData.profileImage || null;
        }
      } catch (err) {
        console.error('[Exchanza] Error fetching requester details:', err);
      }

      // Owner's Exchanza identity (use userProfile from Firestore, not Firebase Auth displayName)
      const ownerDisplayName = userProfile?.username || userProfile?.fullName || user.displayName || 'User';
      const ownerPhoto = userProfile?.photoURL || userProfile?.profileImage || user.photoURL || null;

      // Upsert chat document so it exists and has a lastMessage (required by Messages filter)
      await setDoc(doc(db, 'chats', chatId), {
        participants: [user.uid, req.requesterId],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: acceptText,
        lastMessageSenderId: user.uid,
        bookTitle: req.bookTitle || '',
        bookId: req.bookId || '',
        participantDetails: {
          [user.uid]: {
            name: ownerDisplayName,
            photo: ownerPhoto
          },
          [req.requesterId]: {
            name: requesterName,
            photo: requesterPhoto
          }
        }
      }, { merge: true });

      // Write the acceptance message with 'timestamp' field (matches Messages.jsx sort)
      await addDoc(collection(db, 'messages'), {
        chatId,
        senderId: user.uid,
        receiverId: req.requesterId,
        text: acceptText,
        timestamp: serverTimestamp(),
        read: false,
      });

      console.log('[Exchanza] Acceptance chat updated:', chatId);
      toast('Request Accepted', `You accepted the request for "${req.bookTitle}".`);
    } catch (e) {
      console.error(e);
      toast('Error', 'Could not accept the request. Try again.');
    }
  };

  const handleReject = async (req) => {
    try {
      await updateDoc(doc(db, 'exchangeRequests', req.id), {
        status: 'rejected', updatedAt: serverTimestamp()
      });
      await addDoc(collection(db, 'notifications'), {
        userId: req.requesterId,
        type: 'rejected',
        title: 'Request Declined',
        message: `Your request for "${req.bookTitle}" was declined by the owner.`,
        createdAt: serverTimestamp(),
        read: false,
      });
      toast('Request Declined', `You declined the request for "${req.bookTitle}".`);
    } catch (e) {
      console.error(e);
      toast('Error', 'Could not decline the request. Try again.');
    }
  };

  const pendingCount = incoming.filter(r => r.status === 'pending').length;

  if (!user) return (
    <div className="flex flex-col items-center justify-center py-32 text-[#7A8C7A]">
      <p className="font-medium text-lg mb-4">Please log in to view exchange requests.</p>
      <button onClick={() => navigate('/login')} className="px-6 py-2.5 bg-[#7BAE7F] text-white rounded-xl font-bold shadow-sm hover:bg-[#4F6F52] transition-all">Login</button>
    </div>
  );

  return (
    <div className="pb-24 pt-10 px-6 lg:px-12 max-w-5xl mx-auto space-y-8">
      {/* Back */}
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-[#7A8C7A] hover:text-[#263326] text-sm font-medium px-4 py-2 bg-white border border-[#E9E3D5] rounded-xl shadow-sm hover:bg-[#F7F5EF] transition-all">
        <ArrowLeft size={16} /> Back
      </button>

      {/* Hero */}
      <div className="bg-[#263326] rounded-[2rem] p-10 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 border border-[#4F6F52]/30">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-[#7BAE7F]/20 rounded-2xl flex-shrink-0">
            <Send size={32} className="text-[#A8C9A3]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Exchange Requests</h1>
            <p className="text-[#A8C9A3] mt-1 font-light">Manage all incoming and outgoing book exchange requests.</p>
          </div>
        </div>
        <div className="flex gap-4 flex-wrap">
          <div className="bg-white/10 rounded-2xl px-5 py-3 text-center border border-white/10">
            <p className="text-2xl font-bold">{incoming.length}</p>
            <p className="text-[10px] text-[#A8C9A3] font-light uppercase tracking-widest">Incoming</p>
          </div>
          <div className="bg-white/10 rounded-2xl px-5 py-3 text-center border border-white/10">
            <p className="text-2xl font-bold">{outgoing.length}</p>
            <p className="text-[10px] text-[#A8C9A3] font-light uppercase tracking-widest">Outgoing</p>
          </div>
          {pendingCount > 0 && (
            <div className="bg-[#7BAE7F] rounded-2xl px-5 py-3 text-center">
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-[10px] text-white font-light uppercase tracking-widest">Pending</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-[#F7F5EF] rounded-2xl p-1.5 w-fit border border-[#E9E3D5]">
        {[
          { id: 'incoming', label: 'Incoming', icon: <Inbox size={14} />, count: incoming.length },
          { id: 'outgoing', label: 'Outgoing', icon: <Send size={14} />, count: outgoing.length },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.id ? 'bg-[#263326] text-white shadow-md' : 'text-[#7A8C7A] hover:text-[#263326]'
            }`}>
            {tab.icon} {tab.label}
            {tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-[#E9E3D5] text-[#4F6F52]'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Incoming */}
      {activeTab === 'incoming' && (
        <div className="animate-in fade-in duration-300">
          {loadingIn ? (
            <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-[#7BAE7F]" /></div>
          ) : incoming.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-[#E9E3D5] rounded-3xl p-16 text-center">
              <div className="w-20 h-20 bg-[#E9E3D5] rounded-full flex items-center justify-center mx-auto mb-4">
                <Inbox size={36} className="text-[#A8C9A3]" />
              </div>
              <h3 className="text-xl font-bold text-[#263326] mb-2">No incoming requests</h3>
              <p className="text-[#7A8C7A] font-light">When someone requests one of your books, it will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingCount > 0 && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-2xl">
                  <Clock size={16} className="text-amber-600" />
                  <p className="text-sm text-amber-700 font-medium">You have <strong>{pendingCount}</strong> pending request{pendingCount > 1 ? 's' : ''} awaiting your response.</p>
                </div>
              )}
              {incoming.map(req => (
                <IncomingCard key={req.id} req={req} onAccept={handleAccept} onReject={handleReject} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Outgoing */}
      {activeTab === 'outgoing' && (
        <div className="animate-in fade-in duration-300">
          {loadingOut ? (
            <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-[#7BAE7F]" /></div>
          ) : outgoing.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-[#E9E3D5] rounded-3xl p-16 text-center">
              <div className="w-20 h-20 bg-[#E9E3D5] rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen size={36} className="text-[#A8C9A3]" />
              </div>
              <h3 className="text-xl font-bold text-[#263326] mb-2">No outgoing requests</h3>
              <p className="text-[#7A8C7A] font-light mb-6">Explore books and send your first exchange request.</p>
              <button onClick={() => navigate('/explore')}
                className="px-8 py-3 bg-[#7BAE7F] hover:bg-[#4F6F52] text-white font-bold rounded-xl shadow-sm transition-all active:scale-95">
                Explore Books
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {outgoing.map(req => (
                <OutgoingCard key={req.id} req={req} onMessage={() => navigate('/messages')} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExchangeRequests;
