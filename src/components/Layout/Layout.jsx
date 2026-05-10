import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { CheckCircle2 } from 'lucide-react';

const Layout = () => {
  const [toast, setToast] = useState({ show: false, title: '', message: '' });

  useEffect(() => {
    const handleShowToast = (e) => {
      setToast({ show: true, ...e.detail });
      setTimeout(() => setToast({ show: false, title: '', message: '' }), 3200);
    };
    window.addEventListener('showGlobalToast', handleShowToast);
    return () => window.removeEventListener('showGlobalToast', handleShowToast);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EF] transition-colors duration-300 relative">
      <Navbar />

      <main className="flex-1 w-full pt-20">
        <Outlet />
      </main>

      <Footer />

      {/* Global toast */}
      {toast.show && (
        <div className="fixed bottom-8 right-8 bg-[#263326] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 z-[100] border border-[#4F6F52]/40">
          <CheckCircle2 className="text-[#7BAE7F] flex-shrink-0" size={22} />
          <div>
            <p className="font-semibold text-sm">{toast.title}</p>
            <p className="text-xs text-[#A8C9A3] font-light mt-0.5">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
