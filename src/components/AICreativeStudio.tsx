import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Loader2, 
  Image as ImageIcon, 
  Download, 
  RefreshCw, 
  AlertCircle, 
  Video, 
  Maximize2, 
  Type, 
  Upload,
  Play,
  CheckCircle2,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import OptimizedImage from './OptimizedImage';

// Extend window for AI Studio functions
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const AICreativeStudio = () => {
  const [activeMode, setActiveMode] = useState<'image' | 'video'>('image');
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Image Config
  const [imageModel, setImageModel] = useState<'gemini-3.1-flash-image-preview' | 'gemini-3-pro-image-preview'>('gemini-3.1-flash-image-preview');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  
  // Video Config
  const [videoSourceImage, setVideoSourceImage] = useState<string | null>(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [videoStatus, setVideoStatus] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const ASPECT_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'];
  const IMAGE_SIZES = ['1K', '2K', '4K'];

  const checkAndOpenKey = async () => {
    try {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
        return true;
      }
      return true;
    } catch (err) {
      console.error("Error checking API key:", err);
      return false;
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideoSourceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateImage = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt for image generation.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      await checkAndOpenKey();
      const { GoogleGenAI } = await import("@google/genai");
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: imageModel,
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
            imageSize: imageSize as any,
          },
        },
      });

      if (response.candidates && response.candidates[0]?.content?.parts) {
        let foundImage = false;
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64Data = part.inlineData.data;
            setGeneratedImage(`data:image/png;base64,${base64Data}`);
            foundImage = true;
            break;
          }
        }
        if (!foundImage) throw new Error("No image data returned from AI.");
      } else {
        throw new Error("Failed to generate image candidates.");
      }
      toast.success("Image generated successfully!");
    } catch (err: any) {
      console.error("Image Gen Error:", err);
      setError(err.message || "Failed to generate image.");
      toast.error("Image generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateVideo = async () => {
    if (!videoSourceImage) {
      toast.error("Please upload a starting image for video generation.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedVideo(null);
    setVideoStatus('Initializing video generation...');

    try {
      await checkAndOpenKey();
      const { GoogleGenAI } = await import("@google/genai");
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      
      const ai = new GoogleGenAI({ apiKey });
      
      const base64Data = videoSourceImage.split(',')[1];
      const mimeType = videoSourceImage.split(';')[0].split(':')[1];

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt: prompt || 'Animate this scene with cinematic motion',
        image: {
          imageBytes: base64Data,
          mimeType: mimeType,
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: videoAspectRatio,
        }
      });

      setVideoStatus('Video is being processed. This may take a few minutes...');

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
        setVideoStatus('Still processing... hang tight!');
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("Video generation completed but no download link was found.");

      setVideoStatus('Fetching generated video...');
      const videoResponse = await fetch(downloadLink, {
        method: 'GET',
        headers: {
          'x-goog-api-key': apiKey!,
        },
      });

      if (!videoResponse.ok) throw new Error("Failed to fetch video data.");
      
      const blob = await videoResponse.blob();
      const videoUrl = URL.createObjectURL(blob);
      setGeneratedVideo(videoUrl);
      toast.success("Video generated successfully!");
    } catch (err: any) {
      console.error("Video Gen Error:", err);
      setError(err.message || "Failed to generate video.");
      toast.error("Video generation failed.");
    } finally {
      setIsGenerating(false);
      setVideoStatus('');
    }
  };

  return (
    <div className="space-y-8">
      {/* Mode Selector */}
      <div className="flex space-x-1 bg-stone-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setActiveMode('image')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 ${
            activeMode === 'image' ? 'bg-white text-black shadow-sm' : 'text-black/40 hover:text-black'
          }`}
        >
          <ImageIcon size={16} />
          <span>Image Studio</span>
        </button>
        <button
          onClick={() => setActiveMode('video')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 ${
            activeMode === 'video' ? 'bg-white text-black shadow-sm' : 'text-black/40 hover:text-black'
          }`}
        >
          <Video size={16} />
          <span>Video Lab</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Controls */}
        <div className="space-y-8">
          <div className="space-y-4">
            <label className="text-sm font-bold uppercase tracking-widest text-black/40 flex items-center space-x-2">
              <Type size={14} />
              <span>Creative Prompt</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={activeMode === 'image' ? "Describe the image you want to create..." : "Describe the motion or scene (optional)..."}
              className="w-full h-32 p-4 bg-white border border-black/5 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none transition-all"
            />
          </div>

          {activeMode === 'image' ? (
            <div className="space-y-8">
              {/* Model & Size */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-black/40">Quality Level</label>
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() => setImageModel('gemini-3.1-flash-image-preview')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                        imageModel === 'gemini-3.1-flash-image-preview' ? 'bg-black text-white border-black' : 'bg-white text-black/60 border-black/5 hover:border-black/20'
                      }`}
                    >
                      Fast (Flash)
                    </button>
                    <button
                      onClick={() => setImageModel('gemini-3-pro-image-preview')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                        imageModel === 'gemini-3-pro-image-preview' ? 'bg-black text-white border-black' : 'bg-white text-black/60 border-black/5 hover:border-black/20'
                      }`}
                    >
                      Studio (Pro)
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-black/40">Image Size</label>
                  <div className="grid grid-cols-3 gap-2">
                    {IMAGE_SIZES.map(size => (
                      <button
                        key={size}
                        onClick={() => setImageSize(size as any)}
                        className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                          imageSize === size ? 'bg-black text-white border-black' : 'bg-white text-black/60 border-black/5 hover:border-black/20'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-black/40 flex items-center space-x-2">
                  <Maximize2 size={12} />
                  <span>Aspect Ratio</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {ASPECT_RATIOS.map(ratio => (
                    <button
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                        aspectRatio === ratio ? 'bg-black text-white border-black' : 'bg-white text-black/60 border-black/5 hover:border-black/20'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={generateImage}
                disabled={isGenerating}
                className="w-full py-4 bg-emerald-500 text-black font-bold rounded-2xl hover:bg-emerald-400 transition-all flex items-center justify-center space-x-3 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                <span>{isGenerating ? 'Generating...' : 'Create Masterpiece'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Video Upload */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-black/40 flex items-center space-x-2">
                  <Upload size={12} />
                  <span>Source Image</span>
                </label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative aspect-video rounded-2xl border-2 border-dashed border-black/10 bg-white hover:border-emerald-500 transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center text-center p-6"
                >
                  {videoSourceImage ? (
                    <>
                      <img src={videoSourceImage} alt="Source" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                      <div className="relative z-10 bg-white/90 p-2 rounded-lg shadow-sm flex items-center space-x-2 text-xs font-bold">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <span>Image Uploaded</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="text-black/20 mb-2" size={32} />
                      <p className="text-xs font-bold text-black/40">Click to upload starting frame</p>
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
              </div>

              {/* Video Aspect Ratio */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-black/40">Video Format</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setVideoAspectRatio('16:9')}
                    className={`py-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-2 ${
                      videoAspectRatio === '16:9' ? 'bg-black text-white border-black' : 'bg-white text-black/60 border-black/5'
                    }`}
                  >
                    <Maximize2 size={14} />
                    <span>Landscape (16:9)</span>
                  </button>
                  <button
                    onClick={() => setVideoAspectRatio('9:16')}
                    className={`py-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-2 ${
                      videoAspectRatio === '9:16' ? 'bg-black text-white border-black' : 'bg-white text-black/60 border-black/5'
                    }`}
                  >
                    <Maximize2 size={14} className="rotate-90" />
                    <span>Portrait (9:16)</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-2xl flex items-start space-x-3 text-blue-700">
                <Info size={18} className="shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed">
                  Video generation uses <strong>Veo 3.1 Fast</strong>. This process can take 2-3 minutes. Please do not close the tab.
                </p>
              </div>

              <button
                onClick={generateVideo}
                disabled={isGenerating || !videoSourceImage}
                className="w-full py-4 bg-black text-white font-bold rounded-2xl hover:bg-black/80 transition-all flex items-center justify-center space-x-3 shadow-lg disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="animate-spin" /> : <Play size={20} />}
                <span>{isGenerating ? 'Processing Video...' : 'Animate Image'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Preview Area */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest text-black/40">Studio Preview</h3>
            {(generatedImage || generatedVideo) && (
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = generatedImage || generatedVideo!;
                  link.download = `wash-pivot-ai-${Date.now()}.${generatedImage ? 'png' : 'mp4'}`;
                  link.click();
                }}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
              >
                <Download size={14} />
                <span>Download Asset</span>
              </button>
            )}
          </div>

          <div className="relative aspect-video rounded-3xl bg-stone-100 border border-black/5 overflow-hidden flex items-center justify-center">
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center text-center p-12"
                >
                  <div className="relative mb-6">
                    <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-300" size={24} />
                  </div>
                  <p className="font-bold text-lg mb-2">AI is Crafting...</p>
                  <p className="text-black/40 text-sm max-w-xs">{videoStatus || 'Your creative vision is being processed by our neural networks.'}</p>
                </motion.div>
              ) : generatedImage ? (
                <motion.div
                  key="image-preview"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full h-full"
                >
                  <OptimizedImage src={generatedImage} alt="Generated" className="w-full h-full object-contain" />
                </motion.div>
              ) : generatedVideo ? (
                <motion.div
                  key="video-preview"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full h-full"
                >
                  <video src={generatedVideo} controls autoPlay loop className="w-full h-full object-contain" />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center p-12"
                >
                  <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm border border-black/5 mx-auto mb-6">
                    <Sparkles className="text-black/10" size={40} />
                  </div>
                  <p className="text-black/40 font-medium">Your generated asset will appear here</p>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="absolute bottom-6 left-6 right-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start space-x-3 text-red-600">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold">Generation Error</p>
                  <p className="opacity-80">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-stone-50 rounded-2xl border border-black/5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2">Pro Tip</p>
              <p className="text-xs text-black/60 leading-relaxed">
                Be specific about lighting and style. Use words like "cinematic", "photorealistic", or "sunset" for better results.
              </p>
            </div>
            <div className="p-4 bg-stone-50 rounded-2xl border border-black/5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2">Video Info</p>
              <p className="text-xs text-black/60 leading-relaxed">
                Veo works best with high-contrast starting images. Animation usually adds 5-10 seconds of motion.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AICreativeStudio;
