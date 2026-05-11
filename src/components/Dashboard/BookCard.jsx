import React, { useState, useEffect } from 'react';
import { Heart, User, BookOpen, Calendar, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc, query, where, getDocs, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const BookCard = ({ book, isOwnerView, onEdit, onDelete }) => {
  const { user } = useAuth();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isRequested, setIsRequested] = useState(false);

  useEffect(() => {
    if (!book.id) return;

    const checkWishlistStatus = () => {
      const wishlistStr = localStorage.getItem('localWishlist');
      if (wishlistStr) {
        const items = JSON.parse(wishlistStr);
        setIsWishlisted(items.some(item => item.id === book.id));
      } else {
        setIsWishlisted(false);
      }
    };

    const checkRequestStatus = async () => {
      if (!user || !book.id) return;
      try {
        const q = query(
          collection(db, 'exchangeRequests'),
          where('bookId', '==', book.id),
          where('requesterId', '==', user.uid)
        );
        const querySnapshot = await getDocs(q);
        setIsRequested(!querySnapshot.empty);
      } catch (error) {
        console.error("Error checking request status:", error);
      }
    };

    checkWishlistStatus();
    checkRequestStatus();

    window.addEventListener('wishlistUpdated', checkWishlistStatus);
    window.addEventListener('requestsUpdated', checkRequestStatus);
    return () => {
      window.removeEventListener('wishlistUpdated', checkWishlistStatus);
      window.removeEventListener('requestsUpdated', checkRequestStatus);
    };
  }, [book.id, user]);

  const handleWishlist = () => {
    if (!book.id) return;
    
    if (!user) {
      window.dispatchEvent(new CustomEvent('showGlobalToast', {
        detail: { title: 'Login Required', message: 'Please login to save books to your wishlist.' }
      }));
      return;
    }

    const wishlistStr = localStorage.getItem('localWishlist');
    let items = wishlistStr ? JSON.parse(wishlistStr) : [];
    if (isWishlisted) {
      items = items.filter(item => item.id !== book.id);
      setIsWishlisted(false);
      window.dispatchEvent(new CustomEvent('showGlobalToast', {
        detail: { title: 'Removed', message: `Removed "${book.title}" from wishlist.` }
      }));
    } else {
      items.push(book);
      setIsWishlisted(true);
      window.dispatchEvent(new CustomEvent('showGlobalToast', {
        detail: { title: 'Added to Wishlist', message: `Added "${book.title}" to your wishlist.` }
      }));
    }
    localStorage.setItem('localWishlist', JSON.stringify(items));
    window.dispatchEvent(new Event('wishlistUpdated'));
  };

  const handleRequest = async () => {
    if (!book.id || isRequested) return;
    
    if (!user) {
      window.dispatchEvent(new CustomEvent('showGlobalToast', {
        detail: { title: 'Login Required', message: 'Please login to request books.' }
      }));
      return;
    }

    if (user.uid === book.ownerId) {
      window.dispatchEvent(new CustomEvent('showGlobalToast', {
        detail: { title: 'Invalid Request', message: 'You cannot request your own book.' }
      }));
      return;
    }
    
    setIsRequesting(true);
    try {
      const q = query(
        collection(db, 'exchangeRequests'), 
        where('bookId', '==', book.id), 
        where('requesterId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setIsRequested(true);
        setIsRequesting(false);
        return;
      }

      const requestData = {
        requestId: Date.now().toString(),
        bookId: book.id,
        bookTitle: book.title,
        bookImage: book.imageUrl || '',
        ownerId: book.ownerId || 'anonymous',
        requesterId: user.uid,
        requesterName: user.displayName || 'Unknown User',
        requesterEmail: user.email || '',
        type: book.type || 'Exchange',
        status: 'pending',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'exchangeRequests'), requestData);
      
      // CREATE CHAT
      if (book.ownerId && book.ownerId !== 'anonymous' && book.ownerId !== user.uid) {
        // Sort IDs to create a unique chat ID
        const ids = [user.uid, book.ownerId].sort();
        const chatId = `${ids[0]}_${ids[1]}`;
        
        await setDoc(doc(db, 'chats', chatId), {
          participants: [user.uid, book.ownerId],
          updatedAt: serverTimestamp(),
          participantDetails: {
            [user.uid]: { name: user.displayName || 'Requester', photo: user.photoURL || null },
            [book.ownerId]: { name: book.author || 'Owner', photo: null } // We don't have owner's exact profile, but this is a fallback
          }
        }, { merge: true });
      }

      if (book.ownerId && book.ownerId !== 'anonymous') {
        await addDoc(collection(db, 'notifications'), {
          userId: book.ownerId,
          type: 'request',
          title: 'New Book Request',
          message: `${user.displayName || 'Someone'} requested your book "${book.title}".`,
          createdAt: serverTimestamp(),
          read: false,
          requestId: requestData.requestId
        });
      }
      
      setIsRequested(true);
      window.dispatchEvent(new Event('requestsUpdated'));
      window.dispatchEvent(new CustomEvent('showGlobalToast', {
        detail: {
          title: 'Request Sent!',
          message: `Successfully requested "${book.title}".`
        }
      }));
    } catch (error) {
      console.error("Error sending request:", error);
      window.dispatchEvent(new CustomEvent('showGlobalToast', {
        detail: { title: 'Error', message: 'Failed to send request. Try again.' }
      }));
    } finally {
      setIsRequesting(false);
    }
  };

  const isExchange = (book.type || '') === 'Exchange';
  const isOverdue = book.returnDueDate && new Date(book.returnDueDate).getTime() < new Date().setHours(0, 0, 0, 0);
  const isOwner = user && book.ownerId === user.uid;

  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-[#E9E3D5] shadow-sm hover:shadow-[0_8px_32px_rgba(79,111,82,0.12)] hover:-translate-y-1.5 transition-all duration-300 group flex flex-col h-full">

      {/* Image */}
      <div className="relative h-64 bg-[#F7F5EF] overflow-hidden flex items-center justify-center p-4">
        {book.imageUrl ? (
          <>
            <img
              src={book.imageUrl}
              alt={book.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 relative z-0"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#263326]/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-0" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#E9E3D5]">
            <span className="text-5xl font-bold text-[#A8C9A3]">{book.title?.charAt(0) ?? '?'}</span>
          </div>
        )}

        {/* Wishlist button */}
        {!isOwnerView && (
          <button
            onClick={handleWishlist}
            className={`absolute top-3 right-3 p-2 rounded-xl border backdrop-blur-sm transition-all duration-200 z-10 ${
              isWishlisted
                ? 'bg-red-500 text-white border-red-500 shadow-md'
                : 'bg-white/70 text-[#7A8C7A] border-white/50 hover:bg-white hover:text-red-500 shadow-sm'
            }`}
            title={!user ? "Login required" : undefined}
          >
            <Heart size={15} className={isWishlisted ? 'fill-current' : ''} />
          </button>
        )}

        {/* Type badge */}
        <span className={`absolute top-3 left-3 px-3 py-1 rounded-xl text-[11px] font-semibold shadow-sm backdrop-blur-sm border z-10 ${
          isExchange
            ? 'bg-[#7BAE7F] text-white border-[#7BAE7F]/20'
            : 'bg-[#E9E3D5] text-[#4F6F52] border-[#A8C9A3]/40'
        }`}>
          {(book.type || 'N/A').toUpperCase()}
        </span>
      </div>

      {/* Info */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="font-bold text-base text-[#263326] mb-1 line-clamp-1 group-hover:text-[#4F6F52] transition-colors">
          {book.title}
        </h3>
        <p className="text-[#7A8C7A] text-xs font-light mb-4 flex items-center gap-1.5">
          <User size={12} /> {book.author}
        </p>

        {book.returnDueDate && (
          <div className={`flex items-center gap-2 mb-4 text-[11px] font-semibold px-3 py-2 rounded-xl border transition-colors ${
            isOverdue 
              ? 'bg-red-50 text-red-600 border-red-200 shadow-sm animate-pulse' 
              : 'bg-[#7BAE7F]/10 text-[#4F6F52] border-[#7BAE7F]/20'
          }`}>
            {isOverdue ? <AlertCircle size={13} /> : <Calendar size={13} className="text-[#7BAE7F]" />}
            <span className="tracking-tight">
              {isOverdue ? 'Overdue' : 'Return by'}: {new Date(book.returnDueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#E9E3D5]">
          <span className="text-[11px] font-medium text-[#7A8C7A] bg-[#F7F5EF] px-2.5 py-1.5 rounded-lg border border-[#E9E3D5]">
            {book.category}
          </span>
          <span className="text-[11px] font-medium text-[#7A8C7A] flex items-center gap-1.5">
            <BookOpen size={12} /> {book.condition}
          </span>
        </div>

        {isOwnerView && book.createdAt && (
          <div className="text-[10px] text-[#7A8C7A] mt-3 font-light text-center">
            Listed on: {new Date(book.createdAt.toMillis ? book.createdAt.toMillis() : book.createdAt).toLocaleDateString()}
          </div>
        )}

        {isOwnerView ? (
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => onEdit && onEdit(book)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 bg-white border border-[#E9E3D5] text-[#263326] hover:bg-[#F7F5EF] shadow-sm hover:shadow-md active:scale-95"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete && onDelete(book.id)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 bg-red-50 text-red-600 hover:bg-red-100 shadow-sm hover:shadow-md active:scale-95 border border-red-100"
            >
              Delete
            </button>
          </div>
        ) : isOwner ? (
          <div className="mt-4 py-2.5 rounded-xl text-sm font-semibold bg-[#F7F5EF] text-[#7A8C7A] border border-[#E9E3D5] flex items-center justify-center gap-2 cursor-default">
            <User size={14} /> Your Listing
          </div>
        ) : (
          <button
            onClick={handleRequest}
            disabled={isRequesting || isRequested}
            className={`w-full mt-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
              isRequested
                ? 'bg-[#DDE5D3] text-[#4F6F52]'
                : 'bg-white border border-[#E9E3D5] text-[#263326] hover:bg-[#7BAE7F] hover:text-white hover:border-[#7BAE7F] shadow-sm hover:shadow-md active:scale-95'
            }`}
          >
            {isRequesting ? 'Sending…' : isRequested ? 'Requested ✓' : `Request ${book.type}`}
          </button>
        )}
      </div>
    </div>
  );
};

export default BookCard;
