import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Zap, Battery, Sun, MapPin, Home, Tv, Loader2, Info, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface SolarAIAdvisorProps {
  onApply?: (recommendations: any) => void;
}

const SolarAIAdvisor: React.FC<SolarAIAdvisorProps> = ({ onApply }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inputs, setInputs] = useState({
    premisesSize: '',
    appliances: '',
    location: '',
  });
  const [result, setResult] = useState<any>(null);
  const [groundingChunks, setGroundingChunks] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn("Geolocation error:", error);
        }
      );
    }
  }, []);

  const handleCalculate = async () => {
    if (!inputs.premisesSize || !inputs.appliances || !inputs.location) {
      toast.error("Please fill in all fields for the AI to compute requirements.");
      return;
    }

    setIsLoading(true);
    setGroundingChunks([]);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not defined in environment variables.");
      }
      const ai = new GoogleGenAI({ apiKey });
      
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Compute solar hardware requirements for:
          Premises Size: ${inputs.premisesSize}
          Appliances: ${inputs.appliances}
          Location: ${inputs.location}
          
          Provide a technical breakdown of inverter size, battery capacity, and number of solar panels. 
          Also, use Google Maps to find local solar installers or relevant geographical data for this location.`,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: userLocation ? {
                latitude: userLocation.lat,
                longitude: userLocation.lng
              } : undefined
            }
          },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              inverterSize: { type: Type.STRING, description: "Recommended inverter size (e.g., 5kVA)" },
              batteryCapacity: { type: Type.STRING, description: "Recommended battery capacity (e.g., 10kWh)" },
              solarPanelsCount: { type: Type.NUMBER, description: "Number of solar panels required" },
              panelWattage: { type: Type.STRING, description: "Recommended wattage per panel" },
              estimatedDailyYield: { type: Type.STRING, description: "Estimated daily energy yield" },
              technicalNote: { type: Type.STRING, description: "A brief technical note on the configuration" }
            },
            required: ["inverterSize", "batteryCapacity", "solarPanelsCount", "panelWattage", "estimatedDailyYield", "technicalNote"]
          }
        }
      });

      if (!response.text) {
        throw new Error("AI response was empty.");
      }
      const data = JSON.parse(response.text);
      setResult(data);

      // Extract grounding chunks
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        setGroundingChunks(chunks);
      }

      toast.success("Solar requirements computed successfully!");
    } catch (error) {
      console.error("AI Calculation Error:", error);
      toast.error("Failed to compute requirements. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-12">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 bg-gradient-to-r from-emerald-900 to-black text-white rounded-3xl flex items-center justify-between group hover:shadow-2xl hover:shadow-emerald-500/10 transition-all border border-emerald-500/20"
      >
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Sparkles className="text-emerald-400" />
          </div>
          <div className="text-left">
            <h3 className="text-xl font-bold tracking-tight">Solar AI Advisor</h3>
            <p className="text-emerald-400/60 text-sm">Compute hardware requirements using AI</p>
          </div>
        </div>
        <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          <Zap className="text-emerald-400" />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-8 bg-stone-900 rounded-3xl border border-white/5 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold flex items-center space-x-2">
                    <Home size={12} />
                    <span>Premises Size</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 3 Bedroom House"
                    value={inputs.premisesSize}
                    onChange={(e) => setInputs({ ...inputs, premisesSize: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold flex items-center space-x-2">
                    <Tv size={12} />
                    <span>Appliances</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Fridge, TV, 10 Lights"
                    value={inputs.appliances}
                    onChange={(e) => setInputs({ ...inputs, appliances: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold flex items-center space-x-2">
                    <MapPin size={12} />
                    <span>Location</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Nairobi, Kenya"
                    value={inputs.location}
                    onChange={(e) => setInputs({ ...inputs, location: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                onClick={handleCalculate}
                disabled={isLoading}
                className="w-full py-4 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <Zap size={18} />
                    <span>Compute Requirements</span>
                  </>
                )}
              </button>

              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pt-8 border-t border-white/10"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center space-x-2 text-emerald-400 mb-2">
                        <Zap size={16} />
                        <span className="text-[10px] uppercase font-bold tracking-widest">Inverter</span>
                      </div>
                      <div className="text-2xl font-bold text-white">{result.inverterSize}</div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center space-x-2 text-blue-400 mb-2">
                        <Battery size={16} />
                        <span className="text-[10px] uppercase font-bold tracking-widest">Storage</span>
                      </div>
                      <div className="text-2xl font-bold text-white">{result.batteryCapacity}</div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center space-x-2 text-orange-400 mb-2">
                        <Sun size={16} />
                        <span className="text-[10px] uppercase font-bold tracking-widest">Panels</span>
                      </div>
                      <div className="text-2xl font-bold text-white">{result.solarPanelsCount} × {result.panelWattage}</div>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-start space-x-3">
                    <Info className="text-emerald-400 shrink-0 mt-1" size={18} />
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">AI Recommendation</div>
                      <p className="text-sm text-white/70 leading-relaxed">{result.technicalNote}</p>
                      <div className="text-xs text-emerald-400/60 mt-2">Estimated Daily Yield: {result.estimatedDailyYield}</div>
                    </div>
                  </div>

                  {groundingChunks.length > 0 && (
                    <div className="mt-6 space-y-4">
                      <div className="text-[10px] uppercase font-bold tracking-widest text-white/40">Local Resources & Maps</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {groundingChunks.map((chunk, idx) => {
                          if (chunk.maps) {
                            return (
                              <a
                                key={idx}
                                href={chunk.maps.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all flex items-center justify-between group"
                              >
                                <div className="flex items-center space-x-3 overflow-hidden">
                                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                                    <MapPin size={14} className="text-blue-400" />
                                  </div>
                                  <span className="text-xs text-white/80 truncate font-medium">
                                    {chunk.maps.title || 'View on Google Maps'}
                                  </span>
                                </div>
                                <ExternalLink size={12} className="text-white/20 group-hover:text-white/60 shrink-0" />
                              </a>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SolarAIAdvisor;
