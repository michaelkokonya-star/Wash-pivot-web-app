import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Target, Users } from 'lucide-react';

const About = () => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
    >
      <div className="text-center mb-20">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tighter mb-6">ABOUT WASH PIVOT</h1>
        <p className="text-lg sm:text-xl text-black/60 max-w-2xl mx-auto leading-relaxed px-4">
          We are a social enterprise dedicated to providing sustainable solutions in solar energy, water treatment, and sanitation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12 mb-24">
        <div className="p-8 sm:p-10 bg-stone-50 rounded-[2rem] sm:rounded-3xl border border-black/5">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
            <Target size={24} />
          </div>
          <h3 className="text-xl font-bold mb-4 uppercase tracking-tight">Our Mission</h3>
          <p className="text-black/60 leading-relaxed text-sm sm:text-base">
            To empower communities through accessible technology and expertise, ensuring clean water and sustainable energy for all.
          </p>
        </div>
        <div className="p-8 sm:p-10 bg-stone-50 rounded-[2rem] sm:rounded-3xl border border-black/5">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
            <ShieldCheck size={24} />
          </div>
          <h3 className="text-xl font-bold mb-4 uppercase tracking-tight">Our Vision</h3>
          <p className="text-black/60 leading-relaxed text-sm sm:text-base">
            A world where every household has access to basic necessities through environmentally friendly and economically viable solutions.
          </p>
        </div>
        <div className="p-8 sm:p-10 bg-stone-50 rounded-[2rem] sm:rounded-3xl border border-black/5">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
            <Users size={24} />
          </div>
          <h3 className="text-xl font-bold mb-4 uppercase tracking-tight">Our Values</h3>
          <p className="text-black/60 leading-relaxed text-sm sm:text-base">
            Sustainability, transparency, and community-driven innovation are at the heart of everything we do.
          </p>
        </div>
      </div>

      <div className="bg-black text-white p-8 sm:p-16 rounded-[2.5rem] sm:rounded-[40px] overflow-hidden relative">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter mb-6">OUR STORY</h2>
          <p className="text-white/60 text-base sm:text-lg leading-relaxed">
            WASH Pivot was founded in 2025 as an initiative to provide sustainable solutions in solar energy, water treatment, and sanitation.
          </p>
        </div>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-emerald-500/10 blur-[80px] sm:blur-[120px] rounded-full -translate-y-1/2 translate-x-1/4"></div>
      </div>
    </motion.div>
  );
};

export default About;
