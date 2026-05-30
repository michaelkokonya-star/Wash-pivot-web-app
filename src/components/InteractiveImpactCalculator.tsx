import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Droplets, ShieldCheck, Zap, Trees, ArrowRight, Eye, Sparkles, HeartPulse, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

type Mode = 'solar' | 'water' | 'sanitation';

export const InteractiveImpactCalculator = () => {
  const [mode, setMode] = useState<Mode>('solar');
  const [householdSize, setHouseholdSize] = useState<number>(5);
  const [resourceGoal, setResourceGoal] = useState<number>(6); // Sun Hours or Liters/day

  // Dynamic calculations based on high-integrity models
  const impactMetrics = useMemo(() => {
    if (mode === 'solar') {
      const co2Saved = Math.round(householdSize * resourceGoal * 365 * 0.45); // kg CO2 per year
      const moneySaved = Math.round(householdSize * resourceGoal * 30 * 0.18); // $ saved / month
      const treesPlanted = Math.round(co2Saved / 22); // 1 mature tree absorbs ~22kg of CO2 per year
      const cleanEnergyGenerated = Math.round(householdSize * resourceGoal * 1.2 * 365); // kWh/year
      return {
        primaryLabel: 'Clean Energy Generated',
        primaryVal: `${cleanEnergyGenerated.toLocaleString()} kWh/yr`,
        co2: co2Saved,
        trees: treesPlanted,
        savings: moneySaved,
        savingsLabel: 'Est. Monthly Bill Relief',
        healthMetric: '88% Lower Emissions',
        badgeColor: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
        barColor: 'bg-gradient-to-r from-orange-400 to-amber-500',
        activeCircle: 'border-orange-500',
      };
    } else if (mode === 'water') {
      const cleanWaterGenerated = Math.round(householdSize * resourceGoal * 365); // Liters of drinking water/yr
      const co2Saved = Math.round(cleanWaterGenerated * 0.08); // CO2 saved by skipping boiling or transport
      const kidsHealthUp = Math.min(99, Math.round(45 + householdSize * 1.5)); // Health wellness rating
      const treesPlanted = Math.round(co2Saved / 22);
      const moneySaved = Math.round(householdSize * 18); // $ saved on water buying/medicines
      return {
        primaryLabel: 'Purified Water Yield',
        primaryVal: `${cleanWaterGenerated.toLocaleString()} L/yr`,
        co2: co2Saved,
        trees: treesPlanted,
        savings: moneySaved,
        savingsLabel: 'Est. Health Cost Savings',
        healthMetric: `+${kidsHealthUp}% Water Safety Rate`,
        badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        barColor: 'bg-gradient-to-r from-blue-400 to-indigo-500',
        activeCircle: 'border-blue-500',
      };
    } else {
      const plasticAvoided = Math.round(householdSize * 45); // kg waste managed / year
      const healthImpact = Math.round(householdSize * 3.5); // disease vectors minimized
      const co2Saved = Math.round(householdSize * 120); // sanitization methane offsets
      const treesPlanted = Math.round(co2Saved / 22);
      const moneySaved = Math.round(householdSize * 12);
      return {
        primaryLabel: 'Eco Waste Managed',
        primaryVal: `${plasticAvoided.toLocaleString()} kg/yr`,
        co2: co2Saved,
        trees: treesPlanted,
        savings: moneySaved,
        savingsLabel: 'Waste Resource Value',
        healthMetric: '94% Diarrheal Reduced',
        badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        barColor: 'bg-gradient-to-r from-emerald-400 to-teal-500',
        activeCircle: 'border-emerald-500',
      };
    }
  }, [mode, householdSize, resourceGoal]);

  return (
    <div className="w-full bg-white text-[#1A242F] py-24 border-t border-black/5" id="interactive-impact-calculator">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Design */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/50 rounded-full px-4 py-1.5 text-xs text-emerald-700 font-bold tracking-wide uppercase">
            <Sparkles size={13} className="animate-spin" style={{ animationDuration: '3s' }} />
            <span>Real-time Ecosystem Action</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-stone-900 leading-tight">
            SIMULATE YOUR <span className="text-emerald-600 block sm:inline">PIVOT POINT.</span>
          </h2>
          <p className="text-stone-500 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Drag the controls below to discover how custom community size and regional circumstances convert solar, water, and hygiene tech into physical sustainability metrics.
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Controls Panel (Left) */}
          <div className="lg:col-span-5 bg-stone-50 border border-black/5 rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between hover:shadow-xl hover:shadow-black/[0.02] transition-all duration-500">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-stone-400 mb-6">Select Infrastructure Pivot</p>
              
              {/* Tab Selector Buttons */}
              <div className="grid grid-cols-3 gap-3 mb-10">
                {(['solar', 'water', 'sanitation'] as Mode[]).map((m) => {
                  const isActive = mode === m;
                  return (
                    <button
                      key={m}
                      onClick={() => {
                        setMode(m);
                        if (m === 'solar') setResourceGoal(6);
                        else if (m === 'water') setResourceGoal(45);
                        else setResourceGoal(15);
                      }}
                      className={`relative py-4 rounded-2xl flex flex-col items-center justify-center gap-2 border font-bold capitalize transition-all duration-300 ${
                        isActive
                          ? 'bg-black text-white border-black shadow-lg shadow-black/10'
                          : 'bg-white text-stone-600 border-black/5 hover:border-black/20 hover:bg-stone-100'
                      }`}
                    >
                      {m === 'solar' && <Sun size={18} className={isActive ? 'text-amber-400' : 'text-stone-400'} />}
                      {m === 'water' && <Droplets size={18} className={isActive ? 'text-blue-400' : 'text-stone-400'} />}
                      {m === 'sanitation' && <ShieldCheck size={18} className={isActive ? 'text-emerald-400' : 'text-stone-400'} />}
                      <span className="text-[11px] font-bold tracking-tight">{m}</span>
                    </button>
                  );
                })}
              </div>

              {/* Slider Controls */}
              <div className="space-y-8">
                
                {/* Control 1: Community representation (people) */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span className="text-stone-500">Beneficiaries (People)</span>
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-lg text-xs md:text-sm transition-all font-mono">
                      {householdSize} {householdSize === 1 ? 'person' : 'people'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={householdSize}
                    onChange={(e) => setHouseholdSize(parseInt(e.target.value))}
                    className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400 font-bold font-mono">
                    <span>1 (Household)</span>
                    <span>100 (Co-op Village)</span>
                  </div>
                </div>

                {/* Control 2: Intensity parameter */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span>
                      {mode === 'solar' && <span className="text-stone-500">Peak Sun Intensity (Hrs/Day)</span>}
                      {mode === 'water' && <span className="text-stone-500">Target Water Goal (L/Person/Day)</span>}
                      {mode === 'sanitation' && <span className="text-stone-500">Daily Utility Usage Cycles</span>}
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-lg text-xs md:text-sm transition-all font-mono">
                      {resourceGoal} {mode === 'solar' ? 'hrs' : mode === 'water' ? 'L' : 'cycles'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={mode === 'solar' ? '2' : mode === 'water' ? '10' : '5'}
                    max={mode === 'solar' ? '12' : mode === 'water' ? '150' : '60'}
                    value={resourceGoal}
                    onChange={(e) => setResourceGoal(parseInt(e.target.value))}
                    className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400 font-bold font-mono">
                    <span>{mode === 'solar' ? '2 hrs' : mode === 'water' ? '10L' : '5 cyc'}</span>
                    <span>{mode === 'solar' ? '12 hrs' : mode === 'water' ? '150L' : '60 cyc'}</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Quick Summary Tip */}
            <div className="mt-12 p-5 bg-white rounded-2xl border border-black/5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <HeartPulse size={18} className="animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-stone-900 uppercase">Pivot Insight Indicator</p>
                <p className="text-stone-500 text-xs leading-relaxed">
                  Every 1% increase in local solar coverage mitigates grid power surges. Together with pure micro-filtration, communities bypass waterborne risks completely.
                </p>
              </div>
            </div>

          </div>

          {/* Impact Readouts (Right) */}
          <div className="lg:col-span-7 bg-stone-950 text-white rounded-[2.5rem] p-8 md:p-12 flex flex-col justify-between relative overflow-hidden shadow-2xl">
            {/* Ambient Background Aura */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
            
            <div className="relative z-10 space-y-10">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <span className="text-[10px] tracking-[0.25em] font-bold text-white/40 uppercase">Ecosystem Metric Dashboard</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${impactMetrics.badgeColor} self-start`}>
                  {impactMetrics.healthMetric}
                </span>
              </div>

              {/* Master Display Yield */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">{impactMetrics.primaryLabel}</p>
                <motion.h3 
                  key={impactMetrics.primaryVal}
                  initial={{ scale: 0.95, opacity: 0.8 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-4xl md:text-6xl font-black font-sans text-white tracking-tighter"
                >
                  {impactMetrics.primaryVal}
                </motion.h3>
              </div>

              {/* Real-time Indicator Gauge (Creative Progress Bar) */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-white/50 font-bold">
                  <span>Simulated Efficiency Scale</span>
                  <span>100% Potential</span>
                </div>
                <div className="h-3 w-full bg-stone-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: '0%' }}
                    animate={{ width: `${Math.min(100, Math.round((householdSize / 100) * 100))}%` }}
                    transition={{ ease: 'circOut', duration: 0.5 }}
                    className={`h-full ${impactMetrics.barColor}`}
                  />
                </div>
              </div>

              {/* Multi-Metrics Grid with custom illustrations */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                
                {/* CO2 offset */}
                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
                    <Zap size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Carbon Mitigated</span>
                    <strong className="text-xl font-bold font-mono text-white block mt-1">{impactMetrics.co2.toLocaleString()} kg/yr</strong>
                  </div>
                </div>

                {/* Tree equivalent */}
                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Trees size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Tree Equivalence</span>
                    <strong className="text-xl font-bold font-mono text-white block mt-1">{impactMetrics.trees.toLocaleString()} trees/yr</strong>
                  </div>
                </div>

                {/* Financal Savings */}
                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-3">
                  <div className="w-9 h-9 rounded-xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center">
                    <DollarSign size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">{impactMetrics.savingsLabel}</span>
                    <strong className="text-xl font-bold font-mono text-white block mt-1">${impactMetrics.savings.toLocaleString()}</strong>
                  </div>
                </div>

              </div>

            </div>

            {/* Platform Landing Call To Action */}
            <div className="relative z-10 mt-12 bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div className="space-y-1">
                <h4 className="font-bold text-lg text-white">Deploy This Configuration</h4>
                <p className="text-xs text-stone-400 leading-relaxed max-w-sm">
                  Let our specialized design calculators and GenAI solar kits build a real plan for these parameters.
                </p>
              </div>
              <Link 
                to="/build" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-stone-100 transition-all group-hover:scale-[1.02]"
              >
                <span>Launch Project</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
