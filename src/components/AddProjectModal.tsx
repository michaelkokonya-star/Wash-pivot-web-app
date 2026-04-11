import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Plus, Loader2, Image as ImageIcon } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { compressImage } from '../lib/image-utils';
import { uploadFile } from '../lib/upload';
import { toast } from 'sonner';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddProjectModal: React.FC<AddProjectModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'compressing' | 'uploading' | 'saving'>('idle');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetFunding: '',
    category: 'Water',
    imageUrl: ''
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      toast.error("You must be logged in to perform this action.");
      return;
    }
    if (!user) return;
    setLoading(true);
    setUploadStatus('idle');

    try {
      let finalImageUrl = formData.imageUrl;

      if (imageFile) {
        setUploadStatus('compressing');
        const compressedFile = await compressImage(imageFile);

        setUploadStatus('uploading');
        setUploadProgress(10);
        try {
          finalImageUrl = await uploadFile(compressedFile);
          setUploadProgress(100);
        } catch (uploadError: any) {
          console.error("Upload error:", uploadError);
          toast.error(`Upload failed. ${uploadError.message || "Unknown error."}`);
          throw uploadError;
        }
      }

      setUploadStatus('saving');
      await addDoc(collection(db, 'projects'), {
        ...formData,
        imageUrl: finalImageUrl,
        targetFunding: parseFloat(formData.targetFunding),
        currentFunding: 0,
        status: 'active',
        isApproved: true,
        ownerUid: user.uid,
        ownerName: profile?.displayName || user.displayName || 'Admin',
        createdAt: serverTimestamp(),
        milestones: []
      });
      onSuccess();
      onClose();
      toast.success("Project created successfully!");
      setFormData({
        title: '',
        description: '',
        targetFunding: '',
        category: 'Water',
        imageUrl: ''
      });
      setImageFile(null);
      setImagePreview(null);
    } catch (error) {
      console.error("Error adding project:", error);
      toast.error("Failed to create project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-black/5 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Create New Project</h2>
                <p className="text-sm text-black/40">Fill in the details to launch a new WASH project.</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Project Title</label>
                <input
                  required
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-stone-50 border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors"
                  placeholder="e.g. Community Water Well"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Target Funding (KSh)</label>
                  <input
                    required
                    type="number"
                    value={formData.targetFunding}
                    onChange={(e) => setFormData({ ...formData, targetFunding: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors"
                    placeholder="500000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors appearance-none"
                  >
                    <option value="Water">Water</option>
                    <option value="Sanitation">Sanitation</option>
                    <option value="Solar">Solar</option>
                    <option value="Education">Education</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Project Image</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative aspect-video bg-stone-50 border-2 border-dashed border-black/5 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-stone-100 hover:border-emerald-600/30 transition-all group overflow-hidden"
                  >
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Upload className="text-white" size={24} />
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload size={24} className="text-black/20 mb-2 group-hover:text-emerald-600 transition-colors" />
                        <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">Upload Photo</span>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        type="url"
                        value={formData.imageUrl}
                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors text-xs"
                        placeholder="Or paste image URL..."
                      />
                      <ImageIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" />
                    </div>
                    <p className="text-[9px] text-black/30 leading-relaxed">
                      Upload a high-quality photo representing the project. If no image is provided, a placeholder will be generated.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Description</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-stone-50 border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors h-32 resize-none"
                  placeholder="Describe the project goals and impact..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center space-x-2 shadow-xl shadow-emerald-600/20 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>
                      {uploadStatus === 'compressing' ? 'Optimizing...' : 
                       uploadStatus === 'uploading' ? `Uploading ${Math.round(uploadProgress)}%` : 
                       uploadStatus === 'saving' ? 'Saving...' : 'Processing...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Plus size={20} />
                    <span>Create Project</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AddProjectModal;
