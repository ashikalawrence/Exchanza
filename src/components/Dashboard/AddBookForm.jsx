import React, { useState } from 'react';
import { Upload, BookPlus, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';

const CATEGORIES = ['Fiction', 'Non-Fiction', 'Science', 'Technology', 'History', 'Philosophy', 'Biography', 'Self-Help'];
const CONDITIONS = ['Like New', 'Good', 'Fair', 'Poor'];

const AddBookForm = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '', author: '', category: 'Fiction', condition: 'Good', type: 'Exchange', description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageBase64, setImageBase64] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImageBase64(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const bookData = {
        title: formData.title,
        author: formData.author,
        category: formData.category,
        condition: formData.condition,
        listingType: formData.type,
        type: formData.type,
        description: formData.description,
        imageUrl: imageBase64,
        ownerId: user ? user.uid : 'anonymous',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'books'), bookData);

      window.dispatchEvent(new Event('booksUpdated'));
      window.dispatchEvent(new CustomEvent('showGlobalToast', {
        detail: { title: 'Book Added!', message: `Successfully listed "${formData.title}".` }
      }));

      setFormData({ title: '', author: '', category: 'Fiction', condition: 'Good', type: 'Exchange', description: '' });
      setImageBase64(null);
    } catch (error) {
      console.error('Error adding book:', error);
      alert('Failed to add book. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full px-4 py-3 border border-[#E9E3D5] bg-[#F7F5EF] text-[#263326] rounded-xl focus:ring-2 focus:ring-[#7BAE7F] focus:border-[#7BAE7F] focus:bg-white transition-all text-sm placeholder:text-[#7A8C7A]";
  const labelClass = "text-sm font-semibold text-[#4F6F52] block mb-1.5";

  return (
    <div className="pb-16 px-6 lg:px-12 pt-10 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-[#263326] rounded-[2rem] p-10 text-white flex items-center gap-6 shadow-sm border border-[#4F6F52]/30">
        <div className="p-4 bg-[#7BAE7F]/20 rounded-2xl">
          <BookPlus size={32} className="text-[#A8C9A3]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">List a New Book</h1>
          <p className="text-[#A8C9A3] mt-2 font-light">Share your books with the community for exchange or donation.</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-sm border border-[#E9E3D5] space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Book Title</label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} required
              className={inputClass} placeholder="e.g. The Great Gatsby" />
          </div>

          <div>
            <label className={labelClass}>Author</label>
            <input type="text" name="author" value={formData.author} onChange={handleChange} required
              className={inputClass} placeholder="e.g. F. Scott Fitzgerald" />
          </div>

          <div>
            <label className={labelClass}>Category</label>
            <select name="category" value={formData.category} onChange={handleChange} className={inputClass}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Condition</label>
            <select name="condition" value={formData.condition} onChange={handleChange} className={inputClass}>
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Listing type */}
          <div className="md:col-span-2">
            <label className={labelClass}>Listing Type</label>
            <div className="flex gap-4">
              {['Exchange', 'Donate'].map(type => (
                <label
                  key={type}
                  className={`flex-1 flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                    formData.type === type
                      ? 'border-[#7BAE7F] bg-[#7BAE7F]/5 text-[#4F6F52]'
                      : 'border-[#E9E3D5] bg-[#F7F5EF] text-[#7A8C7A] hover:border-[#A8C9A3]'
                  }`}
                >
                  <input type="radio" name="type" value={type} checked={formData.type === type}
                    onChange={handleChange} className="accent-[#7BAE7F]" />
                  <span className="font-semibold text-sm">For {type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className={labelClass}>Description <span className="font-light text-[#7A8C7A]">(Optional)</span></label>
            <textarea name="description" value={formData.description} onChange={handleChange}
              rows="3" className={inputClass} placeholder="Tell us a bit about the book…" />
          </div>

          {/* Image upload */}
          <div className="md:col-span-2">
            <label className={labelClass}>Book Cover Image</label>
            <label className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer min-h-[180px] relative overflow-hidden transition-all group ${
              imageBase64
                ? 'border-[#7BAE7F]'
                : 'border-[#E9E3D5] hover:border-[#A8C9A3] hover:bg-[#F7F5EF]'
            }`}>
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              {imageBase64 ? (
                <img src={imageBase64} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <>
                  <div className="w-12 h-12 bg-[#E9E3D5] rounded-full flex items-center justify-center text-[#7BAE7F] group-hover:scale-110 transition-transform mb-3">
                    <Upload size={22} />
                  </div>
                  <p className="font-semibold text-[#263326] text-sm">Click to upload a cover image</p>
                  <p className="text-xs text-[#7A8C7A] mt-1 font-light">PNG, JPG, GIF (max 800×400px)</p>
                </>
              )}
            </label>
            {imageBase64 && (
              <div className="flex justify-end mt-2">
                <button type="button" onClick={() => setImageBase64(null)}
                  className="text-sm text-red-500 hover:text-red-600 font-medium">
                  Remove Image
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 bg-[#7BAE7F] hover:bg-[#4F6F52] text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-[#7BAE7F] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
          >
            {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Listing…</> : 'List Book'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddBookForm;
