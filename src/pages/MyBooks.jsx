import { useState, useEffect } from 'react';
import { BookOpen, Loader2, Library, X, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BookCard from '../components/Dashboard/BookCard';
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';

import { db } from '../firebase/config';
import { useNavigate } from 'react-router-dom';

const MyBooks = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [myBooks, setMyBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [editingBook, setEditingBook] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', condition: '', category: '', type: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    const q = query(
      collection(db, 'books'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const booksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by createdAt descending
      booksData.sort((a, b) => {
        const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return dateB - dateA;
      });
      setMyBooks(booksData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (bookId) => {
    if (window.confirm("Are you sure you want to delete this book? This action cannot be undone.")) {
      try {
        await deleteDoc(doc(db, 'books', bookId));
        window.dispatchEvent(new CustomEvent('showGlobalToast', {
          detail: { title: 'Book Deleted', message: 'Your book has been removed.' }
        }));
      } catch (error) {
        console.error("Error deleting book:", error);
      }
    }
  };

  const openEditModal = (book) => {
    setEditingBook(book);
    setEditForm({
      title: book.title || '',
      condition: book.condition || '',
      category: book.category || '',
      type: book.type || book.listingType || ''
    });
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editingBook) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'books', editingBook.id), {
        title: editForm.title,
        condition: editForm.condition,
        category: editForm.category,
        type: editForm.type,
        listingType: editForm.type
      });
      window.dispatchEvent(new CustomEvent('showGlobalToast', {
        detail: { title: 'Success', message: 'Book updated successfully.' }
      }));
      setEditingBook(null);
    } catch (error) {
      console.error("Error updating book:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = "w-full px-4 py-2 border border-[#E9E3D5] bg-[#F7F5EF] text-[#263326] rounded-xl focus:ring-2 focus:ring-[#7BAE7F] focus:border-[#7BAE7F] focus:bg-white transition-all text-sm";
  const labelClass = "text-sm font-semibold text-[#4F6F52] block mb-1.5";

  return (
    <div className="space-y-8 pb-16 px-6 lg:px-12 pt-10 max-w-7xl mx-auto relative">
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
          <Library size={32} className="text-[#A8C9A3]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Shared Books</h1>
          <p className="text-[#A8C9A3] mt-2 font-light">Manage the books you've listed for exchange or donation.</p>
        </div>
      </div>

      {/* Book Grid / Empty State */}
      <section>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#7A8C7A]">
            <Loader2 size={40} className="animate-spin mb-4 text-[#7BAE7F]" />
            <p className="font-medium">Loading your collection…</p>
          </div>
        ) : myBooks.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-[#E9E3D5] rounded-3xl p-16 text-center shadow-sm">
            <div className="w-20 h-20 bg-[#E9E3D5] rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen size={36} className="text-[#A8C9A3]" />
            </div>
            <h3 className="text-xl font-bold text-[#263326] mb-2">No books listed yet</h3>
            <p className="text-[#7A8C7A] mb-8 max-w-sm mx-auto font-light">
              You haven't uploaded any books. Share your favourite reads with the Exchanza community!
            </p>
            <button
              onClick={() => navigate('/add-book')}
              className="inline-flex px-8 py-3 bg-[#7BAE7F] hover:bg-[#4F6F52] text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              List a Book
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">
            {myBooks.map(book => (
              <BookCard
                key={book.id}
                book={{ ...book, type: book.listingType || book.type }}
                isOwnerView={true}
                onDelete={handleDelete}
                onEdit={openEditModal}
              />
            ))}
          </div>
        )}
      </section>

      {/* Edit Modal */}
      {editingBook && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setEditingBook(null)}
              className="absolute top-6 right-6 text-[#7A8C7A] hover:text-[#263326] bg-[#F7F5EF] p-2 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
            <h2 className="text-2xl font-bold text-[#263326] mb-6">Edit Book</h2>

            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className={labelClass}>Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className={inputClass} required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Condition</label>
                  <select
                    value={editForm.condition}
                    onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}
                    className={inputClass}
                  >
                    {['Like New', 'Good', 'Fair', 'Poor'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Category</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className={inputClass}
                  >
                    {['Fiction', 'Non-Fiction', 'Science', 'Technology', 'History', 'Philosophy', 'Biography', 'Self-Help'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Type</label>
                <select
                  value={editForm.type}
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                  className={inputClass}
                >
                  <option value="Exchange">Exchange</option>
                  <option value="Donate">Donate</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingBook(null)}
                  className="flex-1 py-3 bg-[#E9E3D5] hover:bg-[#DDE5D3] text-[#4F6F52] font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 bg-[#7BAE7F] hover:bg-[#4F6F52] text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBooks;
