import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Send, MessageSquare, User, CheckCircle2, ArrowLeft } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [userProfiles, setUserProfiles] = useState({});
  const messagesEndRef = useRef(null);

  // Fetch Chats
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('[Exchanza] Chats snapshot received, count:', snapshot.docs.length);
      const chatsData = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(chat => {
          const parts = chat.participants;
          // Must be an array with at least 2 entries
          if (!Array.isArray(parts) || parts.length < 2) {
            console.log('[Exchanza] Filtered (bad participants):', chat.id);
            return false;
          }
          // Must have a different participant — catches self-chats
          const otherParticipant = parts.find(id => id !== user.uid);
          if (!otherParticipant) {
            console.log('[Exchanza] Filtered (self-chat):', chat.id);
            return false;
          }
          // Valid chat — show even if no messages yet (lastMessage may be absent for old data)
          return true;
        });
      
      // Sort by updatedAt descending (chats with no updatedAt go to bottom)
      chatsData.sort((a, b) => {
        const dateA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
        const dateB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
        return dateB - dateA;
      });
      console.log('[Exchanza] Valid chats after filter:', chatsData.length);
      setChats(chatsData);
      setLoadingChats(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch User Profiles for participants
  useEffect(() => {
    if (!chats.length || !user) return;

    const fetchProfiles = async () => {
      const uniqueParticipantIds = [...new Set(chats.flatMap(c => c.participants))];
      const missingIds = uniqueParticipantIds.filter(id => !userProfiles[id]);

      if (missingIds.length === 0) return;

      console.log('[Exchanza] Fetching missing user profiles:', missingIds);
      console.log('[Exchanza] Current User ID:', user.uid);
      const newProfiles = { ...userProfiles };
      let changed = false;

      for (const id of missingIds) {
        try {
          const userSnap = await getDoc(doc(db, 'users', id));
          if (userSnap.exists()) {
            const data = userSnap.data();
            const profile = {
              name: data.username || data.fullName || data.displayName || 'User',
              username: data.username || '',
              photo: data.photoURL || data.profileImage || null
            };
            newProfiles[id] = profile;
            console.log(`[Exchanza] Fetched profile for ${id}:`, {
              username: profile.username,
              name: profile.name,
              photoURL: profile.photo
            });
            changed = true;
          } else {
            // Fallback for users not in the collection
            console.log(`[Exchanza] No user document found for ${id}, using fallback.`);
            newProfiles[id] = { name: 'User', photo: null };
            changed = true;
          }
        } catch (error) {
          console.error(`Error fetching profile for ${id}:`, error);
        }
      }

      if (changed) {
        setUserProfiles(newProfiles);
      }
    };

    fetchProfiles();
  }, [chats, user, userProfiles]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch Messages for active chat
  useEffect(() => {
    if (!user || !activeChat) return;

    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', activeChat.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by timestamp ascending (support both 'timestamp' and legacy 'createdAt')
      msgs.sort((a, b) => {
        const dateA = (a.timestamp || a.createdAt)?.toMillis ? (a.timestamp || a.createdAt).toMillis() : 0;
        const dateB = (b.timestamp || b.createdAt)?.toMillis ? (b.timestamp || b.createdAt).toMillis() : 0;
        return dateA - dateB;
      });
      setMessages(msgs);
      scrollToBottom();
      
      // Mark as read — skip system messages (they are informational, not personal)
      msgs.forEach(msg => {
        if (msg.receiverId === user.uid && !msg.read && !msg.isSystemMessage) {
          updateDoc(doc(db, 'messages', msg.id), { read: true });
        }
      });
    });

    return () => unsubscribe();
  }, [user, activeChat]);


  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || !user) return;

    const msgText = newMessage.trim();
    setNewMessage(''); // optimistic clear
    
    // Determine receiver
    const receiverId = activeChat.participants.find(id => id !== user.uid);

    try {
      // 1. Add Message
      await addDoc(collection(db, 'messages'), {
        chatId: activeChat.id,
        senderId: user.uid,
        receiverId: receiverId || 'unknown',
        text: msgText,
        timestamp: serverTimestamp(),
        read: false
      });

      // 2. Update Chat
      await updateDoc(doc(db, 'chats', activeChat.id), {
        lastMessage: msgText,
        updatedAt: serverTimestamp(),
        lastMessageSenderId: user.uid
      });
      
      scrollToBottom();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const getOtherParticipantInfo = (chat) => {
    const otherId = chat.participants.find(id => id !== user?.uid);
    
    // Priority 1: Use fresh fetched profile from cache
    if (userProfiles[otherId]) {
      return userProfiles[otherId];
    }

    // Priority 2: Use details stored in chat doc (preview)
    if (chat.participantDetails && chat.participantDetails[otherId]) {
      const details = chat.participantDetails[otherId];
      return {
        name: details.name || 'User',
        photo: details.photo || null
      };
    }

    // Priority 3: Absolute fallback
    return { name: 'User', photo: null };
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#7A8C7A]">
        <p className="font-medium text-lg">Please log in to view messages.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 h-[calc(100vh-80px)] flex">
      {/* Container */}
      <div className="w-full bg-white rounded-3xl shadow-sm border border-[#E9E3D5] flex overflow-hidden">
        
        {/* Sidebar */}
        <div className={`w-full md:w-1/3 border-r border-[#E9E3D5] flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-6 border-b border-[#E9E3D5] bg-[#F7F5EF]/50 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#263326] flex items-center gap-2">
              <MessageSquare size={24} className="text-[#7BAE7F]" /> Messages
            </h2>
            <button 
              onClick={() => navigate(-1)} 
              className="flex items-center gap-2 text-[#7A8C7A] hover:text-[#263326] transition-colors font-medium text-sm px-3 py-1.5 bg-white hover:bg-[#F7F5EF] rounded-xl border border-[#E9E3D5] shadow-sm"
            >
              <ArrowLeft size={16} /> Back
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loadingChats ? (
              <div className="p-6 text-center text-[#7A8C7A]">Loading chats...</div>
            ) : chats.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center text-[#7A8C7A]">
                <div className="w-16 h-16 bg-[#F7F5EF] rounded-full flex items-center justify-center mb-4">
                  <MessageSquare size={24} className="text-[#A8C9A3]" />
                </div>
                <p>No conversations yet.</p>
                <p className="text-sm font-light mt-2">Request a book to start chatting!</p>
              </div>
            ) : (
              chats.map(chat => {
                const otherUser = getOtherParticipantInfo(chat);
                const isActive = activeChat?.id === chat.id;
                const isUnread = chat.lastMessageSenderId !== user.uid && chat.lastMessage && !isActive; // simplify unread check
                
                return (
                  <div 
                    key={chat.id}
                    onClick={() => setActiveChat(chat)}
                    className={`p-4 border-b border-[#E9E3D5] cursor-pointer transition-colors flex items-center gap-4 ${isActive ? 'bg-[#F7F5EF]' : 'hover:bg-[#F7F5EF]/50'}`}
                  >
                    <div className="w-12 h-12 bg-[#DDE5D3] rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden border border-[#A8C9A3]/30">
                      {otherUser.photo ? (
                        <img 
                          src={otherUser.photo} 
                          alt={otherUser.name} 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                      ) : null}
                      <User 
                        size={20} 
                        className="text-[#4F6F52]" 
                        style={{ display: otherUser.photo ? 'none' : 'block' }} 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="font-semibold text-[#263326] truncate">
                          {otherUser.username ? `@${otherUser.username.replace('@', '')}` : otherUser.name}
                        </h4>
                        <span className="text-[10px] text-[#7A8C7A] whitespace-nowrap ml-2">
                          {formatTime(chat.updatedAt)}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${isUnread ? 'font-semibold text-[#263326]' : 'text-[#7A8C7A] font-light'}`}>
                        {chat.lastMessage || 'No messages yet'}
                      </p>
                    </div>
                    {isUnread && <div className="w-2.5 h-2.5 bg-[#7BAE7F] rounded-full flex-shrink-0"></div>}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col bg-[#F7F5EF]/30 ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
          {!activeChat ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#7A8C7A]">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-[#E9E3D5]">
                <MessageSquare size={36} className="text-[#A8C9A3]" />
              </div>
              <h3 className="text-xl font-bold text-[#263326]">Your Messages</h3>
              <p className="font-light mt-2">Select a conversation to start chatting</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 sm:p-6 border-b border-[#E9E3D5] bg-white flex items-center gap-4 sticky top-0 z-10 shadow-sm">
                <button 
                  onClick={() => setActiveChat(null)}
                  className="md:hidden p-2 -ml-2 text-[#7A8C7A] hover:bg-[#F7F5EF] rounded-xl"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <div className="w-10 h-10 bg-[#DDE5D3] rounded-full flex items-center justify-center overflow-hidden border border-[#A8C9A3]/30">
                  {getOtherParticipantInfo(activeChat).photo ? (
                    <img 
                      src={getOtherParticipantInfo(activeChat).photo} 
                      alt="Avatar" 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                  ) : null}
                  <User 
                    size={18} 
                    className="text-[#4F6F52]" 
                    style={{ display: getOtherParticipantInfo(activeChat).photo ? 'none' : 'block' }} 
                  />
                </div>
                <div>
                  <h3 className="font-bold text-[#263326]">
                    {getOtherParticipantInfo(activeChat).username 
                      ? `@${getOtherParticipantInfo(activeChat).username.replace('@', '')}` 
                      : getOtherParticipantInfo(activeChat).name}
                  </h3>
                  <p className="text-xs text-[#7A8C7A] font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span> Exchanza Member
                  </p>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-[#7A8C7A] my-8 font-light text-sm">
                    This is the start of your conversation. Say hello!
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    // System messages rendered as centered info chips
                    if (msg.isSystemMessage) {
                      return (
                        <div key={msg.id} className="flex justify-center">
                          <span className="text-[11px] text-[#4F6F52] bg-[#7BAE7F]/10 border border-[#7BAE7F]/20 px-4 py-1.5 rounded-full font-medium">
                            {msg.text}
                          </span>
                        </div>
                      );
                    }

                    const isMine = msg.senderId === user.uid;
                    // Support both 'timestamp' and legacy 'createdAt' fields
                    const msgTime = msg.timestamp || msg.createdAt;
                    const prevMsgTime = messages[index - 1]?.timestamp || messages[index - 1]?.createdAt;
                    const showTime = index === 0 || (
                      msgTime?.toMillis && prevMsgTime?.toMillis
                        ? msgTime.toMillis() - prevMsgTime.toMillis() > 300000
                        : false
                    );
                    
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                        {showTime && <span className="text-[10px] text-[#7A8C7A] mb-2">{formatTime(msgTime)}</span>}
                        <div 
                          className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                            isMine 
                              ? 'bg-[#7BAE7F] text-white rounded-br-sm' 
                              : 'bg-white border border-[#E9E3D5] text-[#263326] rounded-bl-sm'
                          }`}
                        >
                          {msg.text}
                        </div>
                        {isMine && msg.read && (
                          <span className="text-[10px] text-[#7BAE7F] mt-1 flex items-center gap-0.5"><CheckCircle2 size={10}/> Read</span>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>


              {/* Input Area */}
              <div className="p-4 bg-white border-t border-[#E9E3D5]">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-[#F7F5EF] border border-[#E9E3D5] rounded-xl px-4 py-3 text-sm text-[#263326] focus:outline-none focus:ring-2 focus:ring-[#7BAE7F]"
                  />
                  <button 
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-[#7BAE7F] hover:bg-[#4F6F52] text-white p-3 rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 active:scale-95"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
