import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, Shield, CheckCircle2, XCircle, Phone, Eye, EyeOff, Save, Loader2, Award, GraduationCap, Briefcase, Clock, Settings, LogOut, Sparkles, Package, ExternalLink, Lock, Camera, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, updateDoc, doc } from 'firebase/firestore';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface Order {
  id: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'paid' | 'failed' | 'shipped' | 'delivered';
  paymentMethod: 'card' | 'mpesa';
  createdAt: string;
}

const Profile = () => {
  const { user, profile, logout, changePassword, authFetch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [formData, setFormData] = useState({
    displayName: '',
    phoneNumber: '',
    showContacts: true,
    expertise: '',
    bio: '',
    academics: [] as string[],
    academicCredentials: [] as { id: string, type: string, institution: string, specialization: string }[]
  });

  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = getPasswordStrength(newPassword);
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-emerald-500'];

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        phoneNumber: profile.phoneNumber || '',
        showContacts: profile.showContacts ?? true,
        expertise: profile.expertise || '',
        bio: profile.bio || '',
        academics: profile.academics || [],
        academicCredentials: profile.academicCredentials || []
      });
    }
  }, [profile]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'orders'), 
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const userOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
        setOrders(userOrders);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage(null);

    try {
      const updateData: any = {
        displayName: formData.displayName,
        phoneNumber: formData.phoneNumber,
        showContacts: formData.showContacts
      };

      if (profile?.role === 'expert') {
        updateData.expertise = formData.expertise;
        updateData.bio = formData.bio;
        updateData.academics = formData.academics;
        updateData.academicCredentials = formData.academicCredentials;
      }

      await updateDoc(doc(db, 'users', user.uid), updateData);

      // Also update public profile if it exists
      if (profile?.role === 'expert') {
        try {
          await updateDoc(doc(db, 'public_profiles', user.uid), updateData);
        } catch (e) {
          // Public profile might not exist
        }
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (strength < 3) {
      setMessage({ type: 'error', text: 'Please choose a stronger password.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await changePassword(newPassword);
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword('');
      setIsChangingPassword(false);
    } catch (error: any) {
      console.error("Error updating password:", error);
      if (error.code === 'auth/requires-recent-login') {
        setMessage({ type: 'error', text: 'This operation is sensitive and requires recent authentication. Please log in again.' });
      } else {
        setMessage({ type: 'error', text: error.message || 'Failed to update password.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File size must be less than 5MB.' });
      return;
    }

    setUploadingPhoto(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      const photoURL = data.url;

      // Update user document
      await updateDoc(doc(db, 'users', user.uid), { photoURL });

      // Update public profile if expert
      if (profile?.role === 'expert') {
        try {
          await updateDoc(doc(db, 'public_profiles', user.uid), { photoURL });
        } catch (e) {
          // Public profile might not exist
        }
      }

      setMessage({ type: 'success', text: 'Profile photo updated!' });
    } catch (error: any) {
      console.error('Photo upload error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to upload photo.' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (!user || !profile) {
    return (
      <div className="pt-32 pb-20 flex justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
      </div>
    );
  }

  const completionSteps = [
    { label: "Account Created", completed: true },
    { label: "Email Verified", completed: user.emailVerified },
    { label: "Profile Details", completed: !!profile.displayName },
    { label: "Expert Network", completed: profile.role === 'expert' },
    { label: "Professional Bio", completed: !!profile.bio && profile.bio.length > 50 },
  ];

  const completionPercentage = Math.round((completionSteps.filter(s => s.completed).length / completionSteps.length) * 100);

  return (
    <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-stone-50 p-8 rounded-[2.5rem] border border-black/5 text-center">
            <div className="relative inline-block mb-6">
              <div className="relative">
                <img
                  src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}`}
                  alt={profile.displayName}
                  className={`w-32 h-32 rounded-[2rem] object-cover border-4 border-white shadow-xl transition-opacity ${uploadingPhoto ? 'opacity-50' : 'opacity-100'}`}
                  referrerPolicy="no-referrer"
                />
                {uploadingPhoto && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="animate-spin text-emerald-600" size={24} />
                  </div>
                )}
                <label className="absolute -bottom-2 -right-2 bg-white text-black p-2 rounded-xl shadow-lg border border-black/5 cursor-pointer hover:bg-stone-50 transition-colors">
                  <Camera size={18} />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                  />
                </label>
              </div>
              {profile.role === 'expert' && (
                <div className="absolute -top-2 -right-2 bg-emerald-600 text-white p-2 rounded-xl shadow-lg">
                  <Award size={20} />
                </div>
              )}
            </div>
            <h2 className="text-2xl font-bold mb-1">{profile.displayName}</h2>
            <p className="text-black/40 text-sm mb-6">{profile.email}</p>
            
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${profile.role === 'admin' ? 'bg-purple-100 text-purple-700' : profile.role === 'expert' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-black/40'}`}>
                {profile.role}
              </span>
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${profile.isApproved ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {profile.isApproved ? 'Approved' : 'Pending Approval'}
              </span>
            </div>

            <button
              onClick={logout}
              className="w-full py-4 bg-white text-black border border-black/10 font-bold rounded-2xl hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all flex items-center justify-center space-x-2"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Completion Checklist */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-black/5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg">Profile Completion</h3>
              <span className="text-emerald-600 font-bold text-sm">{completionPercentage}%</span>
            </div>
            <div className="w-full h-2 bg-stone-100 rounded-full mb-8 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionPercentage}%` }}
                className="h-full bg-emerald-600"
              />
            </div>
            <ul className="space-y-4">
              {completionSteps.map((step, idx) => (
                <li key={idx} className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${step.completed ? 'text-black/60' : 'text-black/30'}`}>
                    {step.label}
                  </span>
                  {step.completed ? (
                    <CheckCircle2 size={18} className="text-emerald-600" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-stone-200" />
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-stone-50 p-10 rounded-[3rem] border border-black/5">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-3xl font-bold tracking-tight">Profile Details</h3>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`p-3 rounded-2xl border border-black/5 transition-all ${isEditing ? 'bg-emerald-600 text-white' : 'bg-white text-black/40 hover:bg-stone-100'}`}
              >
                <Settings size={20} />
              </button>
            </div>

            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`mb-8 p-4 rounded-2xl text-sm font-bold flex items-center space-x-2 ${
                    message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {message.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                  <span>{message.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2 block ml-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={18} />
                      <input
                        type="text"
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-2xl focus:ring-2 focus:ring-emerald-600 outline-none font-medium transition-all"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2 block ml-1">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={18} />
                      <input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-2xl focus:ring-2 focus:ring-emerald-600 outline-none font-medium transition-all"
                        placeholder="+254 700 000 000"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 pb-6 border-b border-black/5">
                  <label className="flex items-center cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={formData.showContacts}
                        onChange={(e) => setFormData({ ...formData, showContacts: e.target.checked })}
                      />
                      <div className={`w-14 h-8 rounded-full transition-colors ${formData.showContacts ? 'bg-emerald-600' : 'bg-stone-200'}`}></div>
                      <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${formData.showContacts ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </div>
                    <div className="ml-4">
                      <p className="font-bold text-sm flex items-center space-x-2">
                        {formData.showContacts ? <Eye size={16} /> : <EyeOff size={16} />}
                        <span>Show Contact Details</span>
                      </p>
                      <p className="text-xs text-black/40">Allow other users to see your phone number on your profile.</p>
                    </div>
                  </label>
                </div>

                {profile.role === 'expert' && (
                  <div className="space-y-8 pt-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2 block ml-1">Professional Bio</label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        className="w-full p-4 bg-white border border-black/5 rounded-2xl focus:ring-2 focus:ring-emerald-600 outline-none font-medium transition-all h-32 resize-none text-sm"
                        placeholder="Describe your professional journey..."
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 ml-1">Academic Credentials</label>
                        <button 
                          type="button" 
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            academicCredentials: [
                              ...prev.academicCredentials,
                              { id: Math.random().toString(36).substr(2, 9), type: '', institution: '', specialization: '' }
                            ]
                          }))}
                          className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center space-x-1 hover:underline"
                        >
                          <span>+ Add Institution</span>
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {formData.academicCredentials.length === 0 ? (
                          <div className="p-8 text-center bg-white rounded-[2rem] border border-dashed border-black/10">
                            <GraduationCap size={24} className="mx-auto text-black/10 mb-2" />
                            <p className="text-xs text-black/30 font-medium">No institutions added. Add your university history here.</p>
                          </div>
                        ) : (
                          formData.academicCredentials.map((cred) => (
                            <div key={cred.id} className="p-6 bg-white rounded-[2rem] border border-black/5 space-y-4 relative group">
                              <button 
                                type="button"
                                onClick={() => setFormData(prev => ({
                                  ...prev,
                                  academicCredentials: prev.academicCredentials.filter(c => c.id !== cred.id)
                                }))}
                                className="absolute top-6 right-6 text-black/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <XCircle size={18} />
                              </button>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-black/40 uppercase">Qualification</label>
                                  <input
                                    type="text"
                                    value={cred.type}
                                    onChange={(e) => setFormData(prev => ({
                                      ...prev,
                                      academicCredentials: prev.academicCredentials.map(c => c.id === cred.id ? { ...c, type: e.target.value } : c)
                                    }))}
                                    placeholder="e.g. Master's Degree"
                                    className="w-full p-3 bg-stone-50 border border-black/5 rounded-xl text-xs font-bold outline-none focus:border-emerald-600"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-black/40 uppercase">Specialisation</label>
                                  <input
                                    type="text"
                                    value={cred.specialization}
                                    onChange={(e) => setFormData(prev => ({
                                      ...prev,
                                      academicCredentials: prev.academicCredentials.map(c => c.id === cred.id ? { ...c, specialization: e.target.value } : c)
                                    }))}
                                    placeholder="e.g. Civil Engineering"
                                    className="w-full p-3 bg-stone-50 border border-black/5 rounded-xl text-xs font-bold outline-none focus:border-emerald-600"
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-black/40 uppercase">University / Institution</label>
                                <input
                                  type="text"
                                  value={cred.institution}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    academicCredentials: prev.academicCredentials.map(c => c.id === cred.id ? { ...c, institution: e.target.value } : c)
                                  }))}
                                  placeholder="e.g. University of Nairobi"
                                  className="w-full p-3 bg-stone-50 border border-black/5 rounded-xl text-xs font-bold outline-none focus:border-emerald-600"
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-4 bg-black text-white rounded-2xl font-bold hover:bg-black/80 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /><span>Save Changes</span></>}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-8 py-4 bg-white text-black border border-black/5 rounded-2xl font-bold hover:bg-stone-100 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2 block">Full Name</label>
                    <p className="font-bold text-lg">{profile.displayName}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2 block">Email Address</label>
                    <p className="font-bold text-lg">{profile.email}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2 block">Phone Number</label>
                    <div className="flex items-center space-x-2 font-bold text-lg">
                      <Phone size={18} className="text-black/20" />
                      <span>{profile.phoneNumber || 'Not provided'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2 block">Member Since</label>
                    <div className="flex items-center space-x-2 font-bold text-lg">
                      <Clock size={18} className="text-black/20" />
                      <span>{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {profile.role === 'expert' && (
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2 block">Specialization</label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 font-bold text-lg text-emerald-600">
                          <Sparkles size={18} />
                          <span>{profile.expertise}</span>
                        </div>
                        {profile.specialisations && profile.specialisations.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {profile.specialisations.map((s: string) => (
                              <span key={s} className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-emerald-100">{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2 block">Academics</label>
                      <div className="space-y-2">
                        {Array.isArray(profile.academics) ? (
                          <div className="flex flex-wrap gap-1">
                            {profile.academics.map((a: string) => (
                              <div key={a} className="flex items-center space-x-2 font-bold text-sm bg-stone-100 px-3 py-1 rounded-lg">
                                <GraduationCap size={14} className="text-black/20" />
                                <span>{a}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 font-bold text-lg">
                            <GraduationCap size={18} className="text-black/20" />
                            <span>{profile.academics}</span>
                          </div>
                        )}

                        {profile.academicCredentials && profile.academicCredentials.length > 0 && (
                          <div className="space-y-2 pt-2">
                            {profile.academicCredentials.map((cred: any, idx: number) => (
                              <div key={idx} className="bg-white p-3 rounded-xl border border-black/5 flex items-start space-x-3">
                                <Award size={16} className="text-emerald-600 mt-1 shrink-0" />
                                <div>
                                  <p className="text-sm font-bold">{cred.type}{cred.specialization ? ` in ${cred.specialization}` : ''}</p>
                                  {cred.institution && <p className="text-xs text-black/40">{cred.institution}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {profile.role === 'expert' && !isEditing && (
              <div className="mt-10 pt-10 border-t border-black/5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-4 block">Professional Bio</label>
                <p className="text-black/60 leading-relaxed italic">
                  "{profile.bio}"
                </p>
              </div>
            )}
          </div>

          {/* Change Password Section */}
          <div className="bg-stone-50 p-10 rounded-[3rem] border border-black/5">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold">Security</h3>
              <button 
                onClick={() => setIsChangingPassword(!isChangingPassword)}
                className={`px-6 py-2 rounded-xl border border-black/5 font-bold text-sm transition-all ${isChangingPassword ? 'bg-red-50 text-red-600 border-red-100' : 'bg-white text-black hover:bg-stone-100'}`}
              >
                {isChangingPassword ? 'Cancel' : 'Change Password'}
              </button>
            </div>

            {isChangingPassword ? (
              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div className="max-w-md">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2 block ml-1">New Password</label>
                  <div className="relative mb-4">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={18} />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-2xl focus:ring-2 focus:ring-emerald-600 outline-none font-medium transition-all"
                      placeholder="Enter new password"
                      required
                    />
                  </div>

                  {newPassword.length > 0 && (
                    <div className="px-1 space-y-1.5 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Strength: {strengthLabels[strength]}</span>
                      </div>
                      <div className="flex gap-1 h-1">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <div 
                            key={i} 
                            className={`flex-1 rounded-full transition-all duration-500 ${i <= strength ? strengthColors[strength] : 'bg-stone-200'}`}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] text-black/30">Use 8+ characters with numbers, symbols & uppercase</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || strength < 3}
                    className="w-full py-4 bg-black text-white rounded-2xl font-bold hover:bg-black/80 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <span>Update Password</span>}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center space-x-4 text-black/40">
                <Shield size={24} />
                <p className="text-sm">Keep your account secure by using a strong, unique password.</p>
              </div>
            )}
          </div>

          {/* Order History */}
          <div className="bg-white p-10 rounded-[3rem] border border-black/5">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold">Order History</h3>
              <Link to="/marketplace" className="text-emerald-600 text-sm font-bold flex items-center space-x-1 hover:underline">
                <span>Shop More</span>
                <ExternalLink size={14} />
              </Link>
            </div>

            {ordersLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-emerald-600" size={32} />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 bg-stone-50 rounded-3xl border border-dashed border-black/10">
                <Package className="mx-auto text-black/20 mb-4" size={48} />
                <p className="text-black/40 font-medium">No orders found yet.</p>
                <Link to="/marketplace" className="mt-4 inline-block text-emerald-600 font-bold hover:underline">
                  Start Shopping
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => (
                  <div key={order.id} className="group bg-stone-50 p-6 rounded-3xl border border-black/5 hover:border-emerald-600/20 transition-all">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-1">Order ID</p>
                        <p className="font-mono text-xs font-bold">{order.id}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-1">Date</p>
                        <p className="text-sm font-bold">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          order.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                          order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          order.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-stone-200 text-black/40'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-black/5">
                      <div className="flex -space-x-3 overflow-hidden">
                        {order.items.slice(0, 3).map((item, idx) => (
                          <img
                            key={idx}
                            src={item.image}
                            alt={item.name}
                            className="w-10 h-10 rounded-xl border-2 border-white object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ))}
                        {order.items.length > 3 && (
                          <div className="w-10 h-10 rounded-xl border-2 border-white bg-stone-200 flex items-center justify-center text-[10px] font-bold">
                            +{order.items.length - 3}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">Total Amount</p>
                        <p className="text-lg font-bold text-emerald-600">KES {order.totalAmount.toLocaleString()}</p>
                        <Link 
                          to={`/track/${order.id}`}
                          className="mt-2 text-[10px] font-bold uppercase tracking-widest bg-black text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition-all flex items-center space-x-1"
                        >
                          <span>Track Order</span>
                          <ArrowRight size={10} />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Placeholder */}
          <div className="bg-white p-10 rounded-[3rem] border border-black/5">
            <h3 className="text-xl font-bold mb-8">Recent Activity</h3>
            <div className="space-y-6">
              {[1, 2].map((_, idx) => (
                <div key={idx} className="flex items-center justify-between py-4 border-b border-black/5 last:border-0">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center">
                      <Briefcase size={20} className="text-black/20" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Joined the Expert Network</p>
                      <p className="text-xs text-black/40">Your profile is now visible to the community.</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-black/30 uppercase tracking-widest">2 days ago</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

