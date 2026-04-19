import React, { Suspense, lazy } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Zap, Image as ImageIcon, Video, Shield, Loader2 } from 'lucide-react';

const AICreativeStudio = lazy(() => import('../components/AICreativeStudio'));

const StudioLoader = () => (
  <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-12">
    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
    <p className="text-black/40 font-medium">Initializing AI Studio Environment...</p>
  </div>
);

const CreativeStudio = () => {
  return (
    <div className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-12">
        <div className="flex items-center space-x-3 mb-4">
          <div className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
            AI Powered
          </div>
          <div className="px-3 py-1 bg-black text-white rounded-full text-[10px] font-bold uppercase tracking-widest">
            Beta
          </div>
        </div>
        <h1 className="text-5xl font-bold tracking-tighter mb-4">AI CREATIVE STUDIO</h1>
        <p className="text-black/50 text-lg max-w-2xl">
          Harness the power of Gemini 3 and Veo to generate studio-quality visual assets for your sustainable projects. 
          From photorealistic renders to cinematic animations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Sidebar Info */}
        <div className="lg:col-span-1 space-y-8">
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-stone-100 rounded-lg flex items-center justify-center shrink-0">
                <Zap size={16} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm mb-1">Ultra Fast</h3>
                <p className="text-xs text-black/40 leading-relaxed">Powered by Flash models for near-instant generation of high-quality concepts.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-stone-100 rounded-lg flex items-center justify-center shrink-0">
                <Shield size={16} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm mb-1">Secure & Private</h3>
                <p className="text-xs text-black/40 leading-relaxed">Your creative assets are private and generated using enterprise-grade AI safety protocols.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-stone-100 rounded-lg flex items-center justify-center shrink-0">
                <ImageIcon size={16} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm mb-1">Up to 4K</h3>
                <p className="text-xs text-black/40 leading-relaxed">Export your visualizations in high resolution suitable for presentations and reports.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-stone-100 rounded-lg flex items-center justify-center shrink-0">
                <Video size={16} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm mb-1">Cinematic Motion</h3>
                <p className="text-xs text-black/40 leading-relaxed">Bring your project visions to life with Veo's advanced video synthesis technology.</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
            <h4 className="font-bold text-emerald-800 text-sm mb-2 flex items-center space-x-2">
              <Sparkles size={14} />
              <span>Usage Guidelines</span>
            </h4>
            <p className="text-[11px] text-emerald-700/70 leading-relaxed">
              For best results, describe the environment, lighting, and specific technology (e.g., "monocrystalline solar panels", "reverse osmosis system"). 
              Avoid generic terms for better precision.
            </p>
          </div>
        </div>

        {/* Main Studio */}
        <div className="lg:col-span-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-[40px] border border-black/5 shadow-2xl shadow-black/5"
          >
            <Suspense fallback={<StudioLoader />}>
              <AICreativeStudio />
            </Suspense>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default CreativeStudio;
