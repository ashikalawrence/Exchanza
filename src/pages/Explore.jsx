import React, { useState, useEffect } from 'react';
import { Compass, Loader2, BookOpen, Search, Filter, ArrowDownUp, ArrowLeft } from 'lucide-react';
import BookCard from '../components/Dashboard/BookCard';
import SmartBookMatch from '../components/Dashboard/SmartBookMatch';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Explore = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterCondition, setFilterCondition] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'books'));
        const fetchedBooks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setBooks(fetchedBooks);
      } catch (error) {
        console.error("Error fetching books:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  const getFilteredAndSortedBooks = () => {
    let result = [...books];

    // 1. Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b =>
        (b.title && b.title.toLowerCase().includes(q)) ||
        (b.author && b.author.toLowerCase().includes(q)) ||
        (b.category && b.category.toLowerCase().includes(q))
      );
    }

    // 2. Filter
    if (filterCategory !== 'All') result = result.filter(b => b.category === filterCategory);
    if (filterCondition !== 'All') result = result.filter(b => b.condition === filterCondition);
    if (filterType !== 'All') result = result.filter(b => b.type === filterType);

    // 3. Sort
    if (sortBy === 'recent') {
      result.sort((a, b) => {
        const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return dateB - dateA;
      });
    } else if (sortBy === 'az') {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'requested') {
      result.sort((a, b) => (b.requestCount || 0) - (a.requestCount || 0));
    }

    return result;
  };

  const categories = ['All', 'Fiction', 'Non-Fiction', 'Science', 'History', 'Biography', 'Technology', 'Self-Help'];
  const conditions = ['All', 'Like New', 'Good', 'Fair', 'Poor'];
  const types = ['All', 'Exchange', 'Donate'];

  const displayedBooks = getFilteredAndSortedBooks();

  const selectClass = "bg-white border border-[#E9E3D5] text-[#4F6F52] text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#7BAE7F] cursor-pointer shadow-sm appearance-none";

  return (
    <div className="space-y-8 pb-16 px-6 lg:px-12 pt-10 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-6 flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#7A8C7A] hover:text-[#263326] transition-colors font-medium text-sm px-4 py-2 bg-white hover:bg-[#F7F5EF] rounded-xl border border-[#E9E3D5] shadow-sm"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>
      <div className="bg-[#263326] rounded-[2rem] p-10 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm border border-[#4F6F52]/30">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-[#7BAE7F]/20 rounded-2xl flex-shrink-0">
            <Compass size={32} className="text-[#A8C9A3]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Explore Library</h1>
            <p className="text-[#A8C9A3] mt-2 font-light">Discover amazing books uploaded by the community.</p>
          </div>
        </div>
      </div>

      {/* Controls: Search, Filter, Sort */}
      <div className="bg-[#F7F5EF] p-5 rounded-[1.5rem] border border-[#E9E3D5] flex flex-col lg:flex-row gap-4 items-center justify-between shadow-sm">

        {/* Search Bar */}
        <div className="relative w-full lg:w-1/3">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#7A8C7A]">
            <Search size={18} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, author, or category..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-[#E9E3D5] rounded-xl text-[#263326] placeholder-[#7A8C7A] focus:outline-none focus:ring-2 focus:ring-[#7BAE7F] shadow-sm transition-all"
          />
        </div>

        {/* Filters & Sort */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[#E9E3D5] shadow-sm">
            <Filter size={16} className="text-[#7BAE7F]" />
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-transparent text-sm text-[#4F6F52] focus:outline-none cursor-pointer">
              {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[#E9E3D5] shadow-sm">
            <select value={filterCondition} onChange={(e) => setFilterCondition(e.target.value)} className="bg-transparent text-sm text-[#4F6F52] focus:outline-none cursor-pointer">
              {conditions.map(c => <option key={c} value={c}>{c === 'All' ? 'All Conditions' : c}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[#E9E3D5] shadow-sm">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-transparent text-sm text-[#4F6F52] focus:outline-none cursor-pointer">
              {types.map(c => <option key={c} value={c}>{c === 'All' ? 'All Types' : c}</option>)}
            </select>
          </div>

          <div className="w-px h-8 bg-[#E9E3D5] hidden sm:block mx-1"></div>

          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[#E9E3D5] shadow-sm ml-auto lg:ml-0">
            <ArrowDownUp size={16} className="text-[#7BAE7F]" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-transparent text-sm text-[#4F6F52] focus:outline-none cursor-pointer font-medium">
              <option value="recent">Recently Uploaded</option>
              <option value="az">A-Z Title</option>
              <option value="requested">Most Requested</option>
            </select>
          </div>
        </div>
      </div>

      {/* Book Grid / Empty State */}
      <section>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#7A8C7A]">
            <Loader2 size={40} className="animate-spin mb-4 text-[#7BAE7F]" />
            <p className="font-medium">Loading library…</p>
          </div>
        ) : books.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-[#E9E3D5] rounded-3xl p-16 text-center">
            <div className="w-20 h-20 bg-[#E9E3D5] rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen size={36} className="text-[#A8C9A3]" />
            </div>
            <h3 className="text-xl font-bold text-[#263326] mb-2">No books found</h3>
            <p className="text-[#7A8C7A] mb-8 max-w-sm mx-auto font-light">
              The community hasn't listed any books yet. Be the first to share one!
            </p>
            <button onClick={() => navigate('/add-book')} className="inline-flex px-8 py-3 bg-[#7BAE7F] hover:bg-[#4F6F52] text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95">
              List a Book
            </button>
          </div>
        ) : displayedBooks.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-[#E9E3D5] rounded-3xl p-16 text-center shadow-sm">
            <div className="w-20 h-20 bg-[#F7F5EF] rounded-full flex items-center justify-center mx-auto mb-6">
              <Search size={32} className="text-[#A8C9A3]" />
            </div>
            <h3 className="text-xl font-bold text-[#263326] mb-2">No results match your criteria</h3>
            <p className="text-[#7A8C7A] max-w-sm mx-auto font-light">Try adjusting your search terms or relaxing your filters.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterCategory('All');
                setFilterCondition('All');
                setFilterType('All');
              }}
              className="mt-6 px-6 py-2.5 bg-[#E9E3D5] hover:bg-[#DDE5D3] text-[#4F6F52] font-semibold rounded-xl transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">
            {displayedBooks.map(book => (
              <BookCard key={book.id} book={{ ...book, type: book.listingType || book.type }} />
            ))}
          </div>
        )}
      </section>

      {/* Smart Book Match / Guest CTA */}
      {!loading && books.length > 0 && (
        user ? (
          <div className="bg-[#F7F5EF] rounded-[2rem] p-8 lg:p-12 border border-[#E9E3D5]">
            <SmartBookMatch
              seedBook={{
                ...displayedBooks[0] || books[0],
                tags: (displayedBooks[0] || books[0])?.tags || [],
              }}
              allBooks={books}
            />
          </div>
        ) : (
          <div className="bg-[#F7F5EF] rounded-[2rem] p-10 lg:p-16 border border-[#E9E3D5] text-center shadow-sm flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-[#E9E3D5]">
              <Compass size={36} className="text-[#A8C9A3]" />
            </div>
            <h2 className="text-2xl font-bold text-[#263326] mb-3">Unlock Smart Recommendations</h2>
            <p className="text-[#7A8C7A] max-w-md mx-auto mb-8 font-light text-center leading-relaxed">
              Login to unlock AI-powered book matching, smart exchange recommendations, and personalized compatibility scores tailored to your reading style.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-3.5 bg-[#7BAE7F] hover:bg-[#4F6F52] text-white font-bold rounded-xl shadow-sm hover:shadow-[0_8px_24px_rgba(123,174,127,0.3)] transition-all active:scale-95"
            >
              Login or Sign Up
            </button>
          </div>
        )
      )}
    </div>
  );
};

export default Explore;
