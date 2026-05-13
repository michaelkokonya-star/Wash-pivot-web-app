import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Loader2, Image as ImageIcon, Download, RefreshCw, AlertCircle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import OptimizedImage from './OptimizedImage';

interface AIImpactVisualizerProps {
  title: string;
  description: string;
  category?: string;
}

const AIImpactVisualizer: React.FC<AIImpactVisualizerProps> = ({ title, description, category }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVisualize = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemini-2.5-flash-image',
          prompt: `A professional, high-quality, and realistic visualization of the long-term positive impact of a sustainable project. 
            Project Title: ${title}.
            Project Description: ${description}.
            ${category ? `Category: ${category}.` : ''}
            The image should depict a thriving, sustainable future enabled by this project. 
            Show people benefiting from clean technology, a healthy environment, and community growth. 
            Highly detailed, hopeful atmosphere, cinematic lighting, photorealistic, 8k resolution.`,
          config: {
            imageConfig: {
              aspectRatio: "16:9",
            },
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate visualization.");
      }

      const data = await response.json();

      if (data.candidates && data.candidates[0]?.content?.parts) {
        let foundImage = false;
        for (const part of data.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64Data = part.inlineData.data;
            setGeneratedImage(`data:image/png;base64,${base64Data}`);
            foundImage = true;
            break;
          }
        }
        if (!foundImage) {
          throw new Error("AI generated a response but no image data was found.");
        }
      } else {
        throw new Error("Failed to generate image candidates.");
      }

      toast.success("Impact visualization generated!");
    } catch (err: any) {
      console.error("Impact Visualization Error:", err);
      const msg = err.message || "Failed to generate visualization.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `Wash-Pivot-Impact-Vision-${title.replace(/\s+/g, '-')}.png`;
      link.click();
    }
  };

  return (
    <div className="bg-stone-50 rounded-3xl border border-black/5 overflow-hidden">
      <div className="p-8 border-b border-black/5 flex items-center justify-between">
        <div className="flex items-center space-x-3 text-emerald-600">
          <TrendingUp size={24} />
          <h3 className="text-sm font-bold uppercase tracking-widest italic font-serif">AI Visualising Impact</h3>
        </div>
        {generatedImage && (
          <button
            onClick={handleVisualize}
            disabled={isGenerating}
            className="p-2 bg-white text-black/40 hover:text-black rounded-lg transition-all border border-black/5"
            title="Regenerate"
          >
            <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      <div className="p-8">
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-stone-200/50 border border-black/5 group shadow-inner">
          {generatedImage ? (
            <>
              <OptimizedImage
                src={generatedImage}
                alt={`Impact vision for ${title}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-4">
                <button
                  onClick={handleDownload}
                  className="p-4 bg-white text-black rounded-full hover:scale-110 transition-transform shadow-xl"
                  title="Download Impact Vision"
                >
                  <Download size={24} />
                </button>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center">
              {isGenerating ? (
                <div className="space-y-6 flex flex-col items-center">
                  <div className="relative">
                    <Loader2 className="w-16 h-16 text-emerald-600 animate-spin" />
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600/40" size={24} />
                  </div>
                  <div>
                    <p className="text-xl font-bold tracking-tight mb-2">Simulating Future Impact...</p>
                    <p className="text-black/40 text-sm max-w-xs mx-auto animate-pulse">
                      Gemini is analyzing project goals to visualize sustainable outcomes.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 flex flex-col items-center">
                  <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl border border-black/5 rotate-3 hover:rotate-0 transition-transform duration-500">
                    <Sparkles className="text-emerald-500" size={40} />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Visualize the Future</h4>
                    <p className="text-black/40 text-sm max-w-xs mx-auto leading-relaxed">
                      Use AI to see a photorealistic preview of the positive change this project will bring to the community.
                    </p>
                  </div>
                  <button
                    onClick={handleVisualize}
                    className="px-8 py-4 bg-black text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all flex items-center space-x-3 shadow-xl shadow-black/10 group active:scale-95"
                  >
                    <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
                    <span>Visualize Impact</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start space-x-3 text-red-600"
            >
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold">Visualization could not be generated</p>
                <p className="opacity-80">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex items-center space-x-2 text-[10px] font-bold uppercase tracking-[0.2em] text-black/20 justify-center">
          <div className="w-8 h-px bg-black/5" />
          <span>Powered by Gemini 2.5 Flash</span>
          <div className="w-8 h-px bg-black/5" />
        </div>
      </div>
    </div>
  );
};

export default AIImpactVisualizer;
