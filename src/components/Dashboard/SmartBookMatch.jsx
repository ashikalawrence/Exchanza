import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Zap, BookOpen, Users, Tag, TrendingUp, ChevronRight, Star, X, Send } from 'lucide-react';

// ─── Mock recommendation engine ──────────────────────────────────────────────

const MOCK_USERS = [
  { id: 'u1', name: 'Priya Sharma',    avatar: 'P', color: '#7BAE7F', genres: ['Fiction', 'Self-Help', 'Philosophy'],          city: 'Salem',     books: 12 },
  { id: 'u2', name: 'Arjun Mehta',     avatar: 'A', color: '#4F6F52', genres: ['Science Fiction', 'Technology', 'Non-Fiction'],  city: 'Chennai',   books: 8  },
  { id: 'u3', name: 'Deepika Raj',     avatar: 'D', color: '#A8C9A3', genres: ['Biography', 'History', 'Non-Fiction'],          city: 'Coimbatore', books: 15 },
  { id: 'u4', name: 'Kiran Nair',      avatar: 'K', color: '#6B9080', genres: ['Fantasy', 'Fiction', 'Mystery'],               city: 'Bangalore',  books: 6  },
  { id: 'u5', name: 'Meera Iyer',      avatar: 'M', color: '#E2A98B', genres: ['Self-Help', 'Philosophy', 'Science Fiction'],   city: 'Madurai',   books: 20 },
];

const MOCK_BOOK_POOL = [
  { id: 'b1', title: 'Atomic Habits',        author: 'James Clear',         category: 'Self-Help',      tags: ['productivity', 'habits', 'psychology'],       coverColor: '#7BAE7F', type: 'Exchange', condition: 'Like New' },
  { id: 'b2', title: 'Sapiens',              author: 'Yuval Noah Harari',   category: 'History',        tags: ['history', 'human evolution', 'society'],       coverColor: '#4F6F52', type: 'Exchange', condition: 'Good'     },
  { id: 'b3', title: 'The Alchemist',        author: 'Paulo Coelho',        category: 'Fiction',        tags: ['journey', 'philosophy', 'inspiration'],        coverColor: '#A8C9A3', type: 'Donate',   condition: 'Fair'     },
  { id: 'b4', title: 'Dune',                 author: 'Frank Herbert',       category: 'Science Fiction',tags: ['space', 'sci-fi', 'politics', 'epic'],         coverColor: '#263326', type: 'Exchange', condition: 'Good'     },
  { id: 'b5', title: 'Deep Work',            author: 'Cal Newport',         category: 'Self-Help',      tags: ['productivity', 'focus', 'career'],             coverColor: '#6B9080', type: 'Exchange', condition: 'Like New' },
  { id: 'b6', title: 'Project Hail Mary',    author: 'Andy Weir',          category: 'Science Fiction',tags: ['space', 'survival', 'sci-fi'],                 coverColor: '#E2A98B', type: 'Exchange', condition: 'Like New' },
  { id: 'b7', title: 'Man\'s Search for Meaning', author: 'Viktor Frankl', category: 'Philosophy',     tags: ['philosophy', 'psychology', 'purpose'],         coverColor: '#7BAE7F', type: 'Donate',   condition: 'Good'     },
  { id: 'b8', title: 'The Great Gatsby',     author: 'F. Scott Fitzgerald', category: 'Fiction',        tags: ['classic', 'society', 'american dream'],        coverColor: '#4F6F52', type: 'Exchange', condition: 'Fair'     },
  { id: 'b9', title: 'Thinking, Fast & Slow',author: 'Daniel Kahneman',    category: 'Non-Fiction',    tags: ['psychology', 'decision-making', 'cognitive'],  coverColor: '#A8C9A3', type: 'Exchange', condition: 'Good'     },
  { id: 'b10', title: 'The Power of Now',    author: 'Eckhart Tolle',       category: 'Philosophy',     tags: ['mindfulness', 'philosophy', 'spirituality'],   coverColor: '#263326', type: 'Donate',   condition: 'Like New' },
];

const REASONS = {
  category:  'same genre',
  tag:       'shared interests',
  author:    'same author style',
  popular:   'trending in community',
  wishlist:  'matches your wishlist',
};

/** Score 0–100 between a seed book and a candidate */
function scoreBook(seed, candidate) {
  if (seed.id === candidate.id) return 0;
  let score = 0;
  const reasons = [];

  if (seed.category && seed.category === candidate.category) {
    score += 40;
    reasons.push(REASONS.category);
  }
  if (seed.author && seed.author === candidate.author) {
    score += 30;
    reasons.push(REASONS.author);
  }
  const seedTags  = seed.tags  || [];
  const candTags  = candidate.tags || [];
  const shared    = seedTags.filter(t => candTags.includes(t));
  if (shared.length > 0) {
    score += Math.min(shared.length * 15, 30);
    reasons.push(REASONS.tag);
  }
  // Popularity boost (mock)
  if (score === 0) { score = 10 + Math.floor(Math.random() * 15); reasons.push(REASONS.popular); }

  return { score: Math.min(score, 98), reasons: [...new Set(reasons)] };
}

/** Score 0–100 between a seed book and a user */
function scoreUser(seed, user) {
  let score = 0;
  const reasons = [];
  if (user.genres.includes(seed.category)) {
    score += 45;
    reasons.push(`enjoys ${seed.category}`);
  }
  const seedTags = seed.tags || [];
  const tagHints = { 'productivity': 'Self-Help', 'space': 'Science Fiction', 'philosophy': 'Philosophy', 'history': 'History' };
  seedTags.forEach(tag => {
    const mappedGenre = tagHints[tag];
    if (mappedGenre && user.genres.includes(mappedGenre)) {
      score += 15;
      reasons.push(`loves ${tag} books`);
    }
  });
  if (score === 0) { score = 55 + Math.floor(Math.random() * 20); reasons.push('similar reading habits'); }
  return { score: Math.min(score + 20, 99), reasons: [...new Set(reasons)] };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const AiBadge = ({ label = 'AI Suggested' }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-[#7BAE7F] to-[#4F6F52] text-white shadow-sm">
    <Sparkles size={9} /> {label}
  </span>
);

const MatchBar = ({ score }) => (
  <div className="flex items-center gap-2 mt-1">
    <div className="flex-1 h-1.5 bg-[#E9E3D5] rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-[#A8C9A3] to-[#4F6F52] rounded-full transition-all duration-700"
        style={{ width: `${score}%` }}
      />
    </div>
    <span className="text-xs font-bold text-[#4F6F52] w-8 text-right">{score}%</span>
  </div>
);

const BookMatchCard = ({ book, score, reasons }) => (
  <div className="group relative bg-white/70 backdrop-blur-sm border border-[#E9E3D5] rounded-2xl p-4 hover:shadow-[0_8px_32px_rgba(79,111,82,0.14)] hover:-translate-y-1 transition-all duration-300 overflow-hidden">
    {/* Decorative glow */}
    <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-[#7BAE7F] blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none" />

    <div className="flex items-start gap-3">
      {/* Cover swatch */}
      <div
        className="w-12 h-16 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold text-lg shadow-md"
        style={{ background: `linear-gradient(135deg, ${book.coverColor}cc, ${book.coverColor})` }}
      >
        {book.title.charAt(0)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1 mb-0.5">
          <h4 className="font-bold text-sm text-[#263326] leading-tight line-clamp-1">{book.title}</h4>
          <AiBadge />
        </div>
        <p className="text-xs text-[#7A8C7A] font-light mb-2 truncate">{book.author}</p>

        <MatchBar score={score} />

        <div className="flex flex-wrap gap-1 mt-2">
          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${book.type === 'Exchange' ? 'bg-[#7BAE7F]/10 text-[#4F6F52] border-[#7BAE7F]/20' : 'bg-[#E9E3D5] text-[#4F6F52] border-[#A8C9A3]/30'}`}>
            {book.type}
          </span>
          {reasons.slice(0, 1).map(r => (
            <span key={r} className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-[#F7F5EF] text-[#7A8C7A] border border-[#E9E3D5] flex items-center gap-1">
              <Tag size={8} /> {r}
            </span>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const UserMatchCard = ({ user, score, reasons, onClick }) => (
  <div 
    onClick={() => onClick(user)}
    className="cursor-pointer group relative bg-white/70 backdrop-blur-sm border border-[#E9E3D5] rounded-2xl p-4 hover:shadow-[0_8px_32px_rgba(79,111,82,0.12)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-[#7BAE7F]/0 to-[#4F6F52]/0 group-hover:from-[#7BAE7F]/5 group-hover:to-[#4F6F52]/5 transition-all duration-500 rounded-2xl pointer-events-none" />

    <div className="flex items-center gap-3 mb-3">
      <div
        className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-base shadow-md ring-2 ring-white"
        style={{ backgroundColor: user.color }}
      >
        {user.avatar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-sm text-[#263326] truncate">{user.name}</h4>
          <AiBadge label="Best Match" />
        </div>
        <p className="text-[11px] text-[#7A8C7A] font-light">{user.city} · {user.books} books</p>
      </div>
    </div>

    <MatchBar score={score} />

    <p className="mt-3 text-[11px] text-[#7A8C7A] font-light leading-relaxed italic">
      "{score}% match — {reasons.slice(0, 2).join(' & ')}."
    </p>

    <div className="flex flex-wrap gap-1 mt-2">
      {user.genres.slice(0, 3).map(g => (
        <span key={g} className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-[#DDE5D3] text-[#4F6F52]">{g}</span>
      ))}
    </div>
  </div>
);

const InsightCard = ({ icon, label, value, sub }) => (
  <div className="bg-white/60 backdrop-blur-sm border border-[#E9E3D5] rounded-2xl p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
    <div className="w-10 h-10 bg-gradient-to-br from-[#A8C9A3] to-[#7BAE7F] rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm">
      {icon}
    </div>
    <div>
      <p className="text-xs text-[#7A8C7A] font-light">{label}</p>
      <p className="font-bold text-[#263326] text-sm">{value}</p>
      {sub && <p className="text-[10px] text-[#7BAE7F] font-medium">{sub}</p>}
    </div>
  </div>
);

// ─── Main exported component ──────────────────────────────────────────────────

/**
 * SmartBookMatch
 * Props:
 *   seedBook  – the book to base recommendations on (must have: category, tags, author)
 *   allBooks  – live books from Firestore (falls back to mock pool if empty)
 */
const SmartBookMatch = ({ seedBook, allBooks = [] }) => {
  const [activeTab, setActiveTab] = useState('books');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAIInfo, setShowAIInfo] = useState(false);
  const [message, setMessage] = useState('');
  const [messageSent, setMessageSent] = useState(false);

  // Merge Firestore books with mock pool, prefer real data
  const pool = useMemo(() => {
    const realBooks = allBooks.map(b => ({
      ...b,
      tags: b.tags || [],
      coverColor: b.coverColor || '#7BAE7F',
      type: b.listingType || b.type || 'Exchange',
    }));
    return realBooks.length >= 4 ? realBooks : [...realBooks, ...MOCK_BOOK_POOL];
  }, [allBooks]);

  // Compute ranked book recommendations
  const bookRecs = useMemo(() => {
    if (!seedBook) return [];
    return pool
      .map(b => ({ book: b, ...scoreBook(seedBook, b) }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [seedBook, pool]);

  // Compute ranked user matches
  const userRecs = useMemo(() => {
    if (!seedBook) return [];
    return MOCK_USERS
      .map(u => ({ user: u, ...scoreUser(seedBook, u) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [seedBook]);

  const topCategory   = seedBook?.category || 'Books';
  const topMatch      = userRecs[0];
  const avgScore      = bookRecs.length ? Math.round(bookRecs.reduce((s, r) => s + r.score, 0) / bookRecs.length) : 0;

  if (!seedBook) return null;

  return (
    <div className="mt-10">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#7BAE7F] to-[#4F6F52] flex items-center justify-center">
              <Sparkles size={13} className="text-white" />
            </div>
            <span className="text-xs font-bold tracking-widest text-[#7BAE7F] uppercase">Smart Book Match</span>
          </div>
          <h2 className="text-2xl font-bold text-[#263326] tracking-tight">Recommended For You</h2>
          <p className="text-sm text-[#7A8C7A] font-light max-w-lg">
            Based on <span className="font-semibold text-[#4F6F52]">{topCategory}</span> preferences and community reading patterns.
          </p>
        </div>
        <button 
          onClick={() => setShowAIInfo(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#263326] hover:bg-[#4F6F52] rounded-2xl shadow-sm transition-colors cursor-pointer active:scale-95"
        >
          <Zap size={14} className="text-[#7BAE7F]" />
          <span className="text-xs font-bold text-white">AI-Powered</span>
        </button>
      </div>

      {/* Quick Insight Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <InsightCard icon={<Star size={18}/>}       label="Avg Match Score"  value={`${avgScore}%`}             sub="across recommendations" />
        <InsightCard icon={<BookOpen size={18}/>}   label="Similar Books"    value={`${bookRecs.length} found`} sub="in your genre" />
        <InsightCard icon={<Users size={18}/>}      label="Best User Match"  value={topMatch?.user.name || '—'} sub={topMatch ? `${topMatch.score}% compatible` : ''} />
        <InsightCard icon={<TrendingUp size={18}/>} label="Trending Genre"   value={topCategory}                sub="most active this week" />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 bg-[#F7F5EF] rounded-2xl p-1.5 w-fit border border-[#E9E3D5]">
        {[
          { id: 'books', label: 'Similar Books', icon: <BookOpen size={14}/> },
          { id: 'users', label: 'Exchange Matches', icon: <Users size={14}/> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-[#263326] text-white shadow-md'
                : 'text-[#7A8C7A] hover:text-[#263326]'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Books Tab */}
      {activeTab === 'books' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {bookRecs.map(({ book, score, reasons }) => (
              <BookMatchCard key={book.id} book={book} score={score} reasons={reasons} />
            ))}
          </div>

          {/* Insight callout */}
          <div className="mt-4 p-5 bg-gradient-to-r from-[#263326] to-[#4F6F52] rounded-2xl flex items-center gap-4 text-white shadow-lg">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles size={20} className="text-[#A8C9A3]" />
            </div>
            <div>
              <p className="font-bold text-sm">Smart Insight</p>
              <p className="text-[#A8C9A3] text-xs font-light mt-0.5">
                Readers who enjoyed <strong className="text-white">{seedBook.title || topCategory + ' books'}</strong> also 
                loved books on <strong className="text-white">{(seedBook.tags || []).slice(0,2).join(' & ') || 'similar themes'}</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {userRecs.map(({ user, score, reasons }) => (
              <UserMatchCard key={user.id} user={user} score={score} reasons={reasons} onClick={setSelectedUser} />
            ))}
          </div>

          {/* Top match banner */}
          {topMatch && (
            <div className="mt-4 p-5 bg-white border-2 border-[#A8C9A3] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-md flex-shrink-0"
                style={{ backgroundColor: topMatch.user.color }}
              >
                {topMatch.user.avatar}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-[#263326]">Best Exchange Match</p>
                  <AiBadge label="Top Pick" />
                </div>
                <p className="text-sm text-[#7A8C7A] font-light">
                  <strong className="text-[#263326]">{topMatch.user.name}</strong> from {topMatch.user.city} — {topMatch.score}% match.{' '}
                  {topMatch.reasons.slice(0,2).join(' & ')}.
                </p>
              </div>
              <button 
                onClick={() => setSelectedUser(topMatch.user)}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-[#7BAE7F] hover:bg-[#4F6F52] text-white text-sm font-bold rounded-xl transition-all active:scale-95 flex-shrink-0 shadow-sm"
              >
                Connect <ChevronRight size={14}/>
              </button>
            </div>
          )}
        </div>
      )}

      {/* AI Info Modal */}
      {showAIInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#263326]/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 relative animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setShowAIInfo(false)} 
              className="absolute top-4 right-4 p-2 text-[#7A8C7A] hover:text-[#263326] hover:bg-[#F7F5EF] rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <div className="w-12 h-12 bg-[#7BAE7F]/20 text-[#7BAE7F] rounded-2xl flex items-center justify-center mb-4">
              <Zap size={24} />
            </div>
            <h3 className="text-lg font-bold text-[#263326] mb-2">Smart Recommendations</h3>
            <p className="text-sm text-[#7A8C7A] font-light leading-relaxed">
              Recommendations generated using category similarity, reading patterns, and community engagement metrics.
            </p>
            <button 
              onClick={() => setShowAIInfo(false)} 
              className="mt-6 w-full py-2.5 bg-[#F7F5EF] text-[#4F6F52] font-semibold rounded-xl hover:bg-[#E9E3D5] transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Connect / User Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#263326]/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 slide-in-from-bottom-5 duration-300">
            <div className="px-6 pt-6 pb-4 border-b border-[#E9E3D5] flex items-center justify-between bg-[#F7F5EF]/50">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-inner" 
                  style={{ backgroundColor: selectedUser.color }}
                >
                  {selectedUser.avatar}
                </div>
                <div>
                  <h3 className="font-bold text-[#263326] flex items-center gap-2">
                    {selectedUser.name} <AiBadge label="Match" />
                  </h3>
                  <p className="text-xs text-[#7A8C7A] font-light">{selectedUser.city} • {selectedUser.books} uploaded books</p>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedUser(null); setMessageSent(false); setMessage(''); }} 
                className="p-2 text-[#7A8C7A] hover:text-[#263326] hover:bg-[#E9E3D5] rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <h4 className="text-sm font-bold text-[#4F6F52] mb-3">Reading Interests</h4>
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedUser.genres.map(g => (
                  <span key={g} className="px-3 py-1 bg-[#F7F5EF] text-[#4F6F52] border border-[#E9E3D5] rounded-xl text-xs font-medium">
                    {g}
                  </span>
                ))}
              </div>

              {messageSent ? (
                <div className="bg-[#7BAE7F]/10 border border-[#7BAE7F]/20 rounded-2xl p-6 text-center animate-in fade-in zoom-in duration-300">
                  <div className="w-12 h-12 bg-[#7BAE7F] text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
                    <Send size={20} />
                  </div>
                  <h4 className="font-bold text-[#263326]">Message Sent!</h4>
                  <p className="text-xs text-[#7A8C7A] mt-1 font-light">They will receive your request shortly.</p>
                  <button 
                    onClick={() => { setSelectedUser(null); setMessageSent(false); setMessage(''); }} 
                    className="mt-4 px-6 py-2 bg-white text-[#4F6F52] border border-[#E9E3D5] rounded-xl text-sm font-semibold hover:bg-[#F7F5EF] transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-[#4F6F52]">Send a quick message</h4>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={`Hi ${selectedUser.name.split(' ')[0]}, I saw we have similar book interests...`}
                    className="w-full px-4 py-3 bg-[#F7F5EF] border border-[#E9E3D5] rounded-xl text-sm text-[#263326] focus:outline-none focus:ring-2 focus:ring-[#7BAE7F] resize-none h-24 transition-all"
                  />
                  <div className="flex justify-end">
                    <button 
                      onClick={() => setMessageSent(true)}
                      disabled={message.trim() === ''}
                      className="flex items-center gap-2 px-6 py-2.5 bg-[#7BAE7F] hover:bg-[#4F6F52] text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
                    >
                      <Send size={16} /> Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartBookMatch;
