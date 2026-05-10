import React, { useState, useEffect } from 'react';
import BookCard from '../components/Dashboard/BookCard';
import SmartBookMatch from '../components/Dashboard/SmartBookMatch';
import { ArrowRight, Leaf, GraduationCap, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getCountFromServer, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

const FEATURED_BOOKS = [
  { id: 1, title: "The Midnight Library", author: "Matt Haig", category: "Fiction", condition: "Good", type: "Exchange", imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=400&auto=format&fit=crop" },
  { id: 5, title: "Dune", author: "Frank Herbert", category: "Science Fiction", condition: "Good", type: "Exchange", imageUrl: "https://images.unsplash.com/photo-1541963463532-d68292c34b19?q=80&w=600&auto=format&fit=crop" },
  { id: 8, title: "Sapiens", author: "Yuval Noah Harari", category: "History", condition: "Like New", type: "Donate", imageUrl: "https://images.unsplash.com/photo-1589998059171-988d887df646?q=80&w=600&auto=format&fit=crop" },
  { id: 6, title: "Project Hail Mary", author: "Andy Weir", category: "Science Fiction", condition: "Like New", type: "Exchange", imageUrl: "https://images.unsplash.com/photo-1629196914238-d7037f0980ff?q=80&w=600&auto=format&fit=crop" }
];

const AI_RECOMMENDATIONS = [
  { id: 1, title: "The Midnight Library", author: "Matt Haig", category: "Fiction", condition: "Good", listingType: "Exchange" },
  { id: 2, title: "Atomic Habits", author: "James Clear", category: "Self-Help", condition: "Like New", listingType: "Exchange" },
  { id: 3, title: "1984", author: "George Orwell", category: "Fiction", condition: "Fair", listingType: "Donate" }
];

const NEARBY_BOOKS = [
  { id: 4, title: "The Great Gatsby", author: "F. Scott Fitzgerald", category: "Fiction", condition: "Good", listingType: "Exchange", distance: "2 miles" },
  { id: 5, title: "Dune", author: "Frank Herbert", category: "Science Fiction", condition: "Good", listingType: "Exchange", distance: "3.5 miles" },
  { id: 6, title: "Project Hail Mary", author: "Andy Weir", category: "Science Fiction", condition: "Like New", listingType: "Exchange", distance: "5 miles" }
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState([
    ['...', 'Books Shared'],
    ['...', 'Active Readers'],
    ['100%', 'Free Forever']
  ]);
  const [trendingBooks, setTrendingBooks] = useState([]);

  useEffect(() => {
    const fetchTrendingBooks = async () => {
      try {
        const q = query(collection(db, 'books'), orderBy('createdAt', 'desc'), limit(4));
        const snapshot = await getDocs(q);
        setTrendingBooks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: doc.data().listingType || doc.data().type })));
      } catch (error) {
        console.error("Error fetching trending books:", error);
        setTrendingBooks(FEATURED_BOOKS); // Fallback
      }
    };
    fetchTrendingBooks();
  }, []);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user) {
        setStats([
          ['2,000+', 'Books Shared'],
          ['500+', 'Active Readers'],
          ['100%', 'Free Forever']
        ]);
        return;
      }
      try {
        let sharedCount = 0;
        try {
          const sharedQ = query(collection(db, 'books'), where('ownerId', '==', user.uid));
          const sharedSnapshot = await getCountFromServer(sharedQ);
          sharedCount = sharedSnapshot.data().count;
        } catch (e) {
          console.error(e);
        }

        const wishlistStr = localStorage.getItem('localWishlist');
        const wishlistCount = wishlistStr ? JSON.parse(wishlistStr).length : 0;

        const q = query(collection(db, 'exchangeRequests'), where('requesterId', '==', user.uid));
        const snapshot = await getCountFromServer(q);
        const requestCount = snapshot.data().count;

        setStats([
          [requestCount.toString(), 'My Requests'],
          [wishlistCount.toString(), 'Wishlisted'],
          [sharedCount.toString(), 'Shared Books']
        ]);
      } catch (error) {
        console.error("Error fetching user stats:", error);
      }
    };

    fetchUserStats();
    window.addEventListener('wishlistUpdated', fetchUserStats);
    window.addEventListener('booksUpdated', fetchUserStats);
    window.addEventListener('requestsUpdated', fetchUserStats);
    
    return () => {
      window.removeEventListener('wishlistUpdated', fetchUserStats);
      window.removeEventListener('booksUpdated', fetchUserStats);
      window.removeEventListener('requestsUpdated', fetchUserStats);
    }
  }, [user]);

  return (
    <div className="w-full overflow-x-hidden">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-hero-gradient relative pt-20 pb-32 overflow-hidden">
        {/* Ambient blobs */}
        <div className="absolute top-[-80px] right-[-60px] w-[520px] h-[520px] bg-[#7BAE7F] rounded-full blur-[140px] opacity-10 pointer-events-none" />
        <div className="absolute bottom-[-60px] left-[-80px] w-[400px] h-[400px] bg-[#A8C9A3] rounded-full blur-[120px] opacity-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col-reverse lg:flex-row items-center gap-16">
          {/* Left: copy */}
          <div className="flex-1 space-y-8 animate-fade-up">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E9E3D5] text-[#4F6F52] text-sm font-medium shadow-sm border border-[#A8C9A3]/40">
              <Sparkles size={15} className="text-[#7BAE7F]" />
              A smarter way to share books
            </span>

            <h1 className="text-5xl lg:text-[4.5rem] font-bold tracking-tight text-[#263326] leading-[1.1]">
              Exchange Stories,<br />
              <span className="text-[#7BAE7F]">Not Just Books.</span>
            </h1>

            <p className="text-lg text-[#7A8C7A] max-w-lg leading-relaxed font-light">
              The smart, sustainable way to share knowledge. Connect with readers nearby, exchange your finished books, and discover your next great read — free of charge.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                onClick={() => navigate('/explore')}
                className="px-8 py-4 bg-[#7BAE7F] hover:bg-[#4F6F52] text-white font-semibold rounded-2xl shadow-[0_8px_30px_rgba(123,174,127,0.35)] hover:shadow-[0_12px_40px_rgba(79,111,82,0.4)] transition-all duration-300 flex items-center justify-center gap-2 hover:-translate-y-1 active:scale-95"
              >
                Explore Books <ArrowRight size={18} />
              </button>
              <button
                onClick={() => navigate('/add-book')}
                className="px-8 py-4 bg-white/80 backdrop-blur border border-[#A8C9A3]/60 hover:border-[#7BAE7F] text-[#263326] font-semibold rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center hover:-translate-y-1 active:scale-95"
              >
                List My Books
              </button>
            </div>

            {/* Subtle stat strip */}
            <div className="flex items-center gap-8 pt-4">
              {stats.map(([val, label]) => (
                <div key={label} className="text-center">
                  <p className="text-xl font-bold text-[#4F6F52]">{val}</p>
                  <p className="text-xs text-[#7A8C7A] font-light">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: hero image */}
          <div className="flex-1 relative w-full flex justify-center lg:justify-end">
            {/* Decorative ring behind image */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#A8C9A3] to-[#E9E3D5] rounded-[3rem] rotate-6 scale-105 opacity-40 blur-2xl pointer-events-none" />
            <div className="relative z-10 animate-float">
              <img
                src="https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=800&auto=format&fit=crop"
                alt="People exchanging books"
                className="w-full max-w-lg h-[540px] object-cover rounded-[2.5rem] shadow-[0_24px_60px_rgba(79,111,82,0.18)] border-4 border-white"
              />
              {/* Floating badge */}
              <div className="absolute -bottom-5 -left-6 glass-card border border-[#A8C9A3]/40 rounded-2xl px-5 py-3 shadow-lg flex items-center gap-3">
                <span className="text-2xl">📚</span>
                <div>
                  <p className="text-xs text-[#7A8C7A] font-light">New listing</p>
                  <p className="text-sm font-semibold text-[#263326]">The Alchemist</p>
                </div>
              </div>
              <div className="absolute -top-5 -right-4 glass-card border border-[#A8C9A3]/40 rounded-2xl px-5 py-3 shadow-lg flex items-center gap-3">
                <span className="text-2xl">🌿</span>
                <div>
                  <p className="text-xs text-[#7A8C7A] font-light">Eco Impact</p>
                  <p className="text-sm font-semibold text-[#4F6F52]">12 kg paper saved</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trending Books ───────────────────────────────────────────── */}
      <section className="px-6 lg:px-12 py-28 bg-white relative z-10 rounded-t-[3rem]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-4">
            <div className="space-y-3">
              <span className="text-xs font-semibold tracking-widest text-[#7BAE7F] uppercase">Trending Now</span>
              <h2 className="text-4xl font-bold text-[#263326] tracking-tight">Popular Exchanges</h2>
              <p className="text-[#7A8C7A] text-base font-light">The most sought-after books in your community right now.</p>
            </div>
            <button
              onClick={() => navigate('/explore')}
              className="self-start md:self-auto flex items-center gap-2 text-sm font-semibold text-[#4F6F52] hover:text-[#7BAE7F] transition-colors"
            >
              View all <ArrowRight size={15} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
            {trendingBooks.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Smart Book Match ─────────────────────────────────────── */}
      {trendingBooks.length > 0 && (
        <section className="px-6 lg:px-12 py-16 bg-[#F7F5EF]">
          <div className="max-w-7xl mx-auto">
            <SmartBookMatch
              seedBook={{
                ...trendingBooks[0],
                tags: trendingBooks[0]?.tags || [],
              }}
              allBooks={trendingBooks}
            />
          </div>
        </section>
      )}

      {/* ── Why Exchanza ─────────────────────────────────────────────── */}
      <section className="px-6 lg:px-12 py-28 bg-[#F7F5EF]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4 max-w-2xl mx-auto">
            <span className="text-xs font-semibold tracking-widest text-[#7BAE7F] uppercase">Our Values</span>
            <h2 className="text-4xl font-bold text-[#263326] tracking-tight">Why Readers Love Exchanza</h2>
            <p className="text-[#7A8C7A] text-base font-light">A community built on mindful reading, sustainability, and the joy of sharing stories.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Leaf size={26} />,
                bg: 'bg-[#DDE5D3]',
                color: 'text-[#4F6F52]',
                title: 'Sustainable Sharing',
                desc: 'Give your read books a second life. Every exchange reduces paper waste and environmental impact.',
              },
              {
                icon: <GraduationCap size={26} />,
                bg: 'bg-[#E9E3D5]',
                color: 'text-[#4F6F52]',
                title: 'Student Friendly',
                desc: 'Textbooks are expensive. Connect with fellow students and share resources freely, without the cost.',
              },
              {
                icon: <Sparkles size={26} />,
                bg: 'bg-[#A8C9A3]/40',
                color: 'text-[#4F6F52]',
                title: 'Smart Matching',
                desc: 'Our algorithm connects you with the perfect exchange partner based on your wishlist and reading habits.',
              },
            ].map(({ icon, bg, color, title, desc }) => (
              <div
                key={title}
                className="bg-white p-10 rounded-[2rem] shadow-sm border border-[#E9E3D5] space-y-5 hover:-translate-y-2 hover:shadow-xl hover:border-[#A8C9A3] transition-all duration-300 group"
              >
                <div className={`w-14 h-14 ${bg} ${color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  {icon}
                </div>
                <h3 className="text-xl font-bold text-[#263326]">{title}</h3>
                <p className="text-[#7A8C7A] font-light leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="px-6 lg:px-12 py-32 bg-white relative overflow-hidden rounded-b-[3rem]">
        {/* Pista green glow blob */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#7BAE7F] rounded-full blur-[140px] opacity-10 pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center space-y-8 relative z-10">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E9E3D5] text-[#4F6F52] text-sm font-medium border border-[#A8C9A3]/40">
            Join the community
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-[#263326] tracking-tight leading-tight">
            Ready to clear your shelves?
          </h2>
          <p className="text-lg text-[#7A8C7A] font-light max-w-xl mx-auto">
            Join thousands of readers who are already sharing stories and discovering new worlds — completely free.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <button
              onClick={() => navigate('/signup')}
              className="px-10 py-4 bg-[#7BAE7F] hover:bg-[#4F6F52] text-white font-semibold rounded-2xl shadow-[0_8px_30px_rgba(123,174,127,0.35)] hover:shadow-[0_12px_40px_rgba(79,111,82,0.4)] transition-all duration-300 hover:-translate-y-1 text-base inline-flex items-center gap-2 active:scale-95"
            >
              Create Free Account <ArrowRight size={18} />
            </button>
            <button
              onClick={() => navigate('/explore')}
              className="px-10 py-4 bg-[#E9E3D5] hover:bg-[#DDE5D3] text-[#263326] font-semibold rounded-2xl transition-all duration-300 hover:-translate-y-1 text-base inline-flex items-center gap-2 active:scale-95"
            >
              Browse Books
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}

    </div>
  );
};

export default Dashboard;
