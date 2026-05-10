import React, { useState } from 'react';
import { X, Mail, Phone, MapPin, CheckCircle2 } from 'lucide-react';

// Inline SVG brand icons (lucide-react v1 doesn't include brand icons)
const InstagramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
  </svg>
);
const LinkedinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);
const GithubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
  </svg>
);

const Footer = () => {
  const [activeModal, setActiveModal] = useState(null);

  const closeModal = () => setActiveModal(null);

  const modalContent = {
    about: {
      title: 'About Exchanza',
      content: (
        <div className="space-y-4">
          <p className="text-[#7A8C7A] leading-relaxed">
            Exchanza is a peer-to-peer book exchange platform designed to foster a global community of readers. We believe that books should be shared, not shelved.
          </p>
          <div className="space-y-2">
            <h4 className="font-bold text-[#263326]">Our Mission</h4>
            <p className="text-[#7A8C7A] text-sm font-light">
              To make knowledge accessible to everyone while promoting environmental sustainability through the reuse of physical books.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-[#263326]">Student-Friendly Concept</h4>
            <p className="text-[#7A8C7A] text-sm font-light">
              We provide a dedicated space for students to exchange textbooks and academic resources, significantly reducing the financial burden of education.
            </p>
          </div>
        </div>
      )
    },
    privacy: {
      title: 'Privacy Policy',
      content: (
        <div className="space-y-4">
          <p className="text-[#7A8C7A] leading-relaxed text-sm">
            Your privacy is our top priority. We use industry-standard security measures to protect your data.
          </p>
          <ul className="space-y-3">
            {[
              { title: 'User Authentication', desc: 'Secure login powered by Firebase Authentication.' },
              { title: 'Data Security', desc: 'All your listings and profile data are encrypted and stored in Firebase Firestore.' },
              { title: 'No Data Selling', desc: 'We never sell your personal information to third parties or advertisers.' }
            ].map((item, i) => (
              <li key={i} className="flex gap-3">
                <CheckCircle2 size={18} className="text-[#7BAE7F] flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#263326] text-sm">{item.title}</p>
                  <p className="text-xs text-[#7A8C7A] font-light">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )
    },
    terms: {
      title: 'Terms of Service',
      content: (
        <div className="space-y-4">
          <p className="text-[#7A8C7A] leading-relaxed text-sm">
            By using Exchanza, you agree to our community guidelines and values.
          </p>
          <div className="space-y-3">
            <div className="p-4 bg-[#F7F5EF] rounded-2xl border border-[#E9E3D5]">
              <h4 className="font-bold text-sm text-[#4F6F52] mb-1">Respectful Exchanges</h4>
              <p className="text-xs text-[#7A8C7A] font-light">Always be polite and punctual when meeting for a book exchange.</p>
            </div>
            <div className="p-4 bg-[#F7F5EF] rounded-2xl border border-[#E9E3D5]">
              <h4 className="font-bold text-sm text-[#4F6F52] mb-1">User Responsibility</h4>
              <p className="text-xs text-[#7A8C7A] font-light">You are responsible for the accuracy of your book listings and condition reports.</p>
            </div>
            <div className="p-4 bg-[#F7F5EF] rounded-2xl border border-[#E9E3D5]">
              <h4 className="font-bold text-sm text-[#4F6F52] mb-1">Community Guidelines</h4>
              <p className="text-xs text-[#7A8C7A] font-light">No commercial selling. Exchanza is for free exchanges and donations only.</p>
            </div>
          </div>
        </div>
      )
    },
    contact: {
      title: 'Contact Us',
      content: (
        <div className="space-y-5">
          <p className="text-[#7A8C7A] leading-relaxed text-sm">
            Have questions or feedback? We'd love to hear from you.
          </p>
          <div className="space-y-4">
            <a href="mailto:support@exchanza.com" className="flex items-center gap-4 p-4 bg-white border border-[#E9E3D5] rounded-2xl hover:border-[#7BAE7F] hover:shadow-md transition-all group">
              <div className="w-10 h-10 bg-[#F7F5EF] text-[#7BAE7F] rounded-xl flex items-center justify-center group-hover:bg-[#7BAE7F] group-hover:text-white transition-colors">
                <Mail size={20} />
              </div>
              <div>
                <p className="text-xs text-[#7A8C7A] font-light">Email Support</p>
                <p className="text-sm font-semibold text-[#263326]">support@exchanza.com</p>
              </div>
            </a>
            <div className="flex items-center gap-4 p-4 bg-white border border-[#E9E3D5] rounded-2xl">
              <div className="w-10 h-10 bg-[#F7F5EF] text-[#7BAE7F] rounded-xl flex items-center justify-center">
                <Phone size={20} />
              </div>
              <div>
                <p className="text-xs text-[#7A8C7A] font-light">Phone</p>
                <p className="text-sm font-semibold text-[#263326]">+91 98765 43210</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-white border border-[#E9E3D5] rounded-2xl">
              <div className="w-10 h-10 bg-[#F7F5EF] text-[#7BAE7F] rounded-xl flex items-center justify-center">
                <MapPin size={20} />
              </div>
              <div>
                <p className="text-xs text-[#7A8C7A] font-light">Location</p>
                <p className="text-sm font-semibold text-[#263326]">Salem, Tamil Nadu, India</p>
              </div>
            </div>
          </div>
        </div>
      )
    }
  };

  return (
    <footer className="px-6 lg:px-12 pt-20 pb-10 bg-[#263326] relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#7BAE7F] rounded-full blur-[150px] opacity-[0.03] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Section */}
          <div className="space-y-6 col-span-1 lg:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#7BAE7F] flex items-center justify-center text-white font-bold text-lg shadow-lg">
                E
              </div>
              <span className="font-bold text-white text-xl tracking-tight">Exchanza</span>
            </div>
            <p className="text-[#A8C9A3] text-sm leading-relaxed font-light max-w-xs">
              Exchange books, share knowledge, and build a sustainable reading community.
            </p>
            <div className="flex items-center gap-4 pt-2">
              {[
                { icon: <InstagramIcon />, href: 'https://instagram.com' },
                { icon: <LinkedinIcon />, href: 'https://linkedin.com' },
                { icon: <GithubIcon />, href: 'https://github.com' }
              ].map((social, i) => (
                <a 
                  key={i} 
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#A8C9A3] hover:bg-[#7BAE7F] hover:text-white hover:scale-110 transition-all duration-300"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="text-white font-bold text-base">Platform</h4>
            <ul className="space-y-3">
              {['About', 'Privacy', 'Terms', 'Contact'].map((item) => (
                <li key={item}>
                  <button 
                    onClick={() => setActiveModal(item.toLowerCase())}
                    className="text-[#7A8C7A] hover:text-[#7BAE7F] transition-colors text-sm font-medium"
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div className="space-y-6">
            <h4 className="text-white font-bold text-base">Categories</h4>
            <ul className="space-y-3">
              {['Fiction', 'Non-Fiction', 'Academic', 'Self-Help'].map((item) => (
                <li key={item}>
                  <a href="/explore" className="text-[#7A8C7A] hover:text-[#7BAE7F] transition-colors text-sm font-medium">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter / Contact Hint */}
          <div className="space-y-6">
            <h4 className="text-white font-bold text-base">Community</h4>
            <p className="text-[#7A8C7A] text-sm font-light leading-relaxed">
              Join our mailing list for updates on new books and community events.
            </p>
            <div className="relative">
              <input 
                type="email" 
                placeholder="Your email" 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-[#7A8C7A] focus:outline-none focus:ring-2 focus:ring-[#7BAE7F] transition-all"
              />
              <button className="absolute right-2 top-2 bottom-2 px-3 bg-[#7BAE7F] hover:bg-[#4F6F52] text-white text-xs font-bold rounded-lg transition-colors">
                Join
              </button>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-xs text-[#7A8C7A] font-light">
            © {new Date().getFullYear()} Exchanza. Built for readers by readers.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-[10px] text-[#4F6F52] uppercase tracking-widest font-bold bg-[#DDE5D3]/10 px-3 py-1 rounded-full border border-[#DDE5D3]/5">
              Secure with Firebase
            </span>
            <span className="text-[10px] text-[#7BAE7F] uppercase tracking-widest font-bold bg-[#7BAE7F]/10 px-3 py-1 rounded-full border border-[#7BAE7F]/5">
              Eco Friendly
            </span>
          </div>
        </div>
      </div>

      {/* Info Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#263326]/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 relative">
            {/* Modal Header */}
            <div className="px-8 pt-8 pb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#263326]">{modalContent[activeModal]?.title}</h2>
              <button 
                onClick={closeModal}
                className="p-2 hover:bg-[#F7F5EF] rounded-full text-[#7A8C7A] hover:text-[#263326] transition-all"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="px-8 pb-10 max-h-[70vh] overflow-y-auto">
              {modalContent[activeModal]?.content}
            </div>

            {/* Modal Footer Decorative */}
            <div className="h-2 bg-gradient-to-r from-[#7BAE7F] to-[#4F6F52]" />
          </div>
        </div>
      )}
    </footer>
  );
};

export default Footer;
