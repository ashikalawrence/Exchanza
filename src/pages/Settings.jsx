import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  User, Bell, Save, LogOut, CheckCircle2, ArrowLeft, 
  Camera, Shield, UserCircle, Mail, Key, Calendar, BookOpen, Activity, Heart, ShieldCheck, Settings as SettingsIcon, Flag, X, Loader2
} from 'lucide-react';
import { collection, query, where, getCountFromServer, doc, getDoc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../firebase/config';

const COLORS = ['#7BAE7F', '#4F6F52', '#A8C9A3', '#E9E3D5', '#263326', '#E2A98B', '#6B9080'];

const getSvgAvatar = (initials, bgColor) => {
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${bgColor.replace('#', '%23')}"/><text x="50" y="50" text-anchor="middle" dy=".3em" font-family="Arial" font-weight="bold" font-size="40" fill="white">${initials}</text></svg>`;
};

const Settings = () => {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Report Issue Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({ title: '', description: '', screenshotUrl: '' });
  const [submittingReport, setSubmittingReport] = useState(false);

  const handleReportSubmit = async () => {
    if (!reportForm.title.trim() || !reportForm.description.trim()) return;
    setSubmittingReport(true);
    try {
      await addDoc(collection(db, 'reports'), {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userEmail: user.email || '',
        title: reportForm.title.trim(),
        description: reportForm.description.trim(),
        screenshotUrl: reportForm.screenshotUrl.trim() || null,
        status: 'open',
        createdAt: serverTimestamp(),
      });
      setShowReportModal(false);
      setReportForm({ title: '', description: '', screenshotUrl: '' });
      setToastMessage('Issue reported successfully. Our team will review it shortly.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch (e) {
      console.error('Error submitting report:', e);
      setToastMessage('Failed to submit report. Please try again.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } finally {
      setSubmittingReport(false);
    }
  };

  // Stats
  const [stats, setStats] = useState({ shared: 0, exchanges: 0, wishlist: 0 });

  // Form State
  const [formData, setFormData] = useState({
    fullName: user?.displayName || '',
    username: '',
    bio: '',
    college: '',
    favoriteGenre: '',
    avatarColor: '#7BAE7F',
    photoURL: user?.photoURL || '',
    showProfilePublicly: true,
    allowExchangeRequests: true,
    allowChatMessages: true,
    notifyExchangeRequests: true,
    notifyChatMessages: true,
    notifyWishlist: true,
  });

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      try {
        // Fetch User Doc
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setFormData(prev => ({
            ...prev,
            fullName: data.fullName || user.displayName || '',
            username: data.username || '',
            bio: data.bio || '',
            college: data.college || '',
            favoriteGenre: data.favoriteGenre || '',
            avatarColor: data.avatarColor || '#7BAE7F',
            photoURL: data.photoURL || user.photoURL || '',
            showProfilePublicly: data.showProfilePublicly ?? true,
            allowExchangeRequests: data.allowExchangeRequests ?? true,
            allowChatMessages: data.allowChatMessages ?? true,
            notifyExchangeRequests: data.notifyExchangeRequests ?? true,
            notifyChatMessages: data.notifyChatMessages ?? true,
            notifyWishlist: data.notifyWishlist ?? true,
          }));
        }

        // Fetch Stats
        let sharedCount = 0;
        let exchangeCount = 0;
        try {
          const sharedQ = query(collection(db, 'books'), where('ownerId', '==', user.uid));
          const sharedSnap = await getCountFromServer(sharedQ);
          sharedCount = sharedSnap.data().count;

          const reqQ = query(collection(db, 'exchangeRequests'), where('requesterId', '==', user.uid));
          const reqSnap = await getCountFromServer(reqQ);
          exchangeCount = reqSnap.data().count;
        } catch (e) { console.error(e); }

        const wishlistStr = localStorage.getItem('localWishlist');
        const wishlistCount = wishlistStr ? JSON.parse(wishlistStr).length : 0;

        setStats({ shared: sharedCount, exchanges: exchangeCount, wishlist: wishlistCount });
      } catch (error) {
        console.error("Error fetching user data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('localWishlist');
      localStorage.removeItem('localRequests');
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1048576) {
        alert("Image must be smaller than 1MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photoURL: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const generateInitials = () => {
    const name = formData.fullName || user?.email || 'U';
    return name.substring(0, 2).toUpperCase();
  };

  const handleColorSelect = (color) => {
    const svgUrl = getSvgAvatar(generateInitials(), color);
    setFormData({ ...formData, avatarColor: color, photoURL: svgUrl });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Update Firebase Auth Profile
      await updateProfile(auth.currentUser, {
        displayName: formData.fullName,
        photoURL: formData.photoURL
      });
      // 2. Update Context User for Navbar
      if (setUser) {
        setUser({ ...auth.currentUser, displayName: formData.fullName, photoURL: formData.photoURL });
      }

      // 3. Update Firestore Document
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        ...formData,
        uid: user.uid,
        email: user.email,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setToastMessage('Profile updated successfully!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error("Error saving profile", error);
      setToastMessage('Failed to save profile. Try again.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ value, onChange }) => (
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#7BAE7F] focus:ring-offset-2 ${
        value ? 'bg-[#7BAE7F]' : 'bg-[#E9E3D5]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  const inputClass = "w-full px-4 py-3 bg-[#F7F5EF] border border-[#E9E3D5] rounded-xl text-[#263326] text-sm focus:outline-none focus:ring-2 focus:ring-[#7BAE7F] transition-all";
  const labelClass = "block text-sm font-semibold text-[#4F6F52] mb-1.5";

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin text-[#7BAE7F]"><SettingsIcon size={32} /></div></div>;
  }

  const creationDate = user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown';
  const loginProvider = user?.providerData[0]?.providerId === 'google.com' ? 'Google Account' : 'Email/Password';

  return (
    <div className="pb-16 px-6 lg:px-12 pt-10 max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
      
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 flex-shrink-0 space-y-6">
        <div className="mb-6 flex items-center">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 text-[#7A8C7A] hover:text-[#263326] transition-colors font-medium text-sm px-4 py-2 bg-white hover:bg-[#F7F5EF] rounded-xl border border-[#E9E3D5] shadow-sm"
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>
        
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E9E3D5] flex flex-col gap-2">
          {[
            { id: 'profile', label: 'Edit Profile', icon: <UserCircle size={18} /> },
            { id: 'account', label: 'Account', icon: <User size={18} /> },
            { id: 'privacy', label: 'Privacy', icon: <Shield size={18} /> },
            { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-[#7BAE7F]/10 text-[#4F6F52] border border-[#7BAE7F]/20' 
                  : 'text-[#7A8C7A] hover:bg-[#F7F5EF] hover:text-[#263326] border border-transparent'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
          <div className="pt-2 mt-2 border-t border-[#E9E3D5] space-y-1">
            <button
              onClick={() => setShowReportModal(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#7A8C7A] hover:bg-orange-50 hover:text-orange-600 transition-all"
            >
              <Flag size={18} className="text-orange-400" /> Report an Issue
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
            >
              <LogOut size={18} /> Log out
            </button>
          </div>
        </div>

        {/* Profile Statistics Card */}
        <div className="bg-[#263326] rounded-2xl p-6 shadow-sm border border-[#4F6F52]/40 text-white space-y-5">
          <h3 className="font-bold text-lg flex items-center gap-2"><Activity size={18} className="text-[#A8C9A3]" /> Your Impact</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-[#A8C9A3]"><BookOpen size={16} /> Shared</div>
              <span className="font-bold">{stats.shared}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-[#A8C9A3]"><ShieldCheck size={16} /> Exchanges</div>
              <span className="font-bold">{stats.exchanges}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-[#A8C9A3]"><Heart size={16} /> Wishlist</div>
              <span className="font-bold">{stats.wishlist}</span>
            </div>
          </div>
          <div className="pt-4 border-t border-[#4F6F52]/40 text-xs text-center text-[#7A8C7A]">
            Joined {creationDate}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#263326] tracking-tight">Settings</h1>
          <p className="text-[#7A8C7A] mt-1 font-light">Manage your profile, preferences, and account details.</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#E9E3D5] animate-in fade-in duration-300">
          
          {/* TAB: PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              {/* Avatar System */}
              <div className="flex flex-col sm:flex-row items-center gap-8 pb-8 border-b border-[#E9E3D5]">
                <div className="relative group">
                  <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-[#E9E3D5] bg-[#F7F5EF] shadow-md flex items-center justify-center text-4xl font-bold text-white transition-all group-hover:border-[#7BAE7F]">
                    {formData.photoURL ? (
                      <img src={formData.photoURL} alt="Avatar Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#7BAE7F]">{generateInitials()}</div>
                    )}
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-3 bg-[#7BAE7F] text-white rounded-full shadow-lg hover:bg-[#4F6F52] hover:scale-105 transition-all"
                  >
                    <Camera size={18} />
                  </button>
                  <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                </div>
                
                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <h3 className="font-bold text-[#263326] text-lg">Profile Avatar</h3>
                  <p className="text-sm text-[#7A8C7A] font-light max-w-md">Upload a new profile image, or pick an elegant background color for your initials.</p>
                  
                  <div className="flex items-center gap-3 pt-2 justify-center sm:justify-start">
                    {COLORS.map(color => (
                      <button 
                        key={color}
                        onClick={() => handleColorSelect(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${formData.avatarColor === color ? 'border-[#263326] scale-110' : 'border-transparent hover:scale-110'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className={inputClass} placeholder="Jane Doe" />
                </div>
                <div>
                  <label className={labelClass}>Username</label>
                  <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className={inputClass} placeholder="@janereads" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Bio / About</label>
                  <textarea rows={3} value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className={inputClass} placeholder="Tell the community about yourself and your reading habits..." />
                </div>
                <div>
                  <label className={labelClass}>College / Institution</label>
                  <input type="text" value={formData.college} onChange={e => setFormData({...formData, college: e.target.value})} className={inputClass} placeholder="e.g. University of Science" />
                </div>
                <div>
                  <label className={labelClass}>Favorite Genre</label>
                  <select value={formData.favoriteGenre} onChange={e => setFormData({...formData, favoriteGenre: e.target.value})} className={inputClass}>
                    <option value="">Select a genre</option>
                    <option value="Fiction">Fiction</option>
                    <option value="Non-Fiction">Non-Fiction</option>
                    <option value="Science Fiction">Science Fiction</option>
                    <option value="Fantasy">Fantasy</option>
                    <option value="Mystery">Mystery</option>
                    <option value="Biography">Biography</option>
                    <option value="Self-Help">Self-Help</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ACCOUNT */}
          {activeTab === 'account' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold text-[#263326] mb-4">Account Information</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-[#F7F5EF] rounded-2xl border border-[#E9E3D5]">
                  <div className="w-12 h-12 bg-white text-[#7BAE7F] rounded-xl flex items-center justify-center shadow-sm"><Mail size={20} /></div>
                  <div>
                    <p className="text-xs text-[#7A8C7A] font-light">Email Address</p>
                    <p className="text-sm font-semibold text-[#263326]">{user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-[#F7F5EF] rounded-2xl border border-[#E9E3D5]">
                  <div className="w-12 h-12 bg-white text-[#7BAE7F] rounded-xl flex items-center justify-center shadow-sm"><Key size={20} /></div>
                  <div>
                    <p className="text-xs text-[#7A8C7A] font-light">Login Provider</p>
                    <p className="text-sm font-semibold text-[#263326]">{loginProvider}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-[#F7F5EF] rounded-2xl border border-[#E9E3D5]">
                  <div className="w-12 h-12 bg-white text-[#7BAE7F] rounded-xl flex items-center justify-center shadow-sm"><Calendar size={20} /></div>
                  <div>
                    <p className="text-xs text-[#7A8C7A] font-light">Account Created</p>
                    <p className="text-sm font-semibold text-[#263326]">{creationDate}</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-[#7A8C7A] font-light mt-4">To change your email or password, please contact support.</p>
            </div>
          )}

          {/* TAB: PRIVACY */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold text-[#263326] mb-4">Privacy Controls</h2>
              <div className="space-y-1">
                {[
                  { id: 'showProfilePublicly', label: 'Show Profile Publicly', desc: 'Allow other users to see your basic profile information.' },
                  { id: 'allowExchangeRequests', label: 'Allow Exchange Requests', desc: 'Receive requests from users who want to exchange books.' },
                  { id: 'allowChatMessages', label: 'Allow Chat Messages', desc: 'Permit users to send you direct messages.' },
                ].map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 border-b border-[#E9E3D5] last:border-0">
                    <div className="pr-6">
                      <p className="font-semibold text-[#263326] text-sm">{item.label}</p>
                      <p className="text-xs text-[#7A8C7A] font-light mt-1">{item.desc}</p>
                    </div>
                    <Toggle value={formData[item.id]} onChange={(val) => setFormData({...formData, [item.id]: val})} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold text-[#263326] mb-4">Notification Preferences</h2>
              <div className="space-y-1">
                {[
                  { id: 'notifyExchangeRequests', label: 'Exchange Request Alerts', desc: 'Get notified when someone requests your book.' },
                  { id: 'notifyChatMessages', label: 'Chat Message Alerts', desc: 'Receive alerts for new unread messages.' },
                  { id: 'notifyWishlist', label: 'Wishlist Availability', desc: 'Know when a book from your wishlist becomes available nearby.' },
                ].map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 border-b border-[#E9E3D5] last:border-0">
                    <div className="pr-6">
                      <p className="font-semibold text-[#263326] text-sm">{item.label}</p>
                      <p className="text-xs text-[#7A8C7A] font-light mt-1">{item.desc}</p>
                    </div>
                    <Toggle value={formData[item.id]} onChange={(val) => setFormData({...formData, [item.id]: val})} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-8 mt-8 border-t border-[#E9E3D5] flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm text-white bg-[#7BAE7F] hover:bg-[#4F6F52] shadow-sm hover:shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed active:scale-95"
            >
              <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

        </div>
      </div>

      {/* Success Toast */}
      {showToast && (
        <div className="fixed bottom-8 right-8 bg-[#263326] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 z-50 border border-[#4F6F52]/40">
          <CheckCircle2 className="text-[#7BAE7F]" size={22} />
          <div>
            <p className="font-semibold text-sm">{toastMessage}</p>
            <p className="text-xs text-[#A8C9A3] font-light mt-0.5">Your changes are now live.</p>
          </div>
        </div>
      )}

      {/* Report Issue Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-[#E9E3D5] animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-[#E9E3D5] flex items-center justify-between">
              <div>
                <h2 className="font-bold text-[#263326] text-lg flex items-center gap-2">
                  <Flag size={18} className="text-orange-400" /> Report an Issue
                </h2>
                <p className="text-xs text-[#7A8C7A] font-light mt-0.5">Help us improve Exchanza by reporting bugs or problems.</p>
              </div>
              <button onClick={() => setShowReportModal(false)} className="p-2 text-[#7A8C7A] hover:text-[#263326] hover:bg-[#F7F5EF] rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={labelClass}>Issue Title <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={reportForm.title}
                  onChange={e => setReportForm({ ...reportForm, title: e.target.value })}
                  placeholder="e.g. Exchange button not working"
                  className={inputClass}
                  maxLength={100}
                />
              </div>
              <div>
                <label className={labelClass}>Description <span className="text-red-400">*</span></label>
                <textarea
                  rows={4}
                  value={reportForm.description}
                  onChange={e => setReportForm({ ...reportForm, description: e.target.value })}
                  placeholder="Describe the issue in detail — what happened, what you expected, and steps to reproduce..."
                  className={`${inputClass} resize-none`}
                  maxLength={1000}
                />
              </div>
              <div>
                <label className={labelClass}>Screenshot URL <span className="text-[#7A8C7A] font-normal">(Optional)</span></label>
                <input
                  type="url"
                  value={reportForm.screenshotUrl}
                  onChange={e => setReportForm({ ...reportForm, screenshotUrl: e.target.value })}
                  placeholder="https://imgur.com/your-screenshot"
                  className={inputClass}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 py-3 bg-[#F7F5EF] hover:bg-[#E9E3D5] text-[#4F6F52] font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReportSubmit}
                  disabled={!reportForm.title.trim() || !reportForm.description.trim() || submittingReport}
                  className="flex-1 py-3 bg-[#7BAE7F] hover:bg-[#4F6F52] text-white font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
                >
                  {submittingReport ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : <><Flag size={16} /> Submit Report</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
