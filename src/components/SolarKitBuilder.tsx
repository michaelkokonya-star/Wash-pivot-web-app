import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Plus, 
  Trash2, 
  Zap, 
  Sun, 
  Battery, 
  Settings, 
  FileText, 
  Download, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Info,
  Lightbulb,
  Tv,
  Refrigerator,
  Laptop,
  Wind,
  Smartphone,
  Calculator,
  Save,
  Loader2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

import { useSettings } from '../context/SettingsContext';

interface Appliance {
  id: string;
  name: string;
  wattage: number;
  quantity: number;
  hoursPerDay: number;
  icon?: any;
}

interface MarketplaceProduct {
  id: string;
  name: string;
  price?: number;
  category: string;
  subCategory: string;
  imageUrl?: string;
  description?: string;
  ratings?: string[];
}

interface SelectedHardwareItem extends MarketplaceProduct {
  selectedRating: string;
  selectedPrice: number;
  quantity: number;
}

const PRESET_APPLIANCES = [
  { name: 'LED Bulb', wattage: 10, icon: Lightbulb },
  { name: 'TV (LED)', wattage: 80, icon: Tv },
  { name: 'Refrigerator', wattage: 150, icon: Refrigerator },
  { name: 'Laptop', wattage: 65, icon: Laptop },
  { name: 'Fan', wattage: 50, icon: Wind },
  { name: 'Phone Charger', wattage: 10, icon: Smartphone },
];

const SolarKitBuilder: React.FC = () => {
  const { pricingRules } = useSettings();
  const [step, setStep] = useState(1);
  const [kitName, setKitName] = useState('My Custom Solar Kit');
  const [loadItems, setLoadItems] = useState<Appliance[]>([]);
  const [marketplaceProducts, setMarketplaceProducts] = useState<MarketplaceProduct[]>([]);
  const [selectedHardware, setSelectedHardware] = useState<SelectedHardwareItem[]>([]);
  const [productRatings, setProductRatings] = useState<Record<string, string>>({});
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApportioning, setIsApportioning] = useState(false);

  // Constants for calculation
  const PEAK_SUN_HOURS = 5; // Average for Kenya
  const SYSTEM_EFFICIENCY = 0.8;
  const BATTERY_DOD = 0.5; // 50% Depth of Discharge for Lead Acid
  const SYSTEM_VOLTAGE = 12; // Standard 12V system

  const { user } = useAuth();

  useEffect(() => {
    const fetchSolarProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const q = query(collection(db, 'products'), where('category', '==', 'Solar'));
        const querySnapshot = await getDocs(q);
        const products: MarketplaceProduct[] = [];
        querySnapshot.forEach((doc) => {
          products.push({ id: doc.id, ...doc.data() } as MarketplaceProduct);
        });
        setMarketplaceProducts(products);
      } catch (error) {
        console.error("Error fetching solar products:", error);
        toast.error("Failed to load marketplace products.");
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchSolarProducts();
  }, []);

  const totalDailyLoadWh = loadItems.reduce((sum, item) => sum + (item.wattage * item.quantity * item.hoursPerDay), 0);
  const totalPeakLoadW = loadItems.reduce((sum, item) => sum + (item.wattage * item.quantity), 0);

  // Recommendations
  const recommendedPanelW = Math.ceil((totalDailyLoadWh / PEAK_SUN_HOURS) / SYSTEM_EFFICIENCY);
  const recommendedBatteryWh = Math.ceil((totalDailyLoadWh * 1.5) / BATTERY_DOD); // 1.5 days autonomy
  const recommendedInverterW = Math.ceil(totalPeakLoadW * 1.25); // 25% safety margin

  const calculatePriceForProduct = (subCategory: string, rating: string) => {
    if (!pricingRules || !subCategory || !rating) return 0;
    const pricePerUnit = pricingRules[subCategory];
    if (!pricePerUnit) return 0;

    let ratingValue = parseFloat(rating.replace(/[^\d.]/g, ''));
    if (rating.toUpperCase().includes('KW')) {
      ratingValue = ratingValue * 1000;
    }
    return Math.round(ratingValue * pricePerUnit);
  };

  const totalPriceEstimate = selectedHardware.reduce((sum, p) => sum + (p.selectedPrice * p.quantity), 0);

  const autoApportionHardware = () => {
    if (marketplaceProducts.length === 0) {
      toast.error("No marketplace products available to apportion.");
      return;
    }

    setIsApportioning(true);
    const newSelection: SelectedHardwareItem[] = [];
    
    // Requirements map
    const requirements = [
      { subCategory: 'Solar Panels', target: recommendedPanelW, unit: 'W' },
      { subCategory: 'Batteries', target: recommendedBatteryWh, unit: 'Wh' },
      { subCategory: 'Inverter', target: recommendedInverterW, unit: 'W' },
      { subCategory: 'Charge Controller', target: Math.ceil(recommendedPanelW / SYSTEM_VOLTAGE), unit: 'A' }
    ];

    requirements.forEach(req => {
      const categoryProducts = marketplaceProducts.filter(p => p.subCategory === req.subCategory);
      if (categoryProducts.length === 0) return;

      // Find the best matching variant across all products in this category
      let bestProduct: MarketplaceProduct | null = null;
      let bestRating = '';
      let bestRatingValue = 0;
      let neededQuantity = 1;

      // First pass: find the single largest variant to see if multiple are needed
      let maxRatingValue = 0;
      let maxRatingProduct: MarketplaceProduct | null = null;
      let maxRatingString = '';

      categoryProducts.forEach(product => {
        product.ratings?.forEach(rating => {
          let value = parseFloat(rating.replace(/[^\d.]/g, ''));
          if (rating.toUpperCase().includes('KW')) value *= 1000;
          if (req.subCategory === 'Batteries' && rating.toUpperCase().includes('AH')) value *= SYSTEM_VOLTAGE;
          
          if (value > maxRatingValue) {
            maxRatingValue = value;
            maxRatingProduct = product;
            maxRatingString = rating;
          }
        });
      });

      if (maxRatingValue === 0) return;

      if (maxRatingValue < req.target && (req.subCategory === 'Solar Panels' || req.subCategory === 'Batteries')) {
        // Need multiple units of the largest one
        neededQuantity = Math.ceil(req.target / maxRatingValue);
        bestProduct = maxRatingProduct;
        bestRating = maxRatingString;
      } else {
        // Find the smallest one that meets the requirement
        let minMeetingValue = Infinity;
        categoryProducts.forEach(product => {
          product.ratings?.forEach(rating => {
            let value = parseFloat(rating.replace(/[^\d.]/g, ''));
            if (rating.toUpperCase().includes('KW')) value *= 1000;
            if (req.subCategory === 'Batteries' && rating.toUpperCase().includes('AH')) value *= SYSTEM_VOLTAGE;

            if (value >= req.target && value < minMeetingValue) {
              minMeetingValue = value;
              bestProduct = product;
              bestRating = rating;
            }
          });
        });

        // If none meet, already handled by maxRatingValue logic above (which would just pick 1 if neededQuantity stays 1)
        if (!bestProduct) {
          bestProduct = maxRatingProduct;
          bestRating = maxRatingString;
        }
      }

      if (bestProduct) {
        const product = bestProduct as MarketplaceProduct;
        const price = calculatePriceForProduct(product.subCategory, bestRating);
        newSelection.push({
          ...product,
          selectedRating: bestRating,
          selectedPrice: price,
          quantity: neededQuantity
        });
      }
    });

    setSelectedHardware(newSelection);
    setIsApportioning(false);
    toast.success(`Automatically selected components to meet your ${recommendedPanelW}W load!`);
    setStep(3); // Move to selection step to review
  };

  const addAppliance = (preset?: typeof PRESET_APPLIANCES[0]) => {
    const newItem: Appliance = {
      id: Math.random().toString(36).substr(2, 9),
      name: preset?.name || 'New Item',
      wattage: preset?.wattage || 0,
      quantity: 1,
      hoursPerDay: 4,
      icon: preset?.icon
    };
    setLoadItems([...loadItems, newItem]);
  };

  const removeAppliance = (id: string) => {
    setLoadItems(loadItems.filter(item => item.id !== id));
  };

  const updateAppliance = (id: string, updates: Partial<Appliance>) => {
    setLoadItems(loadItems.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const generatePDF = () => {
    if (loadItems.length === 0) {
      toast.error("Please add at least one appliance to your load requirement.");
      return;
    }

    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const date = new Date().toLocaleDateString();

      // Header
      doc.setFontSize(22);
      doc.setTextColor(16, 185, 129); // Emerald 600
      doc.text('WASH PIVOT', 14, 22);
      
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text('Custom Solar Kit Configuration', 14, 30);
      doc.text(`Project: ${kitName}`, 14, 36);
      doc.text(`Date: ${date}`, 14, 42);

      // Load Requirements Table
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('1. Load Requirements', 14, 55);
      
      autoTable(doc, {
        startY: 60,
        head: [['Appliance', 'Qty', 'Wattage (W)', 'Hours/Day', 'Daily Load (Wh)']],
        body: loadItems.map(item => [
          item.name,
          item.quantity,
          item.wattage,
          item.hoursPerDay,
          (item.wattage * item.quantity * item.hoursPerDay).toLocaleString()
        ]),
        theme: 'striped',
        headStyles: { fillColor: [0, 0, 0] },
        margin: { left: 14, right: 14 }
      });

      const loadTableEndY = (doc as any).lastAutoTable.finalY;

      // System Recommendations
      doc.setFontSize(14);
      doc.text('2. System Recommendations', 14, loadTableEndY + 15);
      
      autoTable(doc, {
        startY: loadTableEndY + 20,
        head: [['Component', 'Recommended Specification', 'Quantity (Est.)']],
        body: [
          ['Solar Panels', `${recommendedPanelW}W Total Capacity`, 'As per panel wattage'],
          ['Battery Bank', `${recommendedBatteryWh}Wh Total Capacity`, 'As per battery size'],
          ['Inverter', `${recommendedInverterW}W Pure Sine Wave`, '1 Unit'],
          ['Charge Controller', `${Math.ceil(recommendedPanelW / SYSTEM_VOLTAGE)}A MPPT`, '1 Unit']
        ],
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
        margin: { left: 14, right: 14 }
      });

      const recTableEndY = (doc as any).lastAutoTable.finalY;

      // Selected Hardware
      if (selectedHardware.length > 0) {
        doc.setFontSize(14);
        doc.text('3. Selected Hardware (Marketplace)', 14, recTableEndY + 15);
        
        autoTable(doc, {
          startY: recTableEndY + 20,
          head: [['Category', 'Product Name', 'Specs/Rating', 'Qty', 'Unit Price', 'Subtotal']],
          body: selectedHardware.map(p => [
            p.subCategory,
            p.name,
            p.selectedRating,
            p.quantity,
            p.selectedPrice.toLocaleString(),
            (p.selectedPrice * p.quantity).toLocaleString()
          ]),
          theme: 'striped',
          headStyles: { fillColor: [0, 0, 0] },
          margin: { left: 14, right: 14 }
        });
      }

      const hardwareTableEndY = selectedHardware.length > 0 ? (doc as any).lastAutoTable.finalY : recTableEndY;

      // Summary
      doc.setFontSize(16);
      doc.text('Summary', 14, hardwareTableEndY + 20);
      
      doc.setFontSize(12);
      doc.text(`Total Daily Energy Consumption: ${totalDailyLoadWh.toLocaleString()} Wh`, 14, hardwareTableEndY + 30);
      doc.text(`Total Peak Power Requirement: ${totalPeakLoadW.toLocaleString()} W`, 14, hardwareTableEndY + 38);
      
      if (selectedHardware.length > 0) {
        const hardwareCost = totalPriceEstimate;
        const expertFee = Math.round(hardwareCost * 0.15);
        const totalProjectCost = hardwareCost + expertFee;

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Hardware Component Costs: KSh ${hardwareCost.toLocaleString()}`, 14, hardwareTableEndY + 45);
        doc.text(`Expert Installation & Commissioning (15%): KSh ${expertFee.toLocaleString()}`, 14, hardwareTableEndY + 53);
        
        doc.setFontSize(14);
        doc.setTextColor(16, 185, 129);
        doc.text(`TOTAL ESTIMATED PROJECT OUTLAY: KSh ${totalProjectCost.toLocaleString()}`, 14, hardwareTableEndY + 65);
      }
      
      // Footer
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text('This document provides a technical estimate based on user-provided load requirements.', 14, 280);
      doc.text('Final system design should be verified by a Wash Pivot certified engineer.', 14, 285);

      doc.save(`Solar-Kit-${kitName.replace(/\s+/g, '-')}-${date.replace(/\//g, '-')}.pdf`);
      toast.success("Solar Kit document generated successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate document.");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveKit = async () => {
    if (!user) {
      toast.error("Please sign in to save your custom kit.");
      return;
    }

    if (loadItems.length === 0) {
      toast.error("Please add items to your kit before saving.");
      return;
    }

    const hardwareCost = totalPriceEstimate;
    const expertFee = Math.round(hardwareCost * 0.15);
    const totalProjectCost = hardwareCost + expertFee;

    setIsSaving(true);
    try {
      await addDoc(collection(db, 'solar_kits'), {
        userId: user.uid,
        kitName,
        loadRequirements: loadItems.map(({ id, icon, ...rest }) => rest),
        selectedHardware: selectedHardware.map(p => ({ 
          id: p.id, 
          name: p.name, 
          rating: p.selectedRating,
          price: p.selectedPrice, 
          subCategory: p.subCategory,
          quantity: p.quantity
        })),
        totalDailyLoadWh,
        totalPeakLoadW,
        totalPriceEstimate,
        expertFee,
        totalProjectCost,
        recommendations: {
          panelW: recommendedPanelW,
          batteryWh: recommendedBatteryWh,
          inverterW: recommendedInverterW
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast.success("Solar Kit saved to your profile!");
      setStep(4);
    } catch (error) {
      console.error("Error saving kit:", error);
      toast.error("Failed to save kit.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border border-black/5 rounded-[2.5rem] overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-8 bg-stone-50 border-b border-black/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-emerald-600 mb-2">
              <Sun size={20} />
              <span className="text-xs font-bold uppercase tracking-widest">Solar Kit Builder</span>
            </div>
            <input 
              type="text" 
              value={kitName}
              onChange={(e) => setKitName(e.target.value)}
              className="text-3xl font-bold tracking-tighter bg-transparent border-none p-0 focus:ring-0 w-full"
              placeholder="Enter Kit Name..."
            />
          </div>
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4].map((s) => (
              <div 
                key={s}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                  step === s ? 'bg-black text-white scale-110' : 'bg-black/5 text-black/20'
                }`}
              >
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-8">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div>
                <h3 className="text-xl font-bold mb-2">Step 1: Define Your Load</h3>
                <p className="text-black/50 text-sm">Add the appliances you plan to power with your solar system.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {PRESET_APPLIANCES.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => addAppliance(preset)}
                    className="p-4 bg-stone-50 border border-black/5 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/30 transition-all flex flex-col items-center text-center group"
                  >
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                      <preset.icon size={20} className="text-emerald-600" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-tight">{preset.name}</span>
                    <span className="text-[10px] text-black/40">{preset.wattage}W</span>
                  </button>
                ))}
                <button
                  onClick={() => addAppliance()}
                  className="p-4 bg-black text-white rounded-2xl hover:bg-emerald-600 transition-all flex flex-col items-center justify-center text-center group"
                >
                  <Plus size={20} className="mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Custom</span>
                </button>
              </div>

              <div className="space-y-4">
                {loadItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-widest text-black/40 border-b border-black/5">
                          <th className="pb-4 font-bold">Appliance</th>
                          <th className="pb-4 font-bold">Qty</th>
                          <th className="pb-4 font-bold">Wattage (W)</th>
                          <th className="pb-4 font-bold">Hours/Day</th>
                          <th className="pb-4 font-bold text-right">Daily Load</th>
                          <th className="pb-4"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5">
                        {loadItems.map((item) => (
                          <tr key={item.id} className="group">
                            <td className="py-4">
                              <input 
                                type="text"
                                value={item.name}
                                onChange={(e) => updateAppliance(item.id, { name: e.target.value })}
                                className="bg-transparent border-none p-0 focus:ring-0 font-bold text-sm w-full"
                              />
                            </td>
                            <td className="py-4">
                              <input 
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateAppliance(item.id, { quantity: parseInt(e.target.value) || 0 })}
                                className="w-16 bg-stone-50 border border-black/5 rounded-lg px-2 py-1 text-sm focus:border-emerald-500 outline-none"
                              />
                            </td>
                            <td className="py-4">
                              <input 
                                type="number"
                                value={item.wattage}
                                onChange={(e) => updateAppliance(item.id, { wattage: parseInt(e.target.value) || 0 })}
                                className="w-20 bg-stone-50 border border-black/5 rounded-lg px-2 py-1 text-sm focus:border-emerald-500 outline-none"
                              />
                            </td>
                            <td className="py-4">
                              <input 
                                type="number"
                                value={item.hoursPerDay}
                                onChange={(e) => updateAppliance(item.id, { hoursPerDay: parseFloat(e.target.value) || 0 })}
                                className="w-16 bg-stone-50 border border-black/5 rounded-lg px-2 py-1 text-sm focus:border-emerald-500 outline-none"
                              />
                            </td>
                            <td className="py-4 text-right font-bold text-sm">
                              {(item.wattage * item.quantity * item.hoursPerDay).toLocaleString()} Wh
                            </td>
                            <td className="py-4 text-right">
                              <button 
                                onClick={() => removeAppliance(item.id)}
                                className="p-2 text-black/20 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-20 text-center bg-stone-50 rounded-3xl border border-dashed border-black/10">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <Zap className="text-black/10" size={32} />
                    </div>
                    <p className="text-black/40 text-sm">No appliances added yet. Use the presets above to start.</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-8 border-t border-black/5">
                <div className="flex items-center space-x-6">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-black/40 block mb-1">Total Daily Load</span>
                    <span className="text-2xl font-bold">{totalDailyLoadWh.toLocaleString()} Wh</span>
                  </div>
                  <div className="w-px h-10 bg-black/5" />
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-black/40 block mb-1">Peak Load</span>
                    <span className="text-2xl font-bold">{totalPeakLoadW.toLocaleString()} W</span>
                  </div>
                </div>
                <button
                  onClick={() => setStep(2)}
                  disabled={loadItems.length === 0}
                  className="px-8 py-4 bg-black text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  <span>Next Step</span>
                  <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div>
                <h3 className="text-xl font-bold mb-2">Step 2: System Configuration</h3>
                <p className="text-black/50 text-sm">Based on your load, here is the recommended solar kit configuration.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-stone-50 border border-black/5 rounded-3xl space-y-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <Sun className="text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-bold">Solar Panels</h4>
                    <p className="text-xs text-black/40 mb-4">Generates energy from sunlight</p>
                    <div className="text-2xl font-bold text-emerald-600">{recommendedPanelW}W</div>
                    <p className="text-[10px] text-black/40 mt-1">Total capacity required</p>
                  </div>
                </div>

                <div className="p-6 bg-stone-50 border border-black/5 rounded-3xl space-y-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <Battery className="text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold">Battery Bank</h4>
                    <p className="text-xs text-black/40 mb-4">Stores energy for night use</p>
                    <div className="text-2xl font-bold text-blue-600">{recommendedBatteryWh}Wh</div>
                    <p className="text-[10px] text-black/40 mt-1">Total capacity required</p>
                  </div>
                </div>

                <div className="p-6 bg-stone-50 border border-black/5 rounded-3xl space-y-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <Settings className="text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-bold">Inverter</h4>
                    <p className="text-xs text-black/40 mb-4">Converts DC to AC power</p>
                    <div className="text-2xl font-bold text-orange-600">{recommendedInverterW}W</div>
                    <p className="text-[10px] text-black/40 mt-1">Pure Sine Wave recommended</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-start space-x-4">
                <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0">
                  <Info size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-900 mb-1">Technical Insight</h4>
                  <p className="text-sm text-emerald-800/70 leading-relaxed">
                    This configuration assumes an average of {PEAK_SUN_HOURS} peak sun hours per day and a system efficiency of {SYSTEM_EFFICIENCY * 100}%. 
                    The battery bank is sized for 1.5 days of autonomy with a {BATTERY_DOD * 100}% depth of discharge.
                  </p>
                </div>
              </div>

      <div className="flex justify-between items-center pt-8 border-t border-black/5">
        <button
          onClick={() => setStep(1)}
          className="px-8 py-4 bg-stone-100 text-black font-bold rounded-2xl hover:bg-stone-200 transition-all flex items-center space-x-2"
        >
          <ChevronLeft size={20} />
          <span>Back</span>
        </button>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={autoApportionHardware}
            disabled={isApportioning || marketplaceProducts.length === 0}
            className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-500 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            {isApportioning ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
            <span>Auto-Select Hardware</span>
          </button>
          <button
            onClick={saveKit}
            disabled={isSaving}
            className="px-8 py-4 bg-white border border-black/10 text-black font-bold rounded-2xl hover:bg-stone-50 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            <span>Save Kit</span>
          </button>
          <button
            onClick={() => setStep(3)}
            className="px-8 py-4 bg-black text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all flex items-center space-x-2"
          >
            <span>Select Hardware</span>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold mb-2">Step 3: Hardware Selection</h3>
                  <p className="text-black/50 text-sm">Pick actual products from our marketplace to complete your kit.</p>
                </div>
                <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest block">Estimated Total</span>
                  <span className="text-xl font-bold text-emerald-600">KSh {totalPriceEstimate.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Selected Items List */}
                <div className="lg:col-span-1 space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-black/40">Your Selection</h4>
                  <div className="space-y-3">
                    {selectedHardware.length === 0 && (
                      <div className="p-6 bg-stone-50 border border-dashed border-black/10 rounded-2xl text-center">
                        <p className="text-xs text-black/30">No hardware selected yet.</p>
                      </div>
                    )}
                    {selectedHardware.map((product, idx) => (
                      <div key={`${product.id}-${product.selectedRating}-${idx}`} className="p-4 bg-white border border-black/5 rounded-2xl flex justify-between items-center group">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{product.subCategory}</p>
                          <p className="text-sm font-bold truncate pr-2">{product.name}</p>
                          <p className="text-[10px] text-black/40 mb-1">{product.selectedRating} • KSh {product.selectedPrice.toLocaleString()} / unit</p>
                          
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => {
                                const newSelection = [...selectedHardware];
                                if (newSelection[idx].quantity > 1) {
                                  newSelection[idx].quantity--;
                                  setSelectedHardware(newSelection);
                                }
                              }}
                              className="w-6 h-6 rounded-md border border-black/5 flex items-center justify-center text-xs hover:bg-stone-50"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold w-4 text-center">{product.quantity}</span>
                            <button 
                              onClick={() => {
                                const newSelection = [...selectedHardware];
                                newSelection[idx].quantity++;
                                setSelectedHardware(newSelection);
                              }}
                              className="w-6 h-6 rounded-md border border-black/5 flex items-center justify-center text-xs hover:bg-stone-50"
                            >
                              +
                            </button>
                            <span className="text-xs font-bold text-black/60 ml-2">
                              = KSh {(product.selectedPrice * product.quantity).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            const newSelection = [...selectedHardware];
                            newSelection.splice(idx, 1);
                            setSelectedHardware(newSelection);
                          }}
                          className="p-2 text-black/10 hover:text-red-500 transition-colors shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Marketplace Browser */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {isLoadingProducts ? (
                      <div className="col-span-full py-20 flex flex-col items-center justify-center">
                        <Loader2 className="animate-spin text-emerald-500 mb-4" size={32} />
                        <p className="text-sm text-black/40">Loading marketplace products...</p>
                      </div>
                    ) : marketplaceProducts.length > 0 ? (
                      marketplaceProducts.map((product) => {
                        const availableVariants = product.ratings || [];
                        const selectedRating = productRatings[product.id] || availableVariants[0] || '';
                        const calculatedPrice = calculatePriceForProduct(product.subCategory, selectedRating);

                        return (
                          <div 
                            key={product.id} 
                            className="p-4 bg-stone-50 border border-black/5 rounded-2xl hover:border-emerald-500 transition-all flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-black/40 bg-white px-2 py-1 rounded-md border border-black/5">
                                  {product.subCategory}
                                </span>
                                <button 
                                  onClick={() => {
                                    if (!selectedRating) {
                                      toast.error("Please select a rating first");
                                      return;
                                    }
                                    const hardwareItem: SelectedHardwareItem = {
                                      ...product,
                                      selectedRating,
                                      selectedPrice: calculatedPrice,
                                      quantity: 1
                                    };
                                    setSelectedHardware([...selectedHardware, hardwareItem]);
                                    toast.success(`Added ${product.name} (${selectedRating})`);
                                  }}
                                  className="p-2 bg-white rounded-xl shadow-sm hover:bg-emerald-500 hover:text-white transition-all outline-none"
                                >
                                  <Plus size={16} />
                                </button>
                              </div>
                              <h5 className="font-bold text-sm mb-1 line-clamp-1">{product.name}</h5>
                              
                              {availableVariants.length > 0 ? (
                                <div className="mt-2 mb-3">
                                  <label className="text-[9px] uppercase tracking-widest text-black/40 font-bold mb-1 block">Desired Rating</label>
                                  <select
                                    value={selectedRating}
                                    onChange={(e) => setProductRatings({ ...productRatings, [product.id]: e.target.value })}
                                    className="w-full text-xs bg-white border border-black/5 rounded-lg px-2 py-1.5 focus:border-emerald-500 outline-none appearance-none"
                                  >
                                    {availableVariants.map(v => (
                                      <option key={v} value={v}>{v}</option>
                                    ))}
                                  </select>
                                </div>
                              ) : (
                                <p className="text-xs text-black/40 line-clamp-1 mb-3">{product.description}</p>
                              )}
                            </div>
                            <div className="flex justify-between items-center pt-3 border-t border-black/5">
                              <span className="text-sm font-bold">KSh {calculatedPrice > 0 ? calculatedPrice.toLocaleString() : (product.price?.toLocaleString() || 'N/A')}</span>
                              <div className="flex items-center space-x-1 text-[10px] font-bold text-emerald-600">
                                <CheckCircle2 size={12} />
                                <span>In Stock</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-full py-20 text-center bg-stone-50 rounded-3xl border border-dashed border-black/10">
                        <p className="text-black/40 text-sm">No solar products found in the marketplace.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-8 border-t border-black/5">
                <button
                  onClick={() => setStep(2)}
                  className="px-8 py-4 bg-stone-100 text-black font-bold rounded-2xl hover:bg-stone-200 transition-all flex items-center space-x-2"
                >
                  <ChevronLeft size={20} />
                  <span>Back</span>
                </button>
                <div className="flex space-x-3">
                  <button
                    onClick={saveKit}
                    disabled={isSaving}
                    className="px-8 py-4 bg-white border border-black/10 text-black font-bold rounded-2xl hover:bg-stone-50 transition-all flex items-center space-x-2 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    <span>Save Kit</span>
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    className="px-8 py-4 bg-black text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all flex items-center space-x-2"
                  >
                    <span>Final Summary</span>
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="text-center py-10">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={40} />
                </div>
                <h3 className="text-3xl font-bold tracking-tighter mb-2">Kit Configuration Ready</h3>
                <p className="text-black/50">Your customised solar kit has been successfully configured with marketplace products.</p>
              </div>

              <div className="bg-stone-900 text-white p-8 rounded-[2rem] space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 pb-6 border-b border-white/10">
                  <div>
                    <h4 className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1">Unified Concept Summary</h4>
                    <h5 className="text-3xl font-bold tracking-tight">{kitName}</h5>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1">Estimated Investment</p>
                    <p className="text-4xl font-black tracking-tighter text-emerald-400">
                      KSh {(totalPriceEstimate + Math.round(totalPriceEstimate * 0.15)).toLocaleString()}
                    </p>
                    <span className="text-[10px] text-white/40 block">Includes 15% Expert Deployment Fee</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                  {/* Left Column: Tech spec details (7 of 12) */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Load Summary */}
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3">
                        <h6 className="text-[10px] uppercase tracking-widest text-[#10B981] font-bold">Load Summary</h6>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Daily Consumption</span>
                            <span className="font-bold">{totalDailyLoadWh.toLocaleString()} Wh</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Peak Power Demand</span>
                            <span className="font-bold">{totalPeakLoadW.toLocaleString()} W</span>
                          </div>
                        </div>
                      </div>

                      {/* Hardware Specs */}
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3">
                        <h6 className="text-[10px] uppercase tracking-widest text-blue-400 font-bold">Hardware Specs</h6>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Solar Array</span>
                            <span className="font-bold text-emerald-400">{recommendedPanelW}W</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Storage Capacity</span>
                            <span className="font-bold text-blue-400">{recommendedBatteryWh}Wh</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Component Log */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
                      <h6 className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Marketplace Selection List</h6>
                      <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                        {selectedHardware.map((p, idx) => (
                          <div key={`${p.id}-${idx}`} className="flex justify-between items-center text-sm py-2 border-b border-white/5 last:border-none">
                            <div className="flex-1 min-w-0 pr-4">
                              <p className="font-bold text-white truncate">{p.name}</p>
                              <p className="text-[10px] text-white/40">{p.selectedRating} • Qty {p.quantity}</p>
                            </div>
                            <span className="font-bold text-white/90 font-mono shrink-0">KSh {(p.selectedPrice * p.quantity).toLocaleString()}</span>
                          </div>
                        ))}
                        {selectedHardware.length === 0 && (
                          <p className="text-xs text-white/20 italic">No hardware selected</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Cost Breakdown & Recharts Pie Chart (5 of 12) */}
                  <div className="lg:col-span-5 bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden">
                    <div className="space-y-1">
                      <h6 className="text-[10px] uppercase tracking-[0.15em] text-stone-400 font-bold">Cost Breakdown Visualizer</h6>
                      <p className="text-xs text-white/60">Interactive analysis of kit procurement</p>
                    </div>

                    {/* RECHARTS PIE CHART */}
                    <div className="h-44 flex items-center justify-center relative my-4">
                      {totalPriceEstimate > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Hardware Components', value: totalPriceEstimate },
                                { name: 'Expert Fees (15%)', value: Math.round(totalPriceEstimate * 0.15) }
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={48}
                              outerRadius={68}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              <Cell fill="#10B981" />
                              <Cell fill="#3B82F6" />
                            </Pie>
                            <Tooltip 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  const totalVal = totalPriceEstimate + Math.round(totalPriceEstimate * 0.15);
                                  return (
                                    <div className="bg-stone-850 border border-white/10 p-3 rounded-xl shadow-xl text-xs">
                                      <p className="font-bold text-white">{data.name}</p>
                                      <p className="text-emerald-450 font-mono mt-1 font-semibold">
                                        KSh {data.value.toLocaleString()} 
                                        <span className="text-stone-400 text-[10px] ml-1.5">({((data.value / totalVal) * 100).toFixed(1)}%)</span>
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center text-xs text-white/30">Add hardware to render chart</div>
                      )}
                      
                      {totalPriceEstimate > 0 && (
                        <div className="absolute text-center select-none pointer-events-none">
                          <span className="text-[8px] uppercase tracking-wider text-stone-500 block">Expert</span>
                          <span className="text-xs font-bold text-blue-400 font-mono">15% Fee</span>
                        </div>
                      )}
                    </div>

                    {/* Financial Ledger Details */}
                    <div className="space-y-3 pt-3 border-t border-white/5">
                      <div className="flex justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                          <span className="text-white/60">Hardware costs</span>
                        </div>
                        <span className="font-bold font-mono">KSh {totalPriceEstimate.toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                          <span className="text-white/60">Expert deployment fee</span>
                        </div>
                        <span className="font-bold font-mono">KSh {Math.round(totalPriceEstimate * 0.15).toLocaleString()}</span>
                      </div>

                      <div className="h-px bg-white/10 my-2" />

                      <div className="flex justify-between items-center bg-black/35 p-3 rounded-xl border border-white/5">
                        <span className="text-xs font-bold text-white">Project Total</span>
                        <span className="text-lg font-black font-mono text-emerald-400">
                          KSh {(totalPriceEstimate + Math.round(totalPriceEstimate * 0.15)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={generatePDF}
                    disabled={isGenerating}
                    className="flex-1 py-4 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
                    <span>Download PDF Document</span>
                  </button>
                  <button
                    onClick={() => setStep(1)}
                    className="px-8 py-4 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-all"
                  >
                    Start New Build
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SolarKitBuilder;
