import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  doc, onSnapshot, updateDoc,
  arrayUnion, arrayRemove, addDoc, collection,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  ArrowLeft, Users, BookOpen, TrendingUp, MessageSquare,
  Send, Plus, Loader2, CheckCircle2, Heart, Clock, Crown, Sparkles
} from 'lucide-react';

const timeAgo = (ts) => {
  if (!ts) return 'just now';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const Avatar = ({ name, color, size = 8 }) => (
  <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
    style={{ backgroundColor: color || '#7BAE7F' }}>
    {(name || 'U').charAt(0).toUpperCase()}
  </div>
);

const MOCK_BOOKS = [
  { title: 'Atomic Habits', author: 'James Clear', color: '#7BAE7F' },
  { title: 'Deep Work', author: 'Cal Newport', color: '#4F6F52' },
  { title: 'The Alchemist', author: 'Paulo Coelho', color: '#A8C9A3' },
  { title: 'Dune', author: 'Frank Herbert', color: '#263326' },
];

const CirclePage = () => {
  const { circleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const chatEndRef = useRef(null);

  const [circle, setCircle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState('discussions');
  const [joining, setJoining] = useState(false);
  const [toast, setToast] = useState(null);

  // Discussions state (Firestore)
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);

  // Chat state (local)
  const [chatMessages, setChatMessages] = useState([
    { id: 1, name: 'Priya S.', text: 'Welcome everyone! 👋', color: '#7BAE7F', time: '10m ago' },
    { id: 2, name: 'Arjun M.', text: 'Excited to be here!', color: '#4F6F52', time: '8m ago' },
  ]);
  const [chatInput, setChatInput] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // Real-time circle doc
  useEffect(() => {
    if (!circleId) return;
    const unsub = onSnapshot(doc(db, 'bookCircles', circleId), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setCircle(data);
        setError(false);
      } else {
        console.warn('[CirclePage] Circle not found for id:', circleId);
        setError(true);
      }
      setLoading(false);
    }, (err) => {
      console.error('[CirclePage] Firestore error:', err);
      setError(true);
      setLoading(false);
    });
    return () => unsub();
  }, [circleId]);

  // Real-time discussions - no orderBy needed (sort client-side, avoids composite index)
  useEffect(() => {
    if (!circleId) return;
    const unsub = onSnapshot(
      collection(db, 'bookCircles', circleId, 'discussions'),
      (snap) => {
        const data = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setPosts(data);
      },
      (err) => console.error('[CirclePage] Discussions error:', err)
    );
    return () => unsub();
  }, [circleId]);

  // Scroll chat to bottom
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const isJoined = circle && user && (circle.joinedUsers || []).includes(user.uid);

  const handleJoin = async () => {
    if (!user) { showToast('Please log in to join.'); return; }
    setJoining(true);
    try {
      await updateDoc(doc(db, 'bookCircles', circleId), {
        joinedUsers: isJoined ? arrayRemove(user.uid) : arrayUnion(user.uid),
        membersCount: isJoined ? (circle.membersCount || 1) - 1 : (circle.membersCount || 0) + 1,
      });
      showToast(isJoined ? 'You left the circle.' : `Joined "${circle.name}"! 🎉`);
    } catch (e) { showToast('Something went wrong. Try again.'); }
    finally { setJoining(false); }
  };

  const handlePost = async () => {
    if (!newPost.trim() || !user) return;
    setPosting(true);
    try {
      await addDoc(collection(db, 'bookCircles', circleId, 'discussions'), {
        text: newPost.trim(),
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorColor: '#7BAE7F',
        likes: 0,
        likedBy: [],
        createdAt: serverTimestamp(),
      });
      setNewPost('');
    } catch (e) { showToast('Could not post. Try again.'); }
    finally { setPosting(false); }
  };

  const handleLike = async (post) => {
    if (!user) return;
    const liked = (post.likedBy || []).includes(user.uid);
    await updateDoc(doc(db, 'bookCircles', circleId, 'discussions', post.id), {
      likedBy: liked ? arrayRemove(user.uid) : arrayUnion(user.uid),
      likes: liked ? (post.likes || 1) - 1 : (post.likes || 0) + 1,
    });
  };

  const handleChatSend = () => {
    if (!chatInput.trim() || !user) return;
    setChatMessages(prev => [...prev, {
      id: Date.now(),
      name: user.displayName || 'You',
      text: chatInput.trim(),
      color: '#7BAE7F',
      time: 'just now',
      isMe: true,
    }]);
    setChatInput('');
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 size={32} className="animate-spin text-[#7BAE7F]" />
    </div>
  );

  if (error || !circle) return (
    <div className="pb-24 pt-10 px-6 lg:px-12 max-w-5xl mx-auto text-center">
      <div className="bg-white border-2 border-dashed border-[#E9E3D5] rounded-[2rem] p-16">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-2xl font-bold text-[#263326] mb-2">Circle Not Found</h2>
        <p className="text-[#7A8C7A] font-light mb-8 max-w-md mx-auto">
          The reading circle you are looking for doesn't exist or has been removed.
        </p>
        <button onClick={() => navigate('/circles')} className="px-8 py-3 bg-[#7BAE7F] hover:bg-[#4F6F52] text-white font-bold rounded-2xl shadow-sm transition-all active:scale-95">
          Browse All Circles
        </button>
      </div>
    </div>
  );

  const tabs = [
    { id: 'discussions', label: 'Discussions', icon: <MessageSquare size={14} /> },
    { id: 'books', label: 'Books', icon: <BookOpen size={14} /> },
    { id: 'chat', label: 'Group Chat', icon: <Send size={14} /> },
  ];

  return (
    <div className="pb-24 pt-10 px-6 lg:px-12 max-w-5xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate('/circles')}
        className="flex items-center gap-2 text-[#7A8C7A] hover:text-[#263326] text-sm font-medium px-4 py-2 bg-white border border-[#E9E3D5] rounded-xl shadow-sm hover:bg-[#F7F5EF] transition-all mb-8">
        <ArrowLeft size={16} /> Back to Circles
      </button>

      {/* Hero */}
      <div className="bg-[#263326] rounded-[2rem] p-8 mb-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-10 pointer-events-none" style={{ backgroundColor: circle.color || '#7BAE7F' }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="text-5xl flex-shrink-0">{circle.emoji || '📚'}</div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold tracking-tight">{circle.name}</h1>
                {isJoined && <span className="px-2 py-0.5 bg-[#7BAE7F]/30 text-[#A8C9A3] text-xs font-bold rounded-full border border-[#7BAE7F]/40">Joined</span>}
              </div>
              <p className="text-[#A8C9A3] text-sm font-light leading-relaxed max-w-lg">{circle.description}</p>
              <div className="flex items-center gap-4 mt-3">
                <span className="flex items-center gap-1.5 text-sm text-[#A8C9A3]"><Users size={14} /> {(circle.membersCount || 0)} members</span>
                {circle.creatorName && circle.creatorName !== 'Exchanza' && (
                  <span className="flex items-center gap-1.5 text-sm text-[#A8C9A3]"><Crown size={14} /> {circle.creatorName}</span>
                )}
                <span className="px-2 py-0.5 bg-white/10 text-[#A8C9A3] text-xs font-medium rounded-full">{circle.category}</span>
              </div>
            </div>
          </div>
          <button onClick={handleJoin} disabled={joining}
            className={`flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-60 ${isJoined ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20' : 'bg-[#7BAE7F] hover:bg-[#A8C9A3] hover:text-[#263326] text-white shadow-lg'}`}>
            {joining ? <Loader2 size={16} className="animate-spin" /> : isJoined ? <CheckCircle2 size={16} /> : <Plus size={16} />}
            {isJoined ? 'Joined' : 'Join Circle'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-[#F7F5EF] rounded-2xl p-1.5 w-fit border border-[#E9E3D5] mb-8">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === tab.id ? 'bg-[#263326] text-white shadow-md' : 'text-[#7A8C7A] hover:text-[#263326]'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* DISCUSSIONS TAB */}
      {activeTab === 'discussions' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Post box */}
          {user ? (
            <div className="bg-white rounded-2xl p-5 border border-[#E9E3D5] shadow-sm">
              <div className="flex gap-3">
                <Avatar name={user.displayName} color="#7BAE7F" />
                <div className="flex-1">
                  <textarea
                    value={newPost}
                    onChange={e => setNewPost(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handlePost())}
                    placeholder="Share a thought, ask a question, or recommend a book..."
                    className="w-full px-4 py-3 bg-[#F7F5EF] border border-[#E9E3D5] rounded-xl text-sm text-[#263326] focus:outline-none focus:ring-2 focus:ring-[#7BAE7F] resize-none h-20 transition-all"
                  />
                  <div className="flex justify-end mt-2">
                    <button onClick={handlePost} disabled={!newPost.trim() || posting}
                      className="flex items-center gap-2 px-5 py-2 bg-[#7BAE7F] hover:bg-[#4F6F52] text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 active:scale-95">
                      {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Post
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#F7F5EF] border border-[#E9E3D5] rounded-2xl p-5 text-center">
              <p className="text-sm text-[#7A8C7A]">Please <button onClick={() => navigate('/login')} className="text-[#7BAE7F] font-bold underline">log in</button> to participate in discussions.</p>
            </div>
          )}

          {/* Posts */}
          {posts.length === 0 ? (
            <div className="text-center py-16 text-[#7A8C7A]">
              <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-light">No discussions yet. Be the first to post!</p>
            </div>
          ) : posts.map(post => (
            <div key={post.id} className="bg-white rounded-2xl p-5 border border-[#E9E3D5] shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <Avatar name={post.authorName} color={post.authorColor || '#7BAE7F'} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-[#263326]">{post.authorName}</p>
                      {post.authorId === circle.creatorId && (
                        <span className="px-1.5 py-0.5 bg-[#7BAE7F]/15 text-[#4F6F52] text-[9px] font-bold rounded border border-[#7BAE7F]/20 flex items-center gap-0.5"><Crown size={8} /> Creator</span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#A8C9A3] flex items-center gap-1"><Clock size={10} /> {timeAgo(post.createdAt)}</span>
                  </div>
                  <p className="text-sm text-[#4F6F52] leading-relaxed">{post.text}</p>
                  <button onClick={() => handleLike(post)}
                    className={`mt-3 flex items-center gap-1.5 text-xs font-semibold transition-colors ${(post.likedBy || []).includes(user?.uid) ? 'text-[#7BAE7F]' : 'text-[#7A8C7A] hover:text-[#7BAE7F]'}`}>
                    <Heart size={13} fill={(post.likedBy || []).includes(user?.uid) ? '#7BAE7F' : 'none'} />
                    {post.likes || 0}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BOOKS TAB */}
      {activeTab === 'books' && (
        <div className="animate-in fade-in duration-300 space-y-6">
          {circle.trending && circle.trending !== '—' && (
            <div className="flex items-center gap-3 p-5 bg-gradient-to-r from-[#263326] to-[#4F6F52] rounded-2xl text-white shadow-md">
              <TrendingUp size={20} className="text-[#A8C9A3]" />
              <div>
                <p className="text-xs text-[#A8C9A3] font-light">Currently Trending in This Circle</p>
                <p className="font-bold">{circle.trending}</p>
              </div>
              <span className="ml-auto px-3 py-1 bg-[#7BAE7F]/30 text-[#A8C9A3] text-xs font-bold rounded-full border border-[#7BAE7F]/20 flex items-center gap-1"><Sparkles size={10} /> Hot</span>
            </div>
          )}
          <h3 className="font-bold text-[#263326]">Popular in This Circle</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...(circle.popularBooks || []).map((b, i) => ({ title: b, author: '', color: MOCK_BOOKS[i % MOCK_BOOKS.length]?.color || '#7BAE7F' })),
              ...MOCK_BOOKS.filter(b => !(circle.popularBooks || []).includes(b.title))].slice(0, 4).map((book, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-[#E9E3D5] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-4">
                <div className="w-12 h-16 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0" style={{ background: `linear-gradient(135deg, ${book.color}cc, ${book.color})` }}>
                  {book.title.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-sm text-[#263326] leading-tight">{book.title}</p>
                  {book.author && <p className="text-xs text-[#7A8C7A] font-light mt-0.5">{book.author}</p>}
                  <span className="inline-block mt-2 px-2 py-0.5 bg-[#7BAE7F]/10 text-[#4F6F52] border border-[#7BAE7F]/20 text-[10px] font-bold rounded-lg">{circle.category}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CHAT TAB */}
      {activeTab === 'chat' && (
        <div className="animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl border border-[#E9E3D5] shadow-sm overflow-hidden flex flex-col h-[500px]">
            {/* Chat header */}
            <div className="px-5 py-3 border-b border-[#E9E3D5] bg-[#F7F5EF]/60 flex items-center gap-3">
              <div className="w-2 h-2 bg-[#7BAE7F] rounded-full animate-pulse" />
              <p className="font-bold text-sm text-[#263326]">{circle.name} — Group Chat</p>
              <span className="ml-auto text-xs text-[#7A8C7A]">{circle.membersCount || 0} members</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map(msg => (
                <div key={msg.id} className={`flex items-start gap-2.5 ${msg.isMe ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0`} style={{ backgroundColor: msg.color }}>
                    {msg.name.charAt(0)}
                  </div>
                  <div className={`max-w-[70%] ${msg.isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!msg.isMe && <p className="text-[10px] font-bold text-[#7A8C7A] mb-0.5 ml-1">{msg.name}</p>}
                    <div className={`px-4 py-2 rounded-2xl text-sm leading-relaxed ${msg.isMe ? 'bg-[#7BAE7F] text-white rounded-tr-sm' : 'bg-[#F7F5EF] text-[#263326] border border-[#E9E3D5] rounded-tl-sm'}`}>
                      {msg.text}
                    </div>
                    <p className="text-[9px] text-[#A8C9A3] mt-1 mx-1">{msg.time}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-[#E9E3D5] bg-[#F7F5EF]/40 flex gap-2">
              {user ? (
                <>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleChatSend()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 bg-white border border-[#E9E3D5] rounded-xl text-sm text-[#263326] focus:outline-none focus:ring-2 focus:ring-[#7BAE7F] transition-all" />
                  <button onClick={handleChatSend} disabled={!chatInput.trim()}
                    className="px-4 py-2.5 bg-[#7BAE7F] hover:bg-[#4F6F52] text-white rounded-xl transition-all disabled:opacity-50 active:scale-95">
                    <Send size={16} />
                  </button>
                </>
              ) : (
                <p className="text-sm text-[#7A8C7A] py-2">Please <button onClick={() => navigate('/login')} className="text-[#7BAE7F] font-bold underline">log in</button> to chat.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 right-8 bg-[#263326] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 z-[200] border border-[#4F6F52]/40 max-w-xs">
          <CheckCircle2 className="text-[#7BAE7F] flex-shrink-0" size={20} />
          <p className="text-sm font-medium">{toast}</p>
        </div>
      )}
    </div>
  );
};

export default CirclePage;
