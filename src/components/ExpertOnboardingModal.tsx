import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Award, GraduationCap, Briefcase, ArrowRight, ArrowLeft, Sparkles, ShieldCheck } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

interface ExpertOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to the Network',
    description: 'Join a global community of WASH professionals dedicated to sustainable impact.',
    icon: Sparkles
  },
  {
    id: 'specialization',
    title: 'Your Expertise',
    description: 'Tell us about your core skills and academic background.',
    icon: GraduationCap
  },
  {
    id: 'bio',
    title: 'Professional Bio',
    description: 'Share your journey and professional achievements with the community.',
    icon: Briefcase
  },
  {
    id: 'review',
    title: 'Review & Launch',
    description: 'Double-check your details before going live in the network.',
    icon: ShieldCheck
  }
];

const ExpertOnboardingModal: React.FC<ExpertOnboardingModalProps> = ({ isOpen, onClose, onComplete }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    expertise: '',
    academics: '',
    bio: '',
    role: 'expert'
  });

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
    if (!user) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        ...formData,
        role: 'expert',
        onboardingCompleted: true,
        expertJoinedAt: new Date().toISOString()
      });
      onComplete();
      onClose();
    } catch (error) {
      console.error("Error completing onboarding:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const StepIcon = steps[currentStep].icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl relative"
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
              className="min-h-[300px]"
            >
              {currentStep === 0 && (
                <div className="space-y-6">
                  <p className="text-black/60 leading-relaxed text-lg">
                    Welcome to the WASH Pivot Expert Network. By joining, you become part of a curated ecosystem of professionals driving sustainable water, sanitation, and hygiene solutions globally.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                    <div className="p-4 bg-stone-50 rounded-2xl border border-black/5">
                      <CheckCircle2 size={20} className="text-emerald-600 mb-2" />
                      <h4 className="font-bold text-sm mb-1">Global Visibility</h4>
                      <p className="text-xs text-black/40">Connect with project leads worldwide.</p>
                    </div>
                    <div className="p-4 bg-stone-50 rounded-2xl border border-black/5">
                      <Award size={20} className="text-emerald-600 mb-2" />
                      <h4 className="font-bold text-sm mb-1">Impact Driven</h4>
                      <p className="text-xs text-black/40">Contribute to UN SDG 6 & 7 goals.</p>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Primary Specialization</label>
                    <select
                      value={formData.expertise}
                      onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                      className="w-full p-4 bg-stone-50 border border-black/10 rounded-2xl focus:outline-none focus:border-emerald-600 transition-colors font-medium"
                    >
                      <option value="">Select Specialization</option>
                      <option value="Solar Energy Systems">Solar Energy Systems</option>
                      <option value="Water Purification">Water Purification</option>
                      <option value="Sanitation Engineering">Sanitation Engineering</option>
                      <option value="Sustainable Agriculture">Sustainable Agriculture</option>
                      <option value="WASH Policy & Advocacy">WASH Policy & Advocacy</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Academic Background</label>
                    <input
                      type="text"
                      value={formData.academics}
                      onChange={(e) => setFormData({ ...formData, academics: e.target.value })}
                      placeholder="e.g. MSc. Environmental Engineering, Stanford"
                      className="w-full p-4 bg-stone-50 border border-black/10 rounded-2xl focus:outline-none focus:border-emerald-600 transition-colors font-medium"
                    />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Professional Bio</label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Describe your professional journey, key projects, and what drives your passion for sustainability..."
                      className="w-full p-4 bg-stone-50 border border-black/10 rounded-2xl h-48 focus:outline-none focus:border-emerald-600 transition-colors font-medium resize-none"
                    />
                    <p className="text-[10px] text-black/30 text-right">Recommended: 150-300 words</p>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                    <h4 className="font-bold text-emerald-900 mb-4 flex items-center space-x-2">
                      <CheckCircle2 size={18} />
                      <span>Ready to Launch</span>
                    </h4>
                    <ul className="space-y-3">
                      <li className="flex items-center space-x-3 text-sm text-emerald-800/70">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${formData.expertise ? 'bg-emerald-200 text-emerald-700' : 'bg-stone-200 text-stone-400'}`}>
                          <CheckCircle2 size={14} />
                        </div>
                        <span>Specialization Selected</span>
                      </li>
                      <li className="flex items-center space-x-3 text-sm text-emerald-800/70">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${formData.academics ? 'bg-emerald-200 text-emerald-700' : 'bg-stone-200 text-stone-400'}`}>
                          <CheckCircle2 size={14} />
                        </div>
                        <span>Academic Background Provided</span>
                      </li>
                      <li className="flex items-center space-x-3 text-sm text-emerald-800/70">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${formData.bio.length > 50 ? 'bg-emerald-200 text-emerald-700' : 'bg-stone-200 text-stone-400'}`}>
                          <CheckCircle2 size={14} />
                        </div>
                        <span>Professional Bio Completed</span>
                      </li>
                    </ul>
                  </div>
                  <p className="text-sm text-black/40 leading-relaxed italic">
                    By clicking "Complete Onboarding", your profile will be visible to the entire WASH Pivot community. You can update these details anytime from your settings.
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
                disabled={loading || !formData.expertise || !formData.academics || formData.bio.length < 50}
                className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 disabled:opacity-50 flex items-center space-x-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Complete Onboarding</span>
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
      </motion.div>
    </div>
  );
};

export default ExpertOnboardingModal;
