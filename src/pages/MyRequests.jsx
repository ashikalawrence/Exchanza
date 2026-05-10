import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Send, Clock, CheckCircle2, XCircle, User, Calendar, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MyRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    const q = query(
      collection(db, 'exchangeRequests'),
      where('requesterId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by createdAt descending
      requestsData.sort((a, b) => {
        const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return dateB - dateA;
      });
      setRequests(requestsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching requests:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'accepted':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-700 border border-green-200"><CheckCircle2 size={12}/> Accepted</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-700 border border-red-200"><XCircle size={12}/> Rejected</span>;
      case 'pending':
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200"><Clock size={12}/> Pending</span>;
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date();
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#7A8C7A]">
        <p className="font-medium text-lg">Please log in to view your requests.</p>
        <button onClick={() => navigate('/login')} className="mt-4 px-6 py-2 bg-[#7BAE7F] text-white rounded-xl font-semibold shadow-sm hover:shadow-md transition-all active:scale-95">Login</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 px-6 lg:px-12 pt-10 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="bg-[#263326] rounded-[2rem] p-10 text-white flex items-center gap-6 shadow-sm border border-[#4F6F52]/30">
        <div className="p-4 bg-[#7BAE7F]/20 rounded-2xl">
          <Send size={32} className="text-[#A8C9A3]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Requests</h1>
          <p className="text-[#A8C9A3] mt-2 font-light">Track the status of the books you've requested.</p>
        </div>
      </div>

      {/* Requests List */}
      <section>
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7BAE7F]"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-[#E9E3D5] rounded-3xl p-16 text-center">
            <div className="w-20 h-20 bg-[#E9E3D5] rounded-full flex items-center justify-center mx-auto mb-6">
              <Send size={36} className="text-[#A8C9A3]" />
            </div>
            <h3 className="text-xl font-bold text-[#263326] mb-2">No requests yet</h3>
            <p className="text-[#7A8C7A] mb-8 max-w-sm mx-auto font-light">
              You haven't requested any books. Explore the community library to find your next read!
            </p>
            <button
              onClick={() => navigate('/explore')}
              className="inline-flex px-8 py-3 bg-[#7BAE7F] hover:bg-[#4F6F52] text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              Explore Books
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(request => (
              <div key={request.id} className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-[#E9E3D5] flex flex-col sm:flex-row gap-6 hover:shadow-md transition-shadow">
                {/* Book Image */}
                <div className="w-full sm:w-32 h-40 flex-shrink-0 bg-[#F7F5EF] rounded-xl overflow-hidden border border-[#E9E3D5]">
                  {request.bookImage ? (
                    <img src={request.bookImage} alt={request.bookTitle} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#A8C9A3] font-bold text-3xl">
                      {request.bookTitle?.charAt(0) || '?'}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-[#263326]">{request.bookTitle}</h3>
                    {getStatusBadge(request.status)}
                  </div>
                  
                  <span className="inline-block w-max px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F7F5EF] text-[#4F6F52] border border-[#A8C9A3]/40 mb-4 uppercase">
                    {request.type}
                  </span>

                  <div className="mt-auto flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-[#7A8C7A]">
                        <Calendar size={14} />
                        <span className="font-medium">Requested on:</span> {formatDate(request.createdAt)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[#7A8C7A]">
                        <User size={14} />
                        <span className="font-medium">Owner ID:</span> <span className="font-mono text-xs">{request.ownerId.slice(0, 8)}...</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate('/messages')} 
                      className="px-4 py-2 bg-[#F7F5EF] hover:bg-[#DDE5D3] text-[#4F6F52] text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors active:scale-95"
                    >
                      <MessageCircle size={16} /> Message Owner
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default MyRequests;
