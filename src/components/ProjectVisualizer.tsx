import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion } from 'motion/react';
import { Sparkles, Loader2, Image as ImageIcon, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import OptimizedImage from './OptimizedImage';

interface ProjectVisualizerProps {
  selectedProducts: any[];
  location?: string;
}

const ProjectVisualizer: React.FC<ProjectVisualizerProps> = ({ selectedProducts, location }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVisualize = async () => {
    if (selectedProducts.length === 0) {
      toast.error("Please select some products in the Quote Builder tab first to visualize your project.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey || apiKey === "undefined") {
        throw new Error("API Key is not defined. Please ensure your Gemini API key is configured in the Secrets panel.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const productNames = selectedProducts.map(p => p.name).join(', ');
      const prompt = `A professional, high-quality architectural visualization of a sustainable energy and water project. 
        The scene features: ${productNames}. 
        ${location ? `The setting is in ${location}.` : 'The setting is a modern, sustainable community.'}
        The image should be realistic, bright, and show the technology integrated into the environment. 
        Include solar panels, water tanks, and clean infrastructure. 
        Cinematic lighting, 8k resolution, photorealistic style.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
          },
        },
      });

      if (response.candidates && response.candidates[0]?.content?.parts) {
        let foundImage = false;
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64EncodeString = part.inlineData.data;
            setGeneratedImage(`data:image/png;base64,${base64EncodeString}`);
            foundImage = true;
            break;
          }
        }
        if (!foundImage) {
          throw new Error("AI generated a response but no image data was found.");
        }
      } else {
        throw new Error("Failed to generate image. The AI model did not return any candidates.");
      }

      toast.success("Project visualization generated!");
    } catch (err: any) {
      console.error("Visualization Error:", err);
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
      link.download = `Wash-Pivot-Project-Visualization-${Date.now()}.png`;
      link.click();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-emerald-600">
          <ImageIcon size={20} />
          <h3 className="font-bold uppercase tracking-tight">Project Visualizer</h3>
        </div>
        {generatedImage && (
          <button
            onClick={handleVisualize}
            disabled={isGenerating}
            className="text-xs font-bold text-black/40 hover:text-black transition-colors flex items-center space-x-1"
          >
            <RefreshCw size={12} className={isGenerating ? 'animate-spin' : ''} />
            <span>Regenerate</span>
          </button>
        )}
      </div>

      <div className="relative aspect-video rounded-3xl overflow-hidden bg-stone-100 border border-black/5 shadow-inner group">
        {generatedImage ? (
          <>
            <OptimizedImage
              src={generatedImage}
              alt="Project Visualization"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-4">
              <button
                onClick={handleDownload}
                className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform"
                title="Download Image"
              >
                <Download size={20} />
              </button>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center">
            {isGenerating ? (
              <div className="space-y-4 flex flex-col items-center">
                <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
                <p className="text-black/40 font-medium animate-pulse">Generating your project vision...</p>
              </div>
            ) : (
              <div className="space-y-4 flex flex-col items-center">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-black/5">
                  <Sparkles className="text-emerald-500" size={32} />
                </div>
                <div>
                  <p className="text-black font-bold">Visualize Your Impact</p>
                  <p className="text-black/40 text-sm max-w-xs mx-auto mt-1">
                    Click the button below to see an AI-generated preview of your sustainable project setup.
                  </p>
                </div>
                <button
                  onClick={handleVisualize}
                  className="mt-4 px-8 py-3 bg-black text-white font-bold rounded-xl hover:bg-black/80 transition-all flex items-center space-x-2"
                >
                  <Sparkles size={18} />
                  <span>Generate Visualization</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start space-x-3 text-red-600">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">Generation Failed</p>
            <p className="opacity-80">{error}</p>
          </div>
        </div>
      )}

      {selectedProducts.length > 0 && !generatedImage && !isGenerating && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center space-x-3 text-emerald-700">
          <Sparkles size={18} className="shrink-0" />
          <p className="text-xs font-medium">
            You have {selectedProducts.length} products selected. Ready to visualize!
          </p>
        </div>
      )}
    </div>
  );
};

export default ProjectVisualizer;
