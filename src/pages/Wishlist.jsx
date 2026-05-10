import { useState, useEffect } from 'react';
import { Heart, Loader2, BookHeart, ArrowLeft } from 'lucide-react';

import BookCard from '../components/Dashboard/BookCard';
import { useNavigate } from 'react-router-dom';

const Wishlist = () => {
  const navigate = useNavigate();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWishlist = () => {
      const wishlistStr = localStorage.getItem('localWishlist');
      setWishlistItems(wishlistStr ? JSON.parse(wishlistStr) : []);
      setLoading(false);
    };

    fetchWishlist();
    window.addEventListener('wishlistUpdated', fetchWishlist);
    return () => window.removeEventListener('wishlistUpdated', fetchWishlist);
  }, []);

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
      <div className="bg-[#263326] rounded-[2rem] p-10 text-white flex items-center gap-6 shadow-sm border border-[#4F6F52]/30">
        <div className="p-4 bg-[#7BAE7F]/20 rounded-2xl">
          <BookHeart size={32} className="text-[#A8C9A3]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Wishlist</h1>
          <p className="text-[#A8C9A3] mt-2 font-light">Books you've saved for later exchange or request.</p>
        </div>
      </div>

      {/* Grid / Empty State */}
      <section>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#7A8C7A]">
            <Loader2 size={40} className="animate-spin mb-4 text-[#7BAE7F]" />
            <p className="font-medium">Loading your wishlist…</p>
          </div>
        ) : wishlistItems.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-[#E9E3D5] rounded-3xl p-16 text-center">
            <div className="w-20 h-20 bg-[#E9E3D5] rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart size={36} className="text-[#A8C9A3]" />
            </div>
            <h3 className="text-xl font-bold text-[#263326] mb-2">Your wishlist is empty</h3>
            <p className="text-[#7A8C7A] mb-8 max-w-sm mx-auto font-light">
              You haven't saved any books yet. Explore to find books you'd love to read!
            </p>
            <button
              onClick={() => navigate('/explore')}
              className="inline-flex px-8 py-3 bg-[#7BAE7F] hover:bg-[#4F6F52] text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              Explore Books
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">
            {wishlistItems.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Wishlist;
