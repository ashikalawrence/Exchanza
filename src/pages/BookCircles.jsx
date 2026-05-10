import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, BookOpen, Plus, X, CheckCircle2, Sparkles, TrendingUp, MessageSquare, Clock, Crown, Loader2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  collection, addDoc, onSnapshot, doc,
  updateDoc, arrayUnion, arrayRemove,
  serverTimestamp, query, orderBy, getDocs
} from 'firebase/firestore';
import { db } from '../firebase/config';

const SEED_CIRCLES = [
  { name: 'Self-Help & Growth', emoji: '🌱', category: 'Self-Help', description: 'A circle for readers who believe in constant self-improvement through books on habits, productivity, and mindset.', popularBooks: ['Atomic Habits', 'Deep Work', 'The Power of Now'], discussions: [{ user: 'Priya S.', text: 'Atomic Habits completely changed my morning routine!', time: '2h ago' }, { user: 'Arjun M.', text: 'Has anyone tried the 5-second rule from Mel Robbins?', time: '4h ago' }], trending: 'Atomic Habits', color: '#7BAE7F', activity: 'Very Active' },
  { name: 'Fiction Club', emoji: '📖', category: 'Fiction', description: 'Escape into worlds of imagination. We discuss novels, short stories, and literary fiction from around the globe.', popularBooks: ['The Alchemist', 'The Midnight Library', 'The Great Gatsby'], discussions: [{ user: 'Deepika R.', text: 'The Midnight Library made me cry. Highly recommend!', time: '1h ago' }, { user: 'Kiran N.', text: 'Anyone have a copy of Dune to exchange?', time: '3h ago' }], trending: 'The Midnight Library', color: '#4F6F52', activity: 'Active' },
  { name: 'AI & Tech Readers', emoji: '🤖', category: 'Technology', description: 'For curious minds exploring artificial intelligence, machine learning, and the future of technology through books.', popularBooks: ['Life 3.0', 'The Alignment Problem', 'Zero to One'], discussions: [{ user: 'Arjun M.', text: "Life 3.0 is the best intro to AI ethics I've read.", time: '30m ago' }], trending: 'Life 3.0', color: '#263326', activity: 'Growing' },
  { name: 'Startup & Finance', emoji: '📈', category: 'Non-Fiction', description: 'Building businesses, understanding money, and learning from the greatest entrepreneurs and investors.', popularBooks: ['Zero to One', 'Rich Dad Poor Dad', 'The Lean Startup'], discussions: [{ user: 'Kiran N.', text: 'Zero to One changed my entire view on competition.', time: '5h ago' }], trending: 'Zero to One', color: '#6B9080', activity: 'Active' },
  { name: 'Philosophy Corner', emoji: '🧠', category: 'Philosophy', description: 'Deep dives into existentialism, stoicism, and the great philosophical questions that define our humanity.', popularBooks: ["Man's Search for Meaning", 'Meditations', 'Sapiens'], discussions: [{ user: 'Priya S.', text: 'Meditations by Marcus Aurelius is timeless wisdom.', time: '3h ago' }], trending: 'Meditations', color: '#A8C9A3', activity: 'Steady' },
  { name: 'Science Fiction Hub', emoji: '🚀', category: 'Science Fiction', description: 'Exploring the cosmos, alternate realities, and futures yet imagined. From classic Asimov to modern Weir.', popularBooks: ['Dune', 'Project Hail Mary', 'Foundation'], discussions: [{ user: 'Meera I.', text: 'Project Hail Mary is the best sci-fi of the decade!', time: '1h ago' }], trending: 'Project Hail Mary', color: '#E2A98B', activity: 'Very Active' },
];

const CATEGORIES = ['All', 'Self-Help', 'Fiction', 'Technology', 'Non-Fiction', 'Philosophy', 'Science Fiction'];
const ACTIVITY_COLORS = { 'Very Active': '#7BAE7F', 'Active': '#4F6F52', 'Growing': '#A8C9A3', 'Steady': '#6B9080' };

const ActivityBadge = ({ label }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
    style={{ backgroundColor: `${ACTIVITY_COLORS[label] || '#7BAE7F'}20`, color: ACTIVITY_COLORS[label] || '#7BAE7F' }}>
    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: ACTIVITY_COLORS[label] || '#7BAE7F' }} />
    {label}
  </span>
);

const CircleCard = ({ circle, joined, onJoin, onView, joining }) => (
  <div className="group bg-white/80 backdrop-blur-sm border border-[#E9E3D5] rounded-3xl p-6 hover:shadow-[0_12px_40px_rgba(79,111,82,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden relative">
    <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none" style={{ backgroundColor: circle.color }} />
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm" style={{ backgroundColor: `${circle.color}20` }}>{circle.emoji || '📚'}</div>
        <div>
          <h3 className="font-bold text-[#263326] text-base leading-tight">{circle.name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-[#7A8C7A] font-light flex items-center gap-1"><Users size={11} /> {(circle.membersCount || 0).toLocaleString()} members</span>
            <ActivityBadge label={circle.activity || 'Active'} />
          </div>
        </div>
      </div>
    </div>
    <p className="text-sm text-[#7A8C7A] font-light leading-relaxed mb-4 line-clamp-2">{circle.description}</p>
    {(circle.popularBooks || []).length > 0 && (
      <div className="mb-4">
        <p className="text-xs font-bold text-[#4F6F52] mb-2 flex items-center gap-1"><BookOpen size={12} /> Popular Books</p>
        <div className="flex flex-wrap gap-1.5">
          {(circle.popularBooks || []).slice(0, 3).map(b => (
            <span key={b} className="px-2 py-1 bg-[#F7F5EF] border border-[#E9E3D5] text-[#4F6F52] text-[11px] font-medium rounded-lg">{b}</span>
          ))}
        </div>
      </div>
    )}
    {circle.trending && (
      <div className="flex items-center gap-2 mb-5 px-3 py-2 bg-[#F7F5EF] rounded-xl border border-[#E9E3D5]">
        <TrendingUp size={13} className="text-[#7BAE7F]" />
        <p className="text-xs text-[#7A8C7A] font-light">Trending: <span className="font-semibold text-[#263326]">{circle.trending}</span></p>
      </div>
    )}
    <div className="flex gap-2 mt-auto">
      <Link to={`/circles/${circle.id}`} className="flex-1 flex items-center justify-center py-2.5 text-sm font-semibold text-[#4F6F52] border border-[#E9E3D5] hover:border-[#7BAE7F] hover:bg-[#F7F5EF] rounded-xl transition-all">View Circle</Link>
      <button onClick={() => onJoin(circle)} disabled={joining === circle.id}
        className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all active:scale-95 disabled:opacity-60 ${joined ? 'bg-[#7BAE7F]/15 text-[#4F6F52] border border-[#7BAE7F]/30' : 'bg-[#263326] hover:bg-[#4F6F52] text-white shadow-sm'}`}>
        {joining === circle.id ? '...' : joined ? '✓ Joined' : 'Join Circle'}
      </button>
    </div>
  </div>
);

const BookCircles = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [circles, setCircles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [newCircle, setNewCircle] = useState({ name: '', category: 'Fiction', description: '' });
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  // Seed default circles if collection is empty
  const seedCircles = async () => {
    const snap = await getDocs(collection(db, 'bookCircles'));
    if (snap.empty) {
      for (const c of SEED_CIRCLES) {
        await addDoc(collection(db, 'bookCircles'), {
          ...c,
          joinedUsers: [],
          membersCount: Math.floor(Math.random() * 120) + 30,
          creatorId: 'system',
          creatorName: 'Exchanza',
          createdAt: serverTimestamp(),
        });
      }
    }
  };

  // Real-time listener
  useEffect(() => {
    seedCircles();
    const q = query(collection(db, 'bookCircles'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setCircles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const isJoined = (circle) => user && (circle.joinedUsers || []).includes(user.uid);

  const handleJoin = async (circle) => {
    if (!user) { showToast('Please log in to join circles.'); return; }
    setJoining(circle.id);
    try {
      const ref = doc(db, 'bookCircles', circle.id);
      const joined = isJoined(circle);
      await updateDoc(ref, {
        joinedUsers: joined ? arrayRemove(user.uid) : arrayUnion(user.uid),
        membersCount: joined ? (circle.membersCount || 1) - 1 : (circle.membersCount || 0) + 1,
      });
      if (!joined) showToast(`Joined "${circle.name}"! Welcome to the community 🎉`);
      else showToast(`You left "${circle.name}".`);
    } catch (e) {
      console.error(e);
      showToast('Something went wrong. Try again.');
    } finally {
      setJoining(null);
    }
  };

  const handleCreate = async () => {
    if (!newCircle.name.trim()) return;
    if (!user) { showToast('Please log in to create a circle.'); return; }
    setCreating(true);
    try {
      const ref = await addDoc(collection(db, 'bookCircles'), {
        name: newCircle.name.trim(),
        emoji: '✨',
        category: newCircle.category,
        description: newCircle.description.trim() || 'A brand new reading circle. Join to get started!',
        popularBooks: [],
        discussions: [],
        trending: '—',
        color: '#7BAE7F',
        activity: 'Growing',
        joinedUsers: [user.uid],
        membersCount: 1,
        creatorId: user.uid,
        creatorName: user.displayName || 'Anonymous',
        createdAt: serverTimestamp(),
      });
      setShowCreateModal(false);
      setNewCircle({ name: '', category: 'Fiction', description: '' });
      showToast(`Circle "${newCircle.name}" created! You are the founding member 👑`);
    } catch (e) {
      console.error(e);
      showToast('Failed to create circle. Try again.');
    } finally {
      setCreating(false);
    }
  };

  const filtered = activeCategory === 'All' ? circles : circles.filter(c => c.category === activeCategory);
  const joinedCount = user ? circles.filter(c => isJoined(c)).length : 0;
  const inputClass = "w-full px-4 py-3 bg-[#F7F5EF] border border-[#E9E3D5] rounded-xl text-sm text-[#263326] focus:outline-none focus:ring-2 focus:ring-[#7BAE7F] transition-all";

  return (
    <div className="pb-24 pt-10 px-6 lg:px-12 max-w-7xl mx-auto">
      <div className="mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[#7A8C7A] hover:text-[#263326] text-sm font-medium px-4 py-2 bg-white border border-[#E9E3D5] rounded-xl shadow-sm hover:bg-[#F7F5EF] transition-all">
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      {/* Hero */}
      <div className="relative bg-[#263326] rounded-[2rem] p-10 mb-10 overflow-hidden text-white">
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#7BAE7F] rounded-full blur-[120px] opacity-10 pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#7BAE7F] flex items-center justify-center"><Sparkles size={13} className="text-white" /></div>
              <span className="text-xs font-bold tracking-widest text-[#A8C9A3] uppercase">Campus Book Circles</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Find Your Reading Tribe</h1>
            <p className="text-[#A8C9A3] font-light max-w-lg">Join genre-based circles, discover books with your community, and share your reading journey.</p>
            <div className="flex items-center gap-6 pt-2">
              <div><p className="text-2xl font-bold">{circles.length}</p><p className="text-[11px] text-[#7A8C7A] font-light">Active Circles</p></div>
              <div className="w-px h-8 bg-white/10" />
              <div><p className="text-2xl font-bold">{circles.reduce((s, c) => s + (c.membersCount || 0), 0).toLocaleString()}</p><p className="text-[11px] text-[#7A8C7A] font-light">Total Members</p></div>
              <div className="w-px h-8 bg-white/10" />
              <div><p className="text-2xl font-bold">{joinedCount}</p><p className="text-[11px] text-[#7A8C7A] font-light">Circles Joined</p></div>
            </div>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-7 py-4 bg-[#7BAE7F] hover:bg-[#A8C9A3] hover:text-[#263326] text-white font-bold rounded-2xl transition-all active:scale-95 shadow-lg flex-shrink-0">
            <Plus size={20} /> Create Circle
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap mb-8">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${activeCategory === cat ? 'bg-[#263326] text-white border-[#263326] shadow-sm' : 'bg-white text-[#7A8C7A] border-[#E9E3D5] hover:border-[#7BAE7F] hover:text-[#4F6F52]'}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-24"><Loader2 size={36} className="animate-spin text-[#7BAE7F]" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(circle => (
            <CircleCard key={circle.id} circle={circle} joined={isJoined(circle)} joining={joining} onJoin={handleJoin} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-20 text-[#7A8C7A]">
              <p className="text-lg font-light">No circles in this category yet.</p>
              <button onClick={() => setShowCreateModal(true)} className="mt-4 px-6 py-2.5 bg-[#7BAE7F] text-white font-bold rounded-xl hover:bg-[#4F6F52] transition-all">Create the first one!</button>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#263326]/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-[#E9E3D5] flex items-center justify-between">
              <div>
                <h2 className="font-bold text-[#263326] text-lg flex items-center gap-2"><Crown size={18} className="text-[#7BAE7F]" /> Create a Circle</h2>
                <p className="text-xs text-[#7A8C7A] font-light mt-0.5">Visible to all Exchanza users instantly</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 text-[#7A8C7A] hover:text-[#263326] hover:bg-[#F7F5EF] rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#4F6F52] mb-1.5">Circle Name *</label>
                <input type="text" value={newCircle.name} onChange={e => setNewCircle({ ...newCircle, name: e.target.value })} placeholder="e.g. History Buffs Club" className={inputClass} maxLength={50} />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#4F6F52] mb-1.5">Category</label>
                <select value={newCircle.category} onChange={e => setNewCircle({ ...newCircle, category: e.target.value })} className={inputClass}>
                  {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#4F6F52] mb-1.5">Description</label>
                <textarea rows={3} value={newCircle.description} onChange={e => setNewCircle({ ...newCircle, description: e.target.value })} placeholder="What will your circle be about?" className={`${inputClass} resize-none`} maxLength={200} />
              </div>
              <button onClick={handleCreate} disabled={!newCircle.name.trim() || creating}
                className="w-full py-3.5 bg-[#7BAE7F] hover:bg-[#4F6F52] text-white font-bold rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2">
                {creating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                {creating ? 'Creating...' : 'Create My Circle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 right-8 bg-[#263326] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 z-[200] border border-[#4F6F52]/40 max-w-sm">
          <CheckCircle2 className="text-[#7BAE7F] flex-shrink-0" size={22} />
          <p className="text-sm font-medium">{toast}</p>
        </div>
      )}
    </div>
  );
};

export default BookCircles;
