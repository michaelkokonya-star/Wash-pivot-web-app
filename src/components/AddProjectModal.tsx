import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Plus, Loader2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddProjectModal: React.FC<AddProjectModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetFunding: '',
    category: 'Water',
    imageUrl: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      await addDoc(collection(db, 'projects'), {
        ...formData,
        targetFunding: parseFloat(formData.targetFunding),
        currentFunding: 0,
        status: 'active',
        isApproved: true,
        ownerUid: user.uid,
        ownerName: profile?.name || user.displayName || 'Admin',
        createdAt: serverTimestamp(),
        milestones: []
      });
      onSuccess();
      onClose();
      setFormData({
        title: '',
        description: '',
        targetFunding: '',
        category: 'Water',
        imageUrl: ''
      });
    } catch (error) {
      console.error("Error adding project:", error);
      alert("Failed to add project. Check console for details.");
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
                <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Image URL</label>
                <div className="relative">
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors"
                    placeholder="https://images.unsplash.com/..."
                  />
                  <Upload size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" />
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
                  <Loader2 className="animate-spin" size={20} />
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
