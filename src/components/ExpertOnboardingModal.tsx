import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Award, GraduationCap, Briefcase, ArrowRight, ArrowLeft, Sparkles, ShieldCheck, Mail, MapPin, Clock, ListChecks, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ExpertOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const steps = [
  {
    id: 'welcome',
    title: 'Welcome',
    description: 'Join the global WASH professional network.',
    icon: Sparkles
  },
  {
    id: 'expertise',
    title: 'Expertise',
    description: 'Your specialization and academic background.',
    icon: GraduationCap
  },
  {
    id: 'experience',
    title: 'Experience',
    description: 'Your professional track record and availability.',
    icon: Clock
  },
  {
    id: 'bio',
    title: 'Profile',
    description: 'Your professional bio and contact details.',
    icon: Briefcase
  },
  {
    id: 'preview',
    title: 'Preview',
    description: 'Review your public profile before launching.',
    icon: Eye
  }
];

const ExpertOnboardingModal: React.FC<ExpertOnboardingModalProps> = ({ isOpen, onClose, onComplete }) => {
  const { user, profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    expertise: '',
    customExpertise: '',
    specialisations: [] as string[],
    academics: [] as string[],
    yearsOfExperience: '',
    keyProjects: '',
    availability: [] as string[],
    bio: '',
    phone: '',
    contactEmail: profile?.email || '',
    role: 'expert'
  });

  const academicOptions = [
    'Certificate', 'Diploma', 'Higher Diploma', "Bachelor's Degree", 
    'Post-Graduate Diploma', "Master's Degree", 'Doctorate (PhD)', 'Professional Certification'
  ];

  const specialisationOptions = [
    'Solar Energy Systems', 'Water Purification', 'Sanitation Engineering', 
    'Sustainable Agriculture', 'WASH Policy & Advocacy', 'Groundwater Hydrology', 
    'Community Engagement', 'Water treatment', 'Monitoring and evaluation', 
    'Project implementation', 'Partnership and government engagement'
  ];

  const availabilityOptions = [
    'East Africa', 'West Africa', 'Southern Africa', 'North Africa', 
    'Middle East', 'South Asia', 'Southeast Asia', 'Latin America', 'Global (Remote)'
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user || !profile) return;
    setLoading(true);
    try {
      const expertJoinedAt = new Date().toISOString();
      
      const expertData = {
        ...formData,
        expertise: formData.expertise === 'Other' ? formData.customExpertise : formData.expertise,
        role: 'expert',
        onboardingCompleted: true,
        expertJoinedAt,
        isApproved: false,
        updatedAt: new Date().toISOString()
      };

      // Update private user document via API
      await fetch(`/api/data/users/${user.uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expertData)
      });

      // Create public profile via API
      await fetch('/api/data/public_profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.uid,
          uid: user.uid,
          displayName: profile.displayName,
          photoURL: profile.photoURL || null,
          ...expertData
        })
      });

      onComplete();
      onClose();
    } catch (error) {
      console.error("Error completing onboarding:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAcademic = (option: string) => {
    setFormData(prev => ({
      ...prev,
      academics: prev.academics.includes(option)
        ? prev.academics.filter(a => a !== option)
        : [...prev.academics, option]
    }));
  };

  const toggleSpecialisation = (option: string) => {
    setFormData(prev => ({
      ...prev,
      specialisations: prev.specialisations.includes(option)
        ? prev.specialisations.filter(s => s !== option)
        : [...prev.specialisations, option]
    }));
  };

  const toggleAvailability = (option: string) => {
    setFormData(prev => ({
      ...prev,
      availability: prev.availability.includes(option)
        ? prev.availability.filter(a => a !== option)
        : [...prev.availability, option]
    }));
  };

  if (!isOpen) return null;

  const StepIcon = steps[currentStep].icon;

  const ProfilePreview = () => (
    <div className="bg-stone-50 rounded-3xl p-6 border border-black/5 h-full overflow-y-auto max-h-[500px]">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-2xl font-bold">
          {profile?.displayName?.charAt(0) || 'E'}
        </div>
        <div>
          <h4 className="font-bold text-lg">{profile?.displayName || 'Expert Name'}</h4>
          <p className="text-emerald-600 text-xs font-bold uppercase tracking-widest">
            {formData.expertise === 'Other' ? formData.customExpertise : formData.expertise || 'Specialization'}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {formData.specialisations.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {formData.specialisations.map(s => (
              <span key={s} className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-emerald-100">{s}</span>
            ))}
          </div>
        )}

        {formData.academics.length > 0 && (
          <div className="flex items-start space-x-2 text-sm text-black/60">
            <GraduationCap size={14} className="mt-1 shrink-0" />
            <div className="flex flex-wrap gap-1">
              {formData.academics.map(a => (
                <span key={a} className="bg-stone-200 px-2 py-0.5 rounded text-[10px]">{a}</span>
              ))}
            </div>
          </div>
        )}

        {formData.yearsOfExperience && (
          <div className="flex items-center space-x-2 text-sm text-black/60">
            <Clock size={14} />
            <span>{formData.yearsOfExperience} Years Experience</span>
          </div>
        )}
        
        {formData.availability.length > 0 && (
          <div className="flex items-start space-x-2 text-sm text-black/60">
            <MapPin size={14} className="mt-1 shrink-0" />
            <div className="flex flex-wrap gap-1">
              {formData.availability.map(a => (
                <span key={a} className="bg-stone-200 px-2 py-0.5 rounded text-[10px]">{a}</span>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-black/5">
          <h5 className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2">About</h5>
          <p className="text-xs text-black/60 leading-relaxed line-clamp-4">
            {formData.bio || 'Your professional bio will appear here...'}
          </p>
        </div>

        {formData.keyProjects && (
          <div className="pt-4 border-t border-black/5">
            <h5 className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2">Key Projects</h5>
            <p className="text-xs text-black/60 leading-relaxed italic">
              {formData.keyProjects}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-5xl rounded-[2.5rem] overflow-hidden shadow-2xl relative"
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-stone-100">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            className="h-full bg-emerald-600"
          />
        </div>

        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-stone-100 rounded-full transition-colors z-10"
        >
          <X size={20} className="text-black/40" />
        </button>

        <div className="p-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                  <StepIcon size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">
                    Step {currentStep + 1} of {steps.length}
                  </p>
                  <h2 className="text-2xl font-bold tracking-tight">{steps[currentStep].title}</h2>
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="min-h-[350px]"
                >
                  {currentStep === 0 && (
                    <div className="space-y-6">
                      <p className="text-black/60 leading-relaxed text-lg">
                        Welcome to the WASH Pivot Expert Network. Join a curated ecosystem of professionals driving sustainable water, sanitation, and hygiene solutions globally.
                      </p>
                      <div className="grid grid-cols-1 gap-4 mt-8">
                        <div className="p-4 bg-stone-50 rounded-2xl border border-black/5 flex items-start space-x-4">
                          <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-1" />
                          <div>
                            <h4 className="font-bold text-sm mb-1 uppercase tracking-tight">Global Visibility</h4>
                            <p className="text-xs text-black/40">Connect with project leads and NGOs worldwide.</p>
                          </div>
                        </div>
                        <div className="p-4 bg-stone-50 rounded-2xl border border-black/5 flex items-start space-x-4">
                          <Award size={20} className="text-emerald-600 shrink-0 mt-1" />
                          <div>
                            <h4 className="font-bold text-sm mb-1 uppercase tracking-tight">Impact Driven</h4>
                            <p className="text-xs text-black/40">Contribute directly to UN SDG 6 & 7 goals.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 1 && (
                    <div className="space-y-6 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Primary Specialization</label>
                        <select
                          value={formData.expertise}
                          onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                          className="w-full p-4 bg-stone-50 border border-black/10 rounded-2xl focus:outline-none focus:border-emerald-600 transition-colors font-medium"
                        >
                          <option value="">Select Specialization</option>
                          {specialisationOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                          <option value="Other">Other (Custom)</option>
                        </select>
                      </div>

                      {formData.expertise === 'Other' && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-2"
                        >
                          <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Custom Specialization</label>
                          <input
                            type="text"
                            value={formData.customExpertise}
                            onChange={(e) => setFormData({ ...formData, customExpertise: e.target.value })}
                            placeholder="Enter your specialization"
                            className="w-full p-4 bg-stone-50 border border-black/10 rounded-2xl focus:outline-none focus:border-emerald-600 transition-colors font-medium"
                          />
                        </motion.div>
                      )}

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Additional Specialisations (Multiple)</label>
                        <div className="grid grid-cols-2 gap-2">
                          {specialisationOptions.map(option => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => toggleSpecialisation(option)}
                              className={`p-3 rounded-xl text-[10px] font-bold transition-all border text-left ${
                                formData.specialisations.includes(option)
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-stone-50 text-black/60 border-black/5 hover:border-black/20'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Academic Qualifications (Multiple)</label>
                        <div className="grid grid-cols-2 gap-2">
                          {academicOptions.map(option => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => toggleAcademic(option)}
                              className={`p-3 rounded-xl text-[10px] font-bold transition-all border text-left ${
                                formData.academics.includes(option)
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-stone-50 text-black/60 border-black/5 hover:border-black/20'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Years of Experience</label>
                        <input
                          type="number"
                          value={formData.yearsOfExperience}
                          onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })}
                          placeholder="e.g. 8"
                          className="w-full p-4 bg-stone-50 border border-black/10 rounded-2xl focus:outline-none focus:border-emerald-600 transition-colors font-medium"
                        />
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Geographical Availability</label>
                        <div className="grid grid-cols-2 gap-2">
                          {availabilityOptions.map(option => (
                            <button
                              key={option}
                              onClick={() => toggleAvailability(option)}
                              className={`p-3 rounded-xl text-xs font-bold transition-all border ${
                                formData.availability.includes(option)
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-stone-50 text-black/60 border-black/5 hover:border-black/20'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Key Projects (Brief)</label>
                        <input
                          type="text"
                          value={formData.keyProjects}
                          onChange={(e) => setFormData({ ...formData, keyProjects: e.target.value })}
                          placeholder="e.g. Solar Borehole in Turkana, Water Kiosk in Kibera"
                          className="w-full p-4 bg-stone-50 border border-black/10 rounded-2xl focus:outline-none focus:border-emerald-600 transition-colors font-medium"
                        />
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Professional Email</label>
                          <input
                            type="email"
                            value={formData.contactEmail}
                            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                            className="w-full p-4 bg-stone-50 border border-black/10 rounded-2xl text-sm focus:outline-none focus:border-emerald-600"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Phone</label>
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+254..."
                            className="w-full p-4 bg-stone-50 border border-black/10 rounded-2xl text-sm focus:outline-none focus:border-emerald-600"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Professional Bio</label>
                        <textarea
                          value={formData.bio}
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                          placeholder="Describe your professional journey..."
                          className="w-full p-4 bg-stone-50 border border-black/10 rounded-2xl h-32 focus:outline-none focus:border-emerald-600 font-medium resize-none text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {currentStep === 4 && (
                    <div className="space-y-6">
                      <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                        <h4 className="font-bold text-emerald-900 mb-4 flex items-center space-x-2">
                          <CheckCircle2 size={18} />
                          <span>Ready to Launch</span>
                        </h4>
                        <ul className="space-y-3">
                          <li className="flex items-center space-x-3 text-sm text-emerald-800/70">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${formData.expertise && formData.yearsOfExperience ? 'bg-emerald-200 text-emerald-700' : 'bg-stone-200 text-stone-400'}`}>
                              <CheckCircle2 size={14} />
                            </div>
                            <span>Expertise & Experience</span>
                          </li>
                          <li className="flex items-center space-x-3 text-sm text-emerald-800/70">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${formData.availability.length > 0 ? 'bg-emerald-200 text-emerald-700' : 'bg-stone-200 text-stone-400'}`}>
                              <CheckCircle2 size={14} />
                            </div>
                            <span>Availability Set</span>
                          </li>
                          <li className="flex items-center space-x-3 text-sm text-emerald-800/70">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${formData.bio.length > 20 ? 'bg-emerald-200 text-emerald-700' : 'bg-stone-200 text-stone-400'}`}>
                              <CheckCircle2 size={14} />
                            </div>
                            <span>Profile Details Completed</span>
                          </li>
                        </ul>
                      </div>
                      <p className="text-xs text-black/40 leading-relaxed italic">
                        By completing onboarding, your profile will enter the verification queue. Once approved, you'll be visible to the global WASH Pivot community.
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="flex items-center justify-between mt-12 pt-8 border-t border-black/5">
                <button
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  className={`flex items-center space-x-2 font-bold text-sm transition-all ${currentStep === 0 ? 'opacity-0 pointer-events-none' : 'text-black/40 hover:text-black'}`}
                >
                  <ArrowLeft size={18} />
                  <span>Back</span>
                </button>

                {currentStep === steps.length - 1 ? (
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !formData.expertise || !formData.yearsOfExperience || formData.availability.length === 0 || formData.bio.length < 20 || (formData.expertise === 'Other' && !formData.customExpertise)}
                    className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 disabled:opacity-50 flex items-center space-x-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Launch Profile</span>
                        <Sparkles size={18} />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="px-8 py-4 bg-black text-white font-bold rounded-2xl hover:bg-black/80 transition-all flex items-center space-x-2 group"
                  >
                    <span>Continue</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            </div>

            {/* Real-time Preview */}
            <div className="hidden lg:block">
              <div className="sticky top-0">
                <div className="flex items-center space-x-2 mb-4 text-black/40">
                  <Eye size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Live Network Preview</span>
                </div>
                <ProfilePreview />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ExpertOnboardingModal;
