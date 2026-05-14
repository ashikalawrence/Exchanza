import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  doc, onSnapshot, updateDoc,
  arrayUnion, arrayRemove, addDoc, collection,
  serverTimestamp, query, orderBy, where, getDocs
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  ArrowLeft, Users, BookOpen, TrendingUp, MessageSquare,
  Send, Plus, Loader2, CheckCircle2, Heart, Clock, Crown, Sparkles, Lock, X
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

const LockedContent = ({ onJoin }) => (
  <div className="bg-white border-2 border-dashed border-[#E9E3D5] rounded-[2rem] p-16 text-center animate-in fade-in duration-500">
    <div className="w-20 h-20 bg-[#F7F5EF] rounded-3xl flex items-center justify-center mx-auto mb-6">
      <Lock size={32} className="text-[#7BAE7F]" />
    </div>
    <h3 className="text-2xl font-bold text-[#263326] mb-3">Member Exclusive Content</h3>
    <p className="text-[#7A8C7A] font-light mb-8 max-w-sm mx-auto leading-relaxed">
      Join this circle to access discussions, books, and group chat. Be part of the conversation!
    </p>
    <button 
      onClick={onJoin}
      className="px-10 py-4 bg-[#7BAE7F] hover:bg-[#4F6F52] text-white font-bold rounded-2xl shadow-lg shadow-[#7BAE7F]/20 transition-all active:scale-95 flex items-center gap-2 mx-auto"
    >
      <Plus size={20} /> Join This Circle
    </button>
  </div>
);


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

  // Chat — Firestore realtime
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  // Circle Books — Firestore realtime
  const [circleBooks, setCircleBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [showAddBook, setShowAddBook] = useState(false);
  const [bookForm, setBookForm] = useState({ title: '', author: '', description: '', genre: '' });
  const [addingBook, setAddingBook] = useState(false);

  // Members state
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  
  const isJoined = circle && user && (circle.joinedUsers || []).includes(user.uid);

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

  // Real-time discussions - only fetch if joined
  useEffect(() => {
    if (!circleId || !isJoined) {
      setPosts([]);
      return;
    }
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
  }, [circleId, isJoined]);

  // Real-time group chat - only fetch if joined
  useEffect(() => {
    if (!circleId || !isJoined) {
      setChatMessages([]);
      return;
    }
    setChatLoading(true);
    const q = query(
      collection(db, 'circleChats', circleId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setChatMessages(msgs);
      setChatLoading(false);
    }, (err) => {
      console.error('[CirclePage] Chat error:', err);
      setChatLoading(false);
    });
    return () => unsub();
  }, [circleId, isJoined]);

  // Real-time circle books — only fetch if joined
  useEffect(() => {
    if (!circleId || !isJoined) {
      setCircleBooks([]);
      return;
    }
    setBooksLoading(true);
    const q = query(
      collection(db, 'circleBooks', circleId, 'books'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setCircleBooks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setBooksLoading(false);
    }, (err) => {
      console.error('[CirclePage] Books error:', err);
      setBooksLoading(false);
    });
    return () => unsub();
  }, [circleId, isJoined]);

  // Fetch members' profiles
  useEffect(() => {
    const fetchMembers = async () => {
      if (!circle?.joinedUsers || circle.joinedUsers.length === 0) {
        setMembers([]);
        return;
      }
      
      setMembersLoading(true);
      try {
        // Firestore whereIn is limited to 30 IDs. For more, we'd need to chunk.
        const uids = circle.joinedUsers.slice(0, 30); 
        const q = query(collection(db, 'users'), where('uid', 'in', uids));
        const snap = await getDocs(q);
        const userProfiles = snap.docs.map(d => d.data());
        
        // Sort to put creator first, then by name
        userProfiles.sort((a, b) => {
          if (a.uid === circle.creatorId) return -1;
          if (b.uid === circle.creatorId) return 1;
          return (a.displayName || '').localeCompare(b.displayName || '');
        });
        
        setMembers(userProfiles);
      } catch (err) {
        console.error('[CirclePage] Members fetch error:', err);
      } finally {
        setMembersLoading(false);
      }
    };

    fetchMembers();
  }, [circle?.joinedUsers, circle?.creatorId]);

  // Scroll chat to bottom on new messages
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);



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

  const handleAddBook = async () => {
    if (!bookForm.title.trim() || !user || addingBook) return;
    setAddingBook(true);
    try {
      await addDoc(collection(db, 'circleBooks', circleId, 'books'), {
        title: bookForm.title.trim(),
        author: bookForm.author.trim() || 'Unknown Author',
        description: bookForm.description.trim(),
        genre: bookForm.genre.trim() || circle.category || 'General',
        sharedById: user.uid,
        sharedByName: user.displayName || 'Anonymous',
        sharedByPhoto: user.photoURL || null,
        circleId,
        createdAt: serverTimestamp(),
      });
      setBookForm({ title: '', author: '', description: '', genre: '' });
      setShowAddBook(false);
      showToast('Book shared with the circle! 📚');
    } catch (e) {
      console.error('[CirclePage] Add book error:', e);
      showToast('Failed to share book. Try again.');
    } finally {
      setAddingBook(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || !user || chatSending) return;
    const text = chatInput.trim();
    setChatInput('');
    setChatSending(true);
    try {
      await addDoc(collection(db, 'circleChats', circleId, 'messages'), {
        senderId: user.uid,
        senderName: user.displayName || 'Anonymous',
        senderProfileImage: user.photoURL || null,
        text,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error('[CirclePage] Chat send error:', e);
      showToast('Failed to send message. Try again.');
      setChatInput(text); // restore input on failure
    } finally {
      setChatSending(false);
    }
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
    { id: 'discussions', label: 'Discussions', icon: !isJoined ? <Lock size={12} className="text-[#A8C9A3]" /> : <MessageSquare size={14} /> },
    { id: 'books', label: 'Books', icon: !isJoined ? <Lock size={12} className="text-[#A8C9A3]" /> : <BookOpen size={14} /> },
    { id: 'chat', label: 'Group Chat', icon: !isJoined ? <Lock size={12} className="text-[#A8C9A3]" /> : <Send size={14} /> },
    { id: 'members', label: 'Members', icon: <Users size={14} /> },
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

      {/* CONTENT AREA */}
      {!isJoined ? (
        <LockedContent onJoin={handleJoin} />
      ) : (
        <>
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
            <div className="animate-in fade-in duration-300 space-y-5">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#263326] flex items-center gap-2">
                  <BookOpen size={16} className="text-[#7BAE7F]" /> Books Shared in This Circle
                </h3>
                <button
                  onClick={() => setShowAddBook(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#7BAE7F] hover:bg-[#4F6F52] text-white text-sm font-bold rounded-xl transition-all active:scale-95 shadow-sm"
                >
                  <Plus size={14} /> Add Book
                </button>
              </div>

              {/* Book list */}
              {booksLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 size={28} className="animate-spin text-[#7BAE7F]" />
                </div>
              ) : circleBooks.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-[#E9E3D5]">
                  <BookOpen size={40} className="mx-auto mb-3 opacity-20 text-[#7BAE7F]" />
                  <p className="font-semibold text-[#263326]">No books shared yet</p>
                  <p className="text-xs text-[#7A8C7A] font-light mt-1">Be the first to share a book with this circle!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {circleBooks.map(book => (
                    <div key={book.id} className="bg-white rounded-2xl p-4 border border-[#E9E3D5] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex gap-4">
                      <div className="w-12 h-16 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0" style={{ background: 'linear-gradient(135deg, #7BAE7Fcc, #4F6F52)' }}>
                        {(book.title || 'B').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-[#263326] leading-tight truncate">{book.title}</p>
                        <p className="text-xs text-[#7A8C7A] mt-0.5 truncate">by {book.author}</p>
                        {book.description && (
                          <p className="text-xs text-[#4F6F52] mt-1.5 line-clamp-2 leading-relaxed">{book.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2 py-0.5 bg-[#7BAE7F]/10 text-[#4F6F52] border border-[#7BAE7F]/20 text-[10px] font-bold rounded-lg">{book.genre}</span>
                          <span className="text-[10px] text-[#A8C9A3] flex items-center gap-1 ml-auto">
                            <Clock size={9} /> {timeAgo(book.createdAt)}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#7A8C7A] mt-1">shared by <span className="font-semibold">{book.sharedByName}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                  {chatLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <Loader2 size={24} className="animate-spin text-[#7BAE7F]" />
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-[#7A8C7A]">
                      <MessageSquare size={32} className="opacity-20 mb-2" />
                      <p className="text-sm font-light">No messages yet. Say hi!</p>
                    </div>
                  ) : chatMessages.map(msg => {
                    const isMe = msg.senderId === user?.uid;
                    return (
                      <div key={msg.id} className={`flex items-end gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                        {/* Avatar */}
                        {msg.senderProfileImage ? (
                          <img
                            src={msg.senderProfileImage}
                            alt={msg.senderName}
                            className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-[#E9E3D5]"
                            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                          />
                        ) : null}
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${msg.senderProfileImage ? 'hidden' : 'flex'}`}
                          style={{ backgroundColor: '#7BAE7F' }}
                        >
                          {(msg.senderName || 'U').charAt(0).toUpperCase()}
                        </div>
                        {/* Bubble */}
                        <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          {!isMe && (
                            <p className="text-[10px] font-bold text-[#7A8C7A] mb-0.5 ml-1">{msg.senderName}</p>
                          )}
                          <div className={`px-4 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                            isMe
                              ? 'bg-[#7BAE7F] text-white rounded-tr-sm'
                              : 'bg-[#F7F5EF] text-[#263326] border border-[#E9E3D5] rounded-tl-sm'
                          }`}>
                            {msg.text}
                          </div>
                          <p className="text-[9px] text-[#A8C9A3] mt-1 mx-1">{timeAgo(msg.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="px-4 py-3 border-t border-[#E9E3D5] bg-[#F7F5EF]/40 flex gap-2">
                  {user ? (
                    <>
                      <input
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChatSend()}
                        placeholder="Type a message..."
                        disabled={chatSending}
                        className="flex-1 px-4 py-2.5 bg-white border border-[#E9E3D5] rounded-xl text-sm text-[#263326] focus:outline-none focus:ring-2 focus:ring-[#7BAE7F] transition-all disabled:opacity-60" />
                      <button
                        onClick={handleChatSend}
                        disabled={!chatInput.trim() || chatSending}
                        className="px-4 py-2.5 bg-[#7BAE7F] hover:bg-[#4F6F52] text-white rounded-xl transition-all disabled:opacity-50 active:scale-95">
                        {chatSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-[#7A8C7A] py-2">Please <button onClick={() => navigate('/login')} className="text-[#7BAE7F] font-bold underline">log in</button> to chat.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MEMBERS TAB */}
          {activeTab === 'members' && (
            <div className="animate-in fade-in duration-300 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-[#263326] flex items-center gap-2">
                  <Users size={16} className="text-[#7BAE7F]" /> Community Members
                </h3>
                <span className="text-xs text-[#7A8C7A] bg-[#F7F5EF] px-3 py-1 rounded-full border border-[#E9E3D5]">
                  {circle.membersCount || 0} Total
                </span>
              </div>

              {membersLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={28} className="animate-spin text-[#7BAE7F]" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {members.map(member => (
                    <div key={member.uid} className="bg-white rounded-2xl p-4 border border-[#E9E3D5] shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                      {member.photoURL ? (
                        <img 
                          src={member.photoURL} 
                          alt={member.displayName} 
                          className="w-12 h-12 rounded-full object-cover border-2 border-[#F7F5EF]"
                        />
                      ) : (
                        <Avatar name={member.displayName} color="#7BAE7F" size={12} />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-[#263326] truncate">{member.displayName}</p>
                          {member.uid === circle.creatorId && (
                            <span className="px-1.5 py-0.5 bg-[#7BAE7F]/15 text-[#4F6F52] text-[9px] font-bold rounded border border-[#7BAE7F]/20 flex items-center gap-0.5">
                              <Crown size={8} /> Creator
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#7A8C7A] font-light">
                          Joined {member.createdAt ? new Date(member.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'recently'}
                        </p>
                      </div>
                      
                      {member.uid === user?.uid && (
                        <span className="text-[10px] font-bold text-[#7BAE7F] bg-[#7BAE7F]/10 px-2 py-0.5 rounded-full">You</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Add Book Modal */}
      {showAddBook && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#263326]/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-[#E9E3D5] flex items-center justify-between">
              <div>
                <h2 className="font-bold text-[#263326] text-lg flex items-center gap-2"><BookOpen size={18} className="text-[#7BAE7F]" /> Share a Book</h2>
                <p className="text-xs text-[#7A8C7A] font-light mt-0.5">Recommend a book to this circle</p>
              </div>
              <button onClick={() => { setShowAddBook(false); setBookForm({ title: '', author: '', description: '', genre: '' }); }} className="p-2 text-[#7A8C7A] hover:text-[#263326] hover:bg-[#F7F5EF] rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {[{ label: 'Book Title *', key: 'title', placeholder: 'e.g. Atomic Habits' },
                { label: 'Author', key: 'author', placeholder: 'e.g. James Clear' },
                { label: 'Genre', key: 'genre', placeholder: 'e.g. Self-Help' }].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-bold text-[#4F6F52] mb-1.5">{label}</label>
                  <input
                    type="text"
                    value={bookForm[key]}
                    onChange={e => setBookForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    maxLength={100}
                    className="w-full px-4 py-3 bg-[#F7F5EF] border border-[#E9E3D5] rounded-xl text-sm text-[#263326] focus:outline-none focus:ring-2 focus:ring-[#7BAE7F] transition-all"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-bold text-[#4F6F52] mb-1.5">Why do you recommend it?</label>
                <textarea
                  rows={3}
                  value={bookForm.description}
                  onChange={e => setBookForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="A short reason or review..."
                  maxLength={300}
                  className="w-full px-4 py-3 bg-[#F7F5EF] border border-[#E9E3D5] rounded-xl text-sm text-[#263326] focus:outline-none focus:ring-2 focus:ring-[#7BAE7F] resize-none transition-all"
                />
              </div>
              <button
                onClick={handleAddBook}
                disabled={!bookForm.title.trim() || addingBook}
                className="w-full py-3.5 bg-[#7BAE7F] hover:bg-[#4F6F52] text-white font-bold rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2"
              >
                {addingBook ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                {addingBook ? 'Sharing...' : 'Share with Circle'}
              </button>
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
