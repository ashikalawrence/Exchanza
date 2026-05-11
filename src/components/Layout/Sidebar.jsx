import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { BookOpen, LayoutDashboard, Compass, Heart, Settings, LogOut, PlusCircle, Library, Users, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
      alert("Failed to log out");
    }
  };

  const navItems = [
    { name: 'Dashboard',       path: '/',         icon: <LayoutDashboard size={20} /> },
    { name: 'Explore',         path: '/explore',  icon: <Compass size={20} /> },
    { name: 'Book Circles',    path: '/circles',  icon: <Users size={20} /> },
    { name: 'My Shared Books', path: '/my-books', icon: <Library size={20} /> },
    { name: 'Wishlist',        path: '/wishlist', icon: <Heart size={20} /> },
    { name: 'Add Book',        path: '/add-book', icon: <PlusCircle size={20} /> },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-center h-16 border-b border-slate-200 dark:border-slate-800 px-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center text-white font-bold text-xl">
              E
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-secondary-600">Exchanza</span>
          </div>
        </div>

        <div className="flex flex-col h-[calc(100vh-4rem)] justify-between p-4">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                  }`
                }
              >
                {item.icon}
                {item.name}
              </NavLink>
            ))}
          </nav>

          <div className="space-y-1 border-t border-slate-200 dark:border-slate-800 pt-4">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                }`
              }
            >
              <Settings size={20} />
              Settings
            </NavLink>
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                    isActive
                      ? 'bg-[#7BAE7F]/10 text-[#4F6F52]'
                      : 'text-[#7BAE7F] hover:bg-[#7BAE7F]/10 hover:text-[#4F6F52]'
                  }`
                }
              >
                <Shield size={20} />
                Admin Panel
              </NavLink>
            )}
            <button 
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
