import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Sun, Droplets, ShieldCheck, ArrowRight, Zap, Globe, Users, Sparkles, Loader2, Search, Layers } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import OptimizedImage from '../components/OptimizedImage';

const Home = () => {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateImpactImage = async () => {
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: 'A high-quality, realistic image of a solar-powered water purification system being installed in a vibrant rural village. The scene should show local community members and technicians working together, with solar panels clearly visible and clean water flowing. The atmosphere should be hopeful and sustainable.',
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
          },
        },
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          setGeneratedImage(`data:image/png;base64,${base64EncodeString}`);
          break;
        }
      }
    } catch (error) {
      console.error("Error generating image:", error);
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
      <section className="relative h-[90vh] flex items-center overflow-hidden bg-stone-950">
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/20 via-transparent to-transparent" />
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent z-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            <h1 className="text-6xl md:text-8xl font-bold text-white tracking-tighter leading-none mb-6">
              PIVOT TO <span className="text-emerald-500">SUSTAINABILITY.</span>
            </h1>
            <p className="text-xl text-white/70 mb-8 font-light max-w-lg">
              Wash Pivot is a social enterprise dedicated to providing innovative solar, water, and sanitation solutions for a cleaner, greener future.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/marketplace"
                className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-all flex items-center space-x-2 group"
              >
                <span>Explore Solutions</span>
                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/funding"
                className="px-8 py-4 bg-white text-black font-bold rounded-lg hover:bg-white/90 transition-all"
              >
                Support Projects
              </Link>
            </div>
          </motion.div>
        </div>
      </section>


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
