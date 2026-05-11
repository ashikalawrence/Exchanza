import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, User as UserIcon, LogOut, Send, MessageCircle, Library, Menu, X } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { useAuth } from '../../context/AuthContext';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    if (!user) {
      setTimeout(() => setUnreadCount(0), 0);
      return;
    }
    const q = query(collection(db, 'messages'), where('receiverId', '==', user.uid), where('read', '==', false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Defensive check: only count messages where sender is NOT the current user
      const actualUnread = snapshot.docs.filter(doc => doc.data().senderId !== user.uid).length;
      setUnreadCount(actualUnread);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const navLinks = [
    { name: 'Home',          path: '/'         },
    { name: 'Explore',       path: '/explore'  },
    { name: 'Book Circles',  path: '/circles'  },
    { name: 'Wishlist',      path: '/wishlist' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 h-20 z-50 flex items-center justify-between px-4 md:px-6 lg:px-12 transition-all duration-300 ${
        scrolled
          ? 'bg-[#F7F5EF]/90 backdrop-blur-xl shadow-[0_2px_24px_rgba(79,111,82,0.08)] border-b border-[#E9E3D5]'
          : 'bg-transparent'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 -ml-2 text-[#4F6F52] hover:bg-[#F7F5EF] rounded-xl transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-[#7BAE7F] flex items-center justify-center text-white font-bold text-base shadow-[0_4px_14px_rgba(123,174,127,0.4)] group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
            E
          </div>
          <span className="text-xl font-bold text-[#263326] tracking-tight hidden sm:block">Exchanza</span>
        </Link>
      </div>

      {/* Nav links */}
      <nav className="hidden md:flex items-center gap-8">
        {navLinks.map((link) => (
          <NavLink
            key={link.name}
            to={link.path}
            className={({ isActive }) =>
              `text-sm font-medium transition-all duration-200 relative py-1 ${
                isActive
                  ? 'text-[#4F6F52] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-[#7BAE7F] after:rounded-full'
                  : 'text-[#7A8C7A] hover:text-[#4F6F52]'
              }`
            }
          >
            {link.name}
          </NavLink>
        ))}
        {user && isAdmin && (
          <NavLink
            to="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold text-[#4F6F52] bg-[#7BAE7F]/10 hover:bg-[#7BAE7F]/20 hover:text-[#263326] transition-all duration-300 shadow-[0_0_10px_rgba(123,174,127,0.15)] hover:shadow-[0_0_15px_rgba(123,174,127,0.25)] border border-[#7BAE7F]/20"
          >
            <span className="text-base leading-none relative -top-[1px]">👑</span> Admin Panel
          </NavLink>
        )}
      </nav>

      {/* Right: auth */}
      <div className="flex items-center gap-2 sm:gap-4">
        {user ? (
          <>
            {/* Notification Bell */}
            <NotificationBell />

            {/* Messages */}
            <Link to="/messages" className="relative p-2 text-[#7A8C7A] hover:text-[#4F6F52] hover:bg-[#F7F5EF] rounded-xl transition-colors">
              <MessageCircle size={22} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex items-center justify-center w-4 h-4 bg-[#7BAE7F] text-white text-[10px] font-bold rounded-full border-2 border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="h-10 w-10 rounded-full overflow-hidden bg-[#E9E3D5] border-2 border-[#A8C9A3] cursor-pointer flex items-center justify-center text-[#4F6F52] font-bold shadow-sm hover:border-[#7BAE7F] hover:shadow-md transition-all duration-200"
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="User profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm uppercase">
                  {user?.displayName ? user.displayName.charAt(0) : user?.email ? user.email.charAt(0) : 'U'}
                </span>
              )}
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-3 w-60 bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_8px_40px_rgba(79,111,82,0.14)] border border-[#E9E3D5] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b border-[#E9E3D5] bg-[#F7F5EF]/60">
                  <p className="text-sm font-semibold text-[#263326] truncate">
                    {user?.displayName || 'Reader'}
                  </p>
                  <p className="text-xs text-[#7A8C7A] truncate mt-0.5 font-light">
                    {user?.email}
                  </p>
                </div>
                <div className="p-2 space-y-0.5">
                  <NavLink
                    to="/my-books"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-[#7A8C7A] rounded-xl hover:bg-[#F7F5EF] hover:text-[#263326] transition-colors"
                  >
                    <Library size={16} className="text-[#7BAE7F]" /> My Shared Books
                  </NavLink>
                  <NavLink
                    to="/requests"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-[#7A8C7A] rounded-xl hover:bg-[#F7F5EF] hover:text-[#263326] transition-colors"
                  >
                    <Send size={16} className="text-[#7BAE7F]" /> My Requests
                  </NavLink>
                  <NavLink
                    to="/settings"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-[#7A8C7A] rounded-xl hover:bg-[#F7F5EF] hover:text-[#263326] transition-colors"
                  >
                    <UserIcon size={16} className="text-[#7BAE7F]" /> Profile & Settings
                  </NavLink>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-500 rounded-xl hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
          </>
        ) : (
          <Link
            to="/login"
            className="px-6 py-2.5 text-sm font-semibold text-white bg-[#7BAE7F] hover:bg-[#4F6F52] rounded-xl shadow-[0_4px_14px_rgba(123,174,127,0.35)] hover:shadow-[0_6px_20px_rgba(79,111,82,0.4)] transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
          >
            Login
          </Link>
        )}
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="absolute top-20 left-0 w-full bg-[#F7F5EF]/95 backdrop-blur-xl border-b border-[#E9E3D5] shadow-[0_8px_40px_rgba(79,111,82,0.14)] md:hidden animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col p-4 space-y-2">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `px-4 py-3 rounded-xl font-medium text-sm transition-colors ${
                    isActive
                      ? 'bg-[#7BAE7F]/15 text-[#4F6F52]'
                      : 'text-[#7A8C7A] hover:bg-white hover:text-[#263326]'
                  }`
                }
              >
                {link.name}
              </NavLink>
            ))}
            {user && isAdmin && (
              <NavLink
                to="/admin"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm text-[#4F6F52] bg-[#7BAE7F]/10 hover:bg-[#7BAE7F]/20 transition-colors border border-[#7BAE7F]/20"
              >
                <span className="text-base">👑</span> Admin Panel
              </NavLink>
            )}
            {user && (
              <>
                <div className="h-px bg-[#E9E3D5] my-2" />
                <NavLink
                  to="/my-books"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-[#7A8C7A] hover:bg-white hover:text-[#263326]"
                >
                  <Library size={18} className="text-[#7BAE7F]" /> My Shared Books
                </NavLink>
                <NavLink
                  to="/settings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-[#7A8C7A] hover:bg-white hover:text-[#263326]"
                >
                  <UserIcon size={18} className="text-[#7BAE7F]" /> Settings
                </NavLink>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
