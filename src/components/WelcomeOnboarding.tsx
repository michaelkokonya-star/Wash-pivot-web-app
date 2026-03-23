import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight, Droplets, Zap, Users, Globe, CheckCircle2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const WelcomeOnboarding: React.FC = () => {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to WASH Pivot",
      description: "You're now part of a global ecosystem dedicated to sustainable water, sanitation, and hygiene solutions.",
      icon: Globe,
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    },
    {
      title: "The Marketplace",
      description: "Discover and acquire certified sustainable technologies, from solar-powered pumps to advanced water purification systems.",
      icon: Zap,
      color: "text-amber-600",
      bg: "bg-amber-50"
    },
    {
      title: "Micro-Funding",
      description: "Support or launch sustainable projects. Every contribution helps bring clean water and energy to communities in need.",
      icon: Droplets,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      title: "Expert Network",
      description: "Connect with certified professionals or join the network yourself to offer your expertise to high-impact projects.",
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50"
    }
  ];

  const handleComplete = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        hasSeenWelcome: true
      });
      setIsOpen(false);
    } catch (error) {
      console.error("Error updating welcome status:", error);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  if (!user || !profile || profile.hasSeenWelcome || !isOpen) return null;

  const StepIcon = steps[currentStep].icon;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl relative"
      >
        <div className="p-12 text-center">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-24 h-24 ${steps[currentStep].bg} ${steps[currentStep].color} rounded-[2rem] flex items-center justify-center mx-auto mb-8`}
          >
            <StepIcon size={48} />
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <h2 className="text-3xl font-bold tracking-tight">{steps[currentStep].title}</h2>
              <p className="text-black/50 leading-relaxed">
                {steps[currentStep].description}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center space-x-2 mt-10 mb-12">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-8 bg-emerald-600' : 'w-2 bg-stone-200'}`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="w-full py-5 bg-black text-white rounded-2xl font-bold text-lg hover:bg-black/80 transition-all flex items-center justify-center space-x-3 group shadow-xl shadow-black/10"
          >
            <span>{currentStep === steps.length - 1 ? "Get Started" : "Next"}</span>
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default WelcomeOnboarding;
