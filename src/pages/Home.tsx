import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Sun, Droplets, ShieldCheck, ArrowRight, Zap, Globe, Users, Sparkles, Loader2, Search, Layers } from 'lucide-react';
import OptimizedImage from '../components/OptimizedImage';
import { toast } from 'sonner';
import { InteractiveImpactCalculator } from '../components/InteractiveImpactCalculator';


const Home = () => {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateImpactImage = async () => {
    setIsGenerating(true);
    try {
      const prompt = 'A high-quality, realistic image of a solar-powered water purification system being installed in a vibrant rural village. The scene should show local community members and technicians working together, with solar panels clearly visible and clean water flowing. The atmosphere should be hopeful and sustainable.';
      
      const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemini-2.5-flash-image',
          prompt: prompt,
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
        if (foundImage) {
          toast.success("Impact visualization generated!");
        } else {
          throw new Error("AI generated a response but no image data was found.");
        }
      } else {
        throw new Error("Failed to generate image candidates.");
      }
    } catch (error: any) {
      console.error("Error generating image:", error);
      toast.error(error.message || "Failed to generate visualization.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    // Optionally generate on mount or just wait for user interaction
    // generateImpactImage();
  }, []);

  return (
    <div className="pt-20">
      <Helmet>
        <title>Wash Pivot | Sustainable WASH Solutions & Social Enterprise</title>
        <meta name="description" content="Wash Pivot empowers communities through sustainable solar energy, water treatment, and sanitation solutions. Join our mission for a cleaner, greener future." />
        <link rel="canonical" href="https://www.washpivot.com/" />
        <meta property="og:title" content="Wash Pivot | Sustainable WASH Solutions" />
        <meta property="og:description" content="Empowering communities through sustainable solar, water, and sanitation technology." />
        <meta property="og:url" content="https://www.washpivot.com/" />
      </Helmet>
      {/* Hero Section */}
      <section className="relative min-h-[95vh] flex items-center overflow-hidden bg-[#0A0F14]">
        {/* Decorative Grid and Ambient Lights */}
        <div className="absolute inset-0 z-0 opacity-25">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />
          <div className="absolute inset-0 bg-[#0A0F14]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)', backgroundSize: '30px 30px' }} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 w-full py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-8 select-none">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-black tracking-widest uppercase"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Pioneering WASH Communities</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="space-y-4"
              >
                <h1 className="text-5xl sm:text-7xl md:text-8xl font-black text-white tracking-tighter leading-none">
                  PIVOT TO <br className="hidden sm:inline" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-300">
                    SUSTAINABILITY.
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-white/60 font-light max-w-xl leading-relaxed">
                  Wash Pivot builds clean community utility micro-grids. Empowering neighborhoods through durable solar energy, pure water micro-filtration, and community funding.
                </p>
              </motion.div>

              {/* Action Buttons */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex flex-wrap gap-4 pt-2"
              >
                <Link
                  to="/marketplace"
                  className="px-8 py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-500 transition-all shadow-lg hover:shadow-emerald-500/20 flex items-center space-x-2 group scale-100 hover:scale-[1.03]"
                >
                  <span>Explore Solutions</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform duration-300 pointer-events-none" />
                </Link>
                <Link
                  to="/funding"
                  className="px-8 py-4 bg-white/10 text-white font-semibold backdrop-blur-md rounded-2xl border border-white/15 hover:bg-white/20 transition-all hover:scale-[1.03]"
                >
                  Support Projects
                </Link>
              </motion.div>
            </div>

            {/* Right Interactive Counter Column (Holographic Card) */}
            <div className="lg:col-span-5 hidden lg:block">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "circOut" }}
                className="relative bg-white/[0.03] backdrop-blur-xl border border-white-[0.08] p-8 rounded-[3rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden group hover:border-emerald-500/20 transition-all duration-700"
              >
                {/* Ambient Internal Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors duration-500" />
                
                <div className="space-y-6 relative z-10 text-white">
                  <div className="flex justify-between items-center pb-4 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      <div className="w-2.5 h-2.5 absolute rounded-full bg-emerald-500" />
                      <span className="text-[10px] uppercase font-black tracking-[0.2em] text-emerald-400">WashPivot Live Node</span>
                    </div>
                    <span className="text-xs text-white/40 font-mono font-medium">EST. 2026</span>
                  </div>

                  {/* Impact Summary Number */}
                  <div className="space-y-1">
                    <span className="text-[11px] uppercase font-bold tracking-widest text-stone-400 block">Clean Water Distributed</span>
                    <h3 className="text-4xl font-extrabold tracking-tight text-white font-mono">1,482,900 L</h3>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] uppercase font-bold tracking-widest text-stone-400 block">Solar Grid Capacity</span>
                    <h3 className="text-4xl font-extrabold tracking-tight text-emerald-400 font-mono">142 kW</h3>
                  </div>

                  {/* Interactive Status Metrics */}
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                      <span className="block text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-1">Active Projects</span>
                      <strong className="text-xl font-bold">24 Initiatives</strong>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                      <span className="block text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-1">Impact Radius</span>
                      <strong className="text-xl font-bold">12 Districts</strong>
                    </div>
                  </div>

                  {/* Creative Interactive Link */}
                  <a 
                    href="#interactive-impact-calculator" 
                    className="flex items-center justify-between p-4 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-2xl border border-emerald-500/25 transition-all text-xs font-bold text-emerald-300"
                  >
                    <span>Try Sustainability Simulator</span>
                    <ArrowRight size={14} />
                  </a>
                </div>
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-20 border-b border-black/5 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.3em] text-black/30 mb-12">
            Accelerating sustainable development with
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-40 grayscale group hover:grayscale-0 transition-all duration-700">
            <div className="flex items-center space-x-2 font-black text-xl tracking-tighter hover:scale-105 transition-transform">
              <Globe size={24} className="text-emerald-600" />
              <span>ECOWASH</span>
            </div>
            <div className="flex items-center space-x-2 font-black text-xl tracking-tighter hover:scale-105 transition-transform">
              <Zap size={24} className="text-orange-500" />
              <span>SOLAR GRID</span>
            </div>
            <div className="flex items-center space-x-2 font-black text-xl tracking-tighter hover:scale-105 transition-transform">
              <Droplets size={24} className="text-blue-500" />
              <span>AQUA PURE</span>
            </div>
            <div className="flex items-center space-x-2 font-black text-xl tracking-tighter hover:scale-105 transition-transform">
              <Users size={24} className="text-emerald-500" />
              <span>COMMUNITY FIRST</span>
            </div>
          </div>
        </div>
      </section>

      <InteractiveImpactCalculator />

      {/* Visualizing Impact Section (GenAI) */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="relative aspect-video rounded-3xl overflow-hidden bg-stone-100 border border-black/5 shadow-2xl">
                {generatedImage ? (
                  <OptimizedImage
                    src={generatedImage}
                    alt="Solar Water Purification System"
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center">
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
                        <p className="text-black/40 font-medium animate-pulse">Generating impact visualization...</p>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-12 h-12 text-black/10 mb-4" />
                        <p className="text-black/40 font-medium">Click the button to visualize our mission in action.</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-black mb-6">
                VISUALIZING <span className="italic font-serif">IMPACT.</span>
              </h2>
              <p className="text-black/60 text-lg mb-8 leading-relaxed">
                Experience the future of sustainable development. Our AI-powered visualization shows how solar-powered water systems transform lives in rural communities.
              </p>
              <button
                onClick={generateImpactImage}
                disabled={isGenerating}
                className="px-8 py-4 bg-black text-white font-bold rounded-xl hover:bg-black/80 transition-all flex items-center space-x-3 disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                <span>{generatedImage ? 'Regenerate Vision' : 'Visualize Mission'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-32 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <div className="max-w-xl">
              <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-black mb-6">
                OUR CORE <span className="italic font-serif">PIVOTS.</span>
              </h2>
              <p className="text-black/60 text-lg">
                We focus on three critical areas of human development and environmental sustainability.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="w-12 h-1 bg-emerald-600" />
              <div className="w-12 h-1 bg-black/10" />
              <div className="w-12 h-1 bg-black/10" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Solar Energy',
                icon: <Sun className="text-orange-500" size={40} />,
                desc: 'Harnessing the power of the sun to provide clean, reliable energy to communities.',
                color: 'bg-orange-50',
              },
              {
                title: 'Water Treatment',
                icon: <Droplets className="text-blue-500" size={40} />,
                desc: 'Advanced filtration and purification systems ensuring access to safe drinking water.',
                color: 'bg-blue-50',
              },
              {
                title: 'Sanitation',
                icon: <ShieldCheck className="text-emerald-500" size={40} />,
                desc: 'Sustainable waste management and hygiene solutions for improved public health.',
                color: 'bg-emerald-50',
              },
            ].map((service, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -10 }}
                className={`p-10 rounded-3xl ${service.color} border border-black/5 flex flex-col h-full`}
              >
                <div className="mb-8">{service.icon}</div>
                <h3 className="text-2xl font-bold mb-4">{service.title}</h3>
                <p className="text-black/60 mb-8 flex-grow">{service.desc}</p>
                <Link to="/marketplace" className="text-black font-bold flex items-center space-x-2 group">
                  <span>View Products</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-32 bg-white border-t border-black/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-black mb-6 uppercase">
              THE PIVOT <span className="italic font-serif">PROCESS.</span>
            </h2>
            <p className="text-black/40 text-lg max-w-2xl mx-auto font-medium">
              A systematic approach to delivering sustainable infrastructure and social impact.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-1/4 left-0 right-0 h-px bg-black/5 -z-0" />
            
            {[
              {
                step: '01',
                title: 'Discovery',
                desc: 'Deep analysis of community needs and environmental constraints.',
                icon: <Search size={24} />,
              },
              {
                step: '02',
                title: 'Design',
                desc: 'Engineering custom solar and water treatment prototypes.',
                icon: <Layers size={24} />,
              },
              {
                step: '03',
                title: 'Deployment',
                desc: 'On-site installation and technical commissioning by experts.',
                icon: <Zap size={24} />,
              },
              {
                step: '04',
                title: 'Impact',
                desc: 'Continuous monitoring and scaling for long-term growth.',
                icon: <Globe size={24} />,
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="relative z-10 group"
              >
                <div className="mb-8 flex items-center justify-between">
                  <div className="w-16 h-16 rounded-2xl bg-stone-50 border border-black/5 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shadow-sm">
                    {item.icon}
                  </div>
                  <span className="text-4xl font-bold font-serif italic text-black/5 group-hover:text-emerald-600/20 transition-colors duration-500">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-4 uppercase tracking-tight">{item.title}</h3>
                <p className="text-black/50 text-sm leading-relaxed font-medium">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-emerald-600 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8">
              READY TO BUILD YOUR <span className="italic font-serif">IMPACT?</span>
            </h2>
            <p className="text-xl text-white/80 mb-12 max-w-xl">
              Join our network of experts, find sustainable products, and fund community-led projects.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/recruitment"
                className="px-8 py-4 bg-white text-emerald-600 font-bold rounded-lg hover:bg-stone-100 transition-all"
              >
                Join as Expert
              </Link>
              <Link
                to="/build"
                className="px-8 py-4 bg-black text-white font-bold rounded-lg hover:bg-black/80 transition-all"
              >
                Start a Project
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
