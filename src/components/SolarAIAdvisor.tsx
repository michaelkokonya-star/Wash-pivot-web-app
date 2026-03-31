import React, { useState, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse, ThinkingLevel } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Zap, Battery, Sun, MapPin, Home, Tv, Loader2, Info, ExternalLink, MessageSquare, Copy, Check, Plus, X, Save, Send, User, Bot } from 'lucide-react';
import { toast } from 'sonner';
import Markdown from 'react-markdown';
import { db, auth } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const COMMON_APPLIANCES = [
  { id: 'led-5', name: 'LED Bulb (5W)', category: 'Lighting' },
  { id: 'led-10', name: 'LED Bulb (10W)', category: 'Lighting' },
  { id: 'fridge-es', name: 'Fridge (Energy Star)', category: 'Kitchen' },
  { id: 'fridge-std', name: 'Fridge (Standard)', category: 'Kitchen' },
  { id: 'tv-32', name: 'TV (LED 32")', category: 'Entertainment' },
  { id: 'tv-55', name: 'TV (LED 55")', category: 'Entertainment' },
  { id: 'laptop', name: 'Laptop', category: 'Office' },
  { id: 'desktop', name: 'Desktop PC', category: 'Office' },
  { id: 'microwave', name: 'Microwave', category: 'Kitchen' },
  { id: 'kettle', name: 'Electric Kettle', category: 'Kitchen' },
  { id: 'washing-machine', name: 'Washing Machine', category: 'Laundry' },
  { id: 'fan', name: 'Fan', category: 'Climate' },
  { id: 'ac-small', name: 'Air Conditioner (Small)', category: 'Climate' },
  { id: 'pump', name: 'Water Pump (0.5 HP)', category: 'Utility' },
  { id: 'phone', name: 'Phone Charger', category: 'Utility' },
];

interface SolarAIAdvisorProps {
  onApply?: (recommendations: any) => void;
}

interface Appliance {
  name: string;
  quantity: number;
}

const SUPER_ADMIN_EMAIL = 'michael.kokonya@washpivot.com';

const SolarAIAdvisor: React.FC<SolarAIAdvisorProps> = ({ onApply }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [inputs, setInputs] = useState({
    premisesSize: '',
    location: '',
  });
  const [selectedAppliances, setSelectedAppliances] = useState<Appliance[]>([]);
  const [customAppliance, setCustomAppliance] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [groundingChunks, setGroundingChunks] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected || !!process.env.GEMINI_API_KEY);
      } else {
        setHasApiKey(!!process.env.GEMINI_API_KEY);
      }
    };
    checkApiKey();
    // Check periodically in case they select it
    const interval = setInterval(checkApiKey, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    const loadSavedPreferences = async () => {
      if (auth.currentUser) {
        try {
          const docRef = doc(db, 'user_preferences', auth.currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.selectedAppliances) {
              // Handle legacy format (string array) vs new format (Appliance array)
              const formatted = data.selectedAppliances.map((item: any) => 
                typeof item === 'string' ? { name: item, quantity: 1 } : item
              );
              setSelectedAppliances(formatted);
            }
            if (data.premisesSize) setInputs(prev => ({ ...prev, premisesSize: data.premisesSize }));
            if (data.location) setInputs(prev => ({ ...prev, location: data.location }));
          }
        } catch (error) {
          console.error("Error loading preferences:", error);
        }
      }
    };
    loadSavedPreferences();
  }, [auth.currentUser]);

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

  const handleOpenKeySelector = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
    }
  };

  const handleCalculate = async () => {
    if (!inputs.premisesSize || selectedAppliances.length === 0 || !inputs.location) {
      toast.error("Please fill in all fields and select appliances for the AI to compute requirements.");
      return;
    }

    setIsLoading(true);
    setGroundingChunks([]);
    setResult(null);
    
    try {
      // Check for API key selection if using a potentially paid model
      if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
        if (auth.currentUser?.email === SUPER_ADMIN_EMAIL) {
          await window.aistudio.openSelectKey();
          setIsLoading(false);
          toast.info("Please select an API key in the dialog and then click Calculate again.");
          return;
        } else {
          throw new Error("Solar Advisor is currently being configured by the administrator. Please try again later.");
        }
      }

      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey || apiKey === "undefined") {
        throw new Error("API Key is not defined. Please ensure you have selected an API key from the 'Secrets' or 'Key Selection' menu and that it is correctly configured.");
      }
      
      const ai = new GoogleGenAI({ apiKey });
      
      const appliancesList = selectedAppliances
        .map(a => `${a.quantity}x ${a.name}`)
        .join(', ');
      
      const prompt = `As a Solar Energy Expert, provide a comprehensive technical advisor report for:
        Premises Size: ${inputs.premisesSize}
        Appliances & Quantities: ${appliancesList}
        Location: ${inputs.location}
        
        Your report MUST include:
        1. **Hardware Specifications**: Recommended inverter size (kVA), battery capacity (kWh), number of solar panels, and panel wattage.
        2. **Technical Insights**: Explain the reasoning behind these choices, considering efficiency and local climate.
        3. **Energy Optimization**: Provide 3 actionable tips to reduce consumption and maximize solar ROI.
        4. **Local Context**: Use Google Maps to find local solar installers or relevant geographical data for this location.
        
        Format the report using Markdown with clear headings and bullet points.`;

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: userLocation ? {
                latitude: userLocation.lat,
                longitude: userLocation.lng
              } : undefined
            }
          }
        }
      });

      if (!response.text) {
        // Fallback if the tool call failed or returned empty
        const fallbackResponse = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt + "\n\n(Note: Google Maps tools were unavailable, providing general technical advice based on location string.)",
        });
        
        if (!fallbackResponse.text) {
          throw new Error("AI failed to generate a response. Please try again.");
        }
        setResult(fallbackResponse.text);
      } else {
        setResult(response.text);
        // Extract grounding chunks
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
          setGroundingChunks(chunks);
        }
      }

      toast.success("Solar requirements computed successfully!");
    } catch (error: any) {
      console.error("AI Calculation Error:", error);
      const errorMessage = error.message || "Failed to compute requirements. Please try again.";
      toast.error(errorMessage);
      setResult(`### Error Computing Requirements\n\n${errorMessage}\n\nPlease ensure your API key is valid and you have a stable internet connection.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!auth.currentUser) {
      toast.error("Please sign in to save your preferences.");
      return;
    }

    setIsSaving(true);
    try {
      await setDoc(doc(db, 'user_preferences', auth.currentUser.uid), {
        selectedAppliances,
        premisesSize: inputs.premisesSize,
        location: inputs.location,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success("Preferences saved successfully!");
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save preferences.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAppliance = (name: string) => {
    setSelectedAppliances(prev => {
      const exists = prev.find(a => a.name === name);
      if (exists) {
        return prev.filter(a => a.name !== name);
      }
      return [...prev, { name, quantity: 1 }];
    });
  };

  const updateQuantity = (name: string, delta: number) => {
    setSelectedAppliances(prev => prev.map(a => {
      if (a.name === name) {
        const newQty = Math.max(1, a.quantity + delta);
        return { ...a, quantity: newQty };
      }
      return a;
    }));
  };

  const addCustomAppliance = () => {
    const name = customAppliance.trim();
    if (name && !selectedAppliances.find(a => a.name === name)) {
      setSelectedAppliances(prev => [...prev, { name, quantity: 1 }]);
      setCustomAppliance('');
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsChatLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey || apiKey === "undefined") {
        toast.error("API Key missing. Please select a key first.");
        setIsChatLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: "You are a Solar Energy Expert Assistant. You help users understand their solar requirements, explain technical terms, and provide advice on energy efficiency. Be concise, professional, and helpful. Use the context of their current project (Premises: " + inputs.premisesSize + ", Location: " + inputs.location + ") if relevant.",
        },
        history: chatMessages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        }))
      });

      const response = await chat.sendMessage({ message: userMessage });
      if (response.text) {
        setChatMessages(prev => [...prev, { role: 'model', text: response.text as string }]);
      }
    } catch (error) {
      console.error("Chat Error:", error);
      toast.error("Failed to get a response from the AI assistant.");
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast.success("Report copied to clipboard!");
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
              {!hasApiKey && auth.currentUser?.email === SUPER_ADMIN_EMAIL && (
                <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-4">
                  <div className="flex items-center space-x-3 text-amber-400">
                    <Info size={20} />
                    <h4 className="font-bold text-sm uppercase tracking-widest">API Key Required</h4>
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed">
                    To use the advanced **Gemini 3.1 Pro** model for high-thinking solar analysis, you need to select a Gemini API key from a paid Google Cloud project.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleOpenKeySelector}
                      className="px-4 py-2 bg-amber-500 text-black text-xs font-bold rounded-lg hover:bg-amber-400 transition-all flex items-center space-x-2"
                    >
                      <ExternalLink size={14} />
                      <span>Select API Key</span>
                    </button>
                    <a 
                      href="https://ai.google.dev/gemini-api/docs/billing" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-white/5 text-white/60 text-xs font-bold rounded-lg hover:bg-white/10 transition-all flex items-center space-x-2"
                    >
                      <Info size={14} />
                      <span>Billing Docs</span>
                    </a>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
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

                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold flex items-center space-x-2">
                    <Tv size={12} />
                    <span>Appliance Library</span>
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-white/5 rounded-xl border border-white/10">
                    {COMMON_APPLIANCES.map((app) => {
                      const isSelected = selectedAppliances.some(a => a.name === app.name);
                      return (
                        <button
                          key={app.id}
                          onClick={() => toggleAppliance(app.name)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-2 ${
                            isSelected
                              ? 'bg-emerald-500 text-black'
                              : 'bg-white/5 text-white/60 hover:bg-white/10'
                          }`}
                        >
                          <span>{app.name}</span>
                          {isSelected ? <Check size={10} /> : <Plus size={10} />}
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Add custom item..."
                      value={customAppliance}
                      onChange={(e) => setCustomAppliance(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addCustomAppliance()}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                    />
                    <button
                      onClick={addCustomAppliance}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  {selectedAppliances.length > 0 && (
                    <div className="pt-2 space-y-3">
                      <div className="text-[10px] uppercase tracking-widest text-white/20 font-bold mb-2">Selected ({selectedAppliances.length})</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedAppliances.map((app) => (
                          <div key={app.name} className="flex items-center justify-between p-2 bg-white/5 border border-white/10 rounded-xl group">
                            <span className="text-xs text-white/80 truncate font-medium">{app.name}</span>
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center bg-black/40 rounded-lg border border-white/10 overflow-hidden">
                                <button 
                                  onClick={() => updateQuantity(app.name, -1)}
                                  className="p-1 hover:bg-white/10 text-white/60 transition-colors"
                                >
                                  <X size={10} />
                                </button>
                                <span className="px-2 text-[10px] font-bold text-emerald-400 min-w-[20px] text-center">{app.quantity}</span>
                                <button 
                                  onClick={() => updateQuantity(app.name, 1)}
                                  className="p-1 hover:bg-white/10 text-white/60 transition-colors"
                                >
                                  <Plus size={10} />
                                </button>
                              </div>
                              <button 
                                onClick={() => toggleAppliance(app.name)}
                                className="text-white/20 hover:text-red-400 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleCalculate}
                  disabled={isLoading}
                  className="flex-1 py-4 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
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
                
                {auth.currentUser && (
                  <button
                    onClick={handleSavePreferences}
                    disabled={isSaving}
                    className="px-6 py-4 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 border border-white/10"
                  >
                    {isSaving ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        <Save size={18} />
                        <span className="hidden sm:inline">Save Preferences</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pt-8 border-t border-white/10"
                >
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">AI Technical Report</div>
                    <button
                      onClick={handleCopy}
                      className="flex items-center space-x-2 text-[10px] uppercase font-bold tracking-widest text-white/40 hover:text-white transition-all"
                    >
                      {isCopied ? <Check size={12} /> : <Copy size={12} />}
                      <span>{isCopied ? 'Copied' : 'Copy Report'}</span>
                    </button>
                  </div>
                  <div className="prose prose-invert max-w-none mb-8 bg-white/5 p-6 rounded-2xl border border-white/5">
                    <Markdown>{result}</Markdown>
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
                                  <div className="flex flex-col space-y-1 overflow-hidden">
                                    <span className="text-xs text-white/80 truncate font-medium">
                                      {chunk.maps.title || 'View on Google Maps'}
                                    </span>
                                    {chunk.maps.placeAnswerSources?.reviewSnippets?.length > 0 && (
                                      <div className="flex items-center space-x-1 text-[10px] text-white/40 italic">
                                        <MessageSquare size={10} />
                                        <span className="truncate">{chunk.maps.placeAnswerSources.reviewSnippets[0].text}</span>
                                      </div>
                                    )}
                                  </div>
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

                  {/* Chat Interface */}
                  <div className="mt-12 pt-8 border-t border-white/10">
                    <div className="flex items-center space-x-2 mb-6">
                      <MessageSquare className="text-emerald-400" size={16} />
                      <div className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">Chat with Solar Expert</div>
                    </div>
                    
                    <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden flex flex-col h-[400px]">
                      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
                        {chatMessages.length === 0 && (
                          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                            <Bot size={32} />
                            <p className="text-sm max-w-[200px]">Ask me anything about your solar report or energy optimization.</p>
                          </div>
                        )}
                        {chatMessages.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                              msg.role === 'user' 
                                ? 'bg-emerald-500 text-black rounded-tr-none' 
                                : 'bg-white/5 text-white/90 border border-white/10 rounded-tl-none'
                            }`}>
                              <div className="flex items-center space-x-2 mb-1 opacity-60">
                                {msg.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                                <span className="text-[10px] font-bold uppercase tracking-tighter">
                                  {msg.role === 'user' ? 'You' : 'Solar Expert'}
                                </span>
                              </div>
                              <div className="prose prose-invert prose-sm max-w-none">
                                <Markdown>{msg.text}</Markdown>
                              </div>
                            </div>
                          </div>
                        ))}
                        {isChatLoading && (
                          <div className="flex justify-start">
                            <div className="bg-white/5 p-4 rounded-2xl rounded-tl-none border border-white/10">
                              <Loader2 className="animate-spin text-emerald-400" size={16} />
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                      
                      <div className="p-4 bg-white/5 border-t border-white/5 flex items-center space-x-3">
                        <input
                          type="text"
                          placeholder="Ask a follow-up question..."
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={isChatLoading || !chatInput.trim()}
                          className="p-3 bg-emerald-500 text-black rounded-xl hover:bg-emerald-400 transition-all disabled:opacity-50"
                        >
                          <Send size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
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
