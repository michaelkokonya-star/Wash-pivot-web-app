import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Save, Loader2, Mail, Phone, MapPin, Image as ImageIcon } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

interface EditServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  service: any;
}

const EditServiceModal: React.FC<EditServiceModalProps> = ({ isOpen, onClose, onSuccess, service }) => {
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Installation',
    subCategory: 'None',
    description: '',
    imageUrl: '',
    contactEmail: '',
    contactPhone: '',
    location: ''
  });

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name || '',
        category: service.category || 'Installation',
        subCategory: service.subCategory || 'None',
        description: service.description || '',
        imageUrl: service.imageUrl || '',
        contactEmail: service.contactEmail || '',
        contactPhone: service.contactPhone || '',
        location: service.location || ''
      });
      setImagePreview(service.imageUrl || null);
    }
  }, [service]);

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
    if (!service?.id) return;
    setLoading(true);

    try {
      let finalImageUrl = formData.imageUrl;

      if (imageFile) {
        const storageRef = ref(storage, `services/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        finalImageUrl = await getDownloadURL(snapshot.ref);
      }

      const serviceRef = doc(db, 'service_providers', service.id);
      await updateDoc(serviceRef, {
        ...formData,
        imageUrl: finalImageUrl
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating service provider:", error);
      alert("Failed to update service provider. Check console for details.");
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
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="p-8 border-b border-black/5 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Edit Service Provider</h2>
                <p className="text-sm text-black/40">Update the details for this professional service.</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Provider Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-stone-50 border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors"
                  placeholder="e.g. SolarTech Solutions"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value, subCategory: 'None' })}
                    className="w-full px-4 py-3 bg-stone-50 border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors appearance-none"
                  >
                    <option value="Installation">Installation</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Consulting">Consulting</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Drilling">Drilling</option>
                    <option value="Water Treatment">Water Treatment</option>
                    <option value="Solar">Solar</option>
                    <option value="Sanitation">Sanitation</option>
                  </select>
                </div>

                {formData.category === 'Water Treatment' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Sub-Category</label>
                    <select
                      value={formData.subCategory}
                      onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                      className="w-full px-4 py-3 bg-stone-50 border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors appearance-none"
                    >
                      <option value="None">None</option>
                      <option value="Fluoride Removal">Fluoride Removal</option>
                      <option value="Filtration">Filtration</option>
                      <option value="Chlorination">Chlorination</option>
                    </select>
                  </div>
                )}

                {formData.category === 'Solar' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Sub-Category</label>
                    <select
                      value={formData.subCategory}
                      onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                      className="w-full px-4 py-3 bg-stone-50 border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors appearance-none"
                    >
                      <option value="None">None</option>
                      <option value="Solar Panels">Solar Panels</option>
                      <option value="Batteries">Batteries</option>
                      <option value="Charge Controller">Charge Controller</option>
                      <option value="Inverter">Inverter</option>
                      <option value="Accessories">Accessories</option>
                    </select>
                  </div>
                )}

                {formData.category === 'Sanitation' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Sub-Category</label>
                    <select
                      value={formData.subCategory}
                      onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                      className="w-full px-4 py-3 bg-stone-50 border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors appearance-none"
                    >
                      <option value="None">None</option>
                      <option value="Exhaust Services">Exhaust Services</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Contact Email</label>
                  <div className="relative">
                    <input
                      required
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors"
                      placeholder="contact@provider.com"
                    />
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Contact Phone</label>
                  <div className="relative">
                    <input
                      required
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors"
                      placeholder="+254 700 000 000"
                    />
                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Location</label>
                <div className="relative">
                  <input
                    required
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors"
                    placeholder="e.g. Nairobi, Kenya"
                  />
                  <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Provider Image</label>
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
                      Upload a new photo to replace the current one. If no image is provided, the existing one will be kept.
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
                  placeholder="Describe the services offered..."
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
                    <Save size={20} />
                    <span>Save Changes</span>
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

export default EditServiceModal;
