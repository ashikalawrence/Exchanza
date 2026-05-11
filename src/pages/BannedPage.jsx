import React from 'react';
import { ShieldOff, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BannedPage = () => {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center px-4">
      {/* Blobs */}
      <div className="fixed top-[-80px] right-[-80px] w-[400px] h-[400px] rounded-full bg-red-400 blur-[140px] opacity-10 pointer-events-none" />
      <div className="fixed bottom-[-60px] left-[-60px] w-[350px] h-[350px] rounded-full bg-red-300 blur-[120px] opacity-10 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-50 border border-red-200 mb-6 shadow-lg">
          <ShieldOff size={36} className="text-red-500" />
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-[#E9E3D5]">
          <h1 className="text-2xl font-bold text-[#263326] mb-3">Account Suspended</h1>
          <p className="text-[#7A8C7A] text-sm leading-relaxed mb-6">
            Your account has been suspended by admin.
            If you believe this is a mistake, please contact our support team.
          </p>

          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 text-left">
            <p className="text-red-600 text-sm font-medium flex items-start gap-2">
              <ShieldOff size={16} className="mt-0.5 flex-shrink-0" />
              This account has been restricted from accessing Exchanza.
            </p>
          </div>

          <div className="space-y-3">
            <a
              href="mailto:support@exchanza.com"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#7BAE7F] hover:bg-[#4F6F52] text-white rounded-xl font-semibold text-sm transition-all duration-300 shadow-[0_4px_15px_rgba(123,174,127,0.3)]"
            >
              <Mail size={16} /> Contact Support
            </a>
            <button
              onClick={logout}
              className="w-full py-3 px-4 bg-[#F7F5EF] hover:bg-[#E9E3D5] text-[#4F6F52] rounded-xl font-semibold text-sm border border-[#E9E3D5] transition-all duration-300"
            >
              Sign Out
            </button>
          </div>
        </div>

        <p className="mt-6 text-[#7A8C7A] text-xs">Exchanza &mdash; Book Exchange Community</p>
      </div>
    </div>
  );
};

export default BannedPage;
