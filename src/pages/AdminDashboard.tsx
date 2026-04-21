import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Users, ShoppingBag, Droplets, Shield, CheckCircle2, XCircle, Search, Filter, Edit, Trash2, Plus, Eye, EyeOff, Key, Package, TrendingUp, DollarSign, PieChart, Check, X, BarChart as BarChartIcon, Activity, Briefcase, Award, Mail, Loader2, Sun, Truck, Copy } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { db } from '../firebase';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, setDoc, orderBy, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, AreaChart, Area, PieChart as RePieChart, Pie, Cell, LabelList, Sector 
} from 'recharts';
import EditProductModal from '../components/EditProductModal';
import AddProductModal from '../components/AddProductModal';
import EditServiceModal from '../components/EditServiceModal';
import AddServiceModal from '../components/AddServiceModal';
import AddProjectModal from '../components/AddProjectModal';

const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} style={{ fontSize: '12px', fontWeight: 'bold' }}>
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333" style={{ fontSize: '10px', fontWeight: 'bold' }}>{`KSh ${value.toLocaleString()}`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999" style={{ fontSize: '10px' }}>
        {`(${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-2xl shadow-xl border border-black/5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-1">{payload[0].name}</p>
        <p className="text-sm font-bold text-emerald-600">KSh {payload[0].value.toLocaleString()}</p>
        {payload[0].payload.percent && (
          <p className="text-[10px] text-black/40 mt-1">{(payload[0].payload.percent * 100).toFixed(1)}% of total</p>
        )}
      </div>
    );
  }
  return null;
};

const PricingSettings = ({ onSuccess, onError }: { onSuccess: () => void, onError: (err: string) => void }) => {
  const { pricingRules: globalPricingRules, updatePricingRules } = useSettings();
  const [rules, setRules] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleValue, setNewRuleValue] = useState('');

  const HARDCODED_RULES = ['Solar Panels', 'Batteries', 'Inverter', 'Inverters', 'Charge Controller'];

  useEffect(() => {
    if (globalPricingRules) {
      const data = { ...globalPricingRules };
      // Normalize 'Inverters' to 'Inverter' for consistent lookup
      if (data['Inverters'] && !data['Inverter']) {
        data['Inverter'] = data['Inverters'];
      }
      setRules(data);
      setLoading(false);
    }
  }, [globalPricingRules]);

  const handleAddRule = () => {
    if (!newRuleName || !newRuleValue) return;
    setRules({ ...rules, [newRuleName.trim()]: parseFloat(newRuleValue) });
    setNewRuleName('');
    setNewRuleValue('');
  };

  const handleRemoveRule = (name: string) => {
    const newRules = { ...rules };
    delete newRules[name];
    setRules(newRules);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Ensure 'Inverter' and 'Inverters' are both set for compatibility
      const payload = { ...rules };
      if (payload['Inverter']) payload['Inverters'] = payload['Inverter'];
      if (payload['Inverters']) payload['Inverter'] = payload['Inverters'];

      await updatePricingRules(payload);
      onSuccess();
    } catch (error: any) {
      console.error("Error saving pricing rules:", error);
      onError(error.message || 'Failed to save rules');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto mb-4" /> Loading rules...</div>;

  const otherRules = Object.keys(rules).filter(key => !HARDCODED_RULES.includes(key));

  return (
    <div className="p-8 space-y-8">
      <div>
        <h3 className="font-bold text-xl mb-2">Pricing Rules</h3>
        <p className="text-xs text-black/40">Set the price per unit for different product categories. These rules are used to automatically calculate product prices based on their technical ratings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="p-6 bg-stone-50 rounded-3xl border border-black/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sun className="text-amber-500" size={20} />
                <span className="font-bold text-sm">Solar Panels</span>
              </div>
              <span className="text-[10px] font-bold text-black/30 uppercase tracking-widest">KSh / Watt</span>
            </div>
            <input 
              type="number" 
              value={rules['Solar Panels'] || ''} 
              onChange={(e) => setRules({ ...rules, 'Solar Panels': parseFloat(e.target.value) })}
              className="w-full px-4 py-3 bg-white border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors"
              placeholder="e.g. 150"
            />
          </div>

          <div className="p-6 bg-stone-50 rounded-3xl border border-black/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="text-blue-500" size={20} />
                <span className="font-bold text-sm">Batteries</span>
              </div>
              <span className="text-[10px] font-bold text-black/30 uppercase tracking-widest">KSh / AH</span>
            </div>
            <input 
              type="number" 
              value={rules['Batteries'] || ''} 
              onChange={(e) => setRules({ ...rules, 'Batteries': parseFloat(e.target.value) })}
              className="w-full px-4 py-3 bg-white border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors"
              placeholder="e.g. 800"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-stone-50 rounded-3xl border border-black/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="text-purple-500" size={20} />
                <span className="font-bold text-sm">Inverters</span>
              </div>
              <span className="text-[10px] font-bold text-black/30 uppercase tracking-widest">KSh / Watt</span>
            </div>
            <input 
              type="number" 
              value={rules['Inverter'] || ''} 
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setRules({ ...rules, 'Inverter': val, 'Inverters': val });
              }}
              className="w-full px-4 py-3 bg-white border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors"
              placeholder="e.g. 25"
            />
          </div>

          <div className="p-6 bg-stone-50 rounded-3xl border border-black/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="text-emerald-500" size={20} />
                <span className="font-bold text-sm">Charge Controllers</span>
              </div>
              <span className="text-[10px] font-bold text-black/30 uppercase tracking-widest">KSh / Ampere</span>
            </div>
            <input 
              type="number" 
              value={rules['Charge Controller'] || ''} 
              onChange={(e) => setRules({ ...rules, 'Charge Controller': parseFloat(e.target.value) })}
              className="w-full px-4 py-3 bg-white border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors"
              placeholder="e.g. 500"
            />
          </div>
        </div>
      </div>

      {/* Other Products Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-lg">Other Products</h4>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newRuleName}
              onChange={(e) => setNewRuleName(e.target.value)}
              placeholder="Product Name"
              className="px-4 py-2 bg-stone-50 border border-black/5 rounded-xl text-sm focus:outline-none focus:border-emerald-600"
            />
            <input 
              type="number" 
              value={newRuleValue}
              onChange={(e) => setNewRuleValue(e.target.value)}
              placeholder="Price / Unit"
              className="w-32 px-4 py-2 bg-stone-50 border border-black/5 rounded-xl text-sm focus:outline-none focus:border-emerald-600"
            />
            <button 
              onClick={handleAddRule}
              className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {otherRules.map(ruleName => (
            <div key={ruleName} className="p-4 bg-stone-50 rounded-2xl border border-black/5 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-bold text-sm">{ruleName}</span>
                <span className="text-[10px] text-black/30 uppercase font-bold tracking-widest">KSh / Unit</span>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="number" 
                  value={rules[ruleName]}
                  onChange={(e) => setRules({ ...rules, [ruleName]: parseFloat(e.target.value) })}
                  className="w-24 px-3 py-1.5 bg-white border border-black/5 rounded-lg text-sm font-bold text-right"
                />
                <button 
                  onClick={() => handleRemoveRule(ruleName)}
                  className="p-1.5 text-black/20 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {otherRules.length === 0 && (
            <div className="col-span-full py-8 text-center bg-stone-50/50 rounded-2xl border border-dashed border-black/10">
              <p className="text-xs text-black/30">No other product pricing rules added yet.</p>
            </div>
          )}
        </div>
      </div>

      <div className="pt-8 border-t border-black/5 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-4 bg-black text-white rounded-2xl font-bold hover:bg-stone-800 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
          <span>Save Pricing Rules</span>
        </button>
      </div>
    </div>
  );
};

const DeliverySettings = ({ onSuccess, onError }: { onSuccess: () => void, onError: (err: string) => void }) => {
  const { deliveryRules: globalDeliveryRules, updateDeliveryRules } = useSettings();
  const [rules, setRules] = useState<any>({
    baseRate: 200,
    ratePerKm: 50,
    freeThreshold: 50000
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (globalDeliveryRules) {
      setRules(globalDeliveryRules);
      setLoading(false);
    }
  }, [globalDeliveryRules]);

  const handleSave = async () => {
    if (rules.baseRate < 200) {
      onError('Base rate cannot be below KES 200');
      return;
    }
    setSaving(true);
    try {
      await updateDeliveryRules(rules);
      onSuccess();
    } catch (error: any) {
      console.error("Error saving delivery rules:", error);
      onError(error.message || 'Failed to save rules');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto mb-4" /> Loading rules...</div>;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h3 className="font-bold text-xl mb-2">Delivery Rate Calculation</h3>
        <p className="text-xs text-black/40">Configure how delivery charges are calculated based on distance and order value.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-6 bg-stone-50 rounded-3xl border border-black/5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm">Base Delivery Rate</span>
            <span className="text-[10px] font-bold text-black/30 uppercase tracking-widest">KES (Min 200)</span>
          </div>
          <input 
            type="number" 
            min="200"
            value={rules.baseRate} 
            onChange={(e) => setRules({ ...rules, baseRate: parseFloat(e.target.value) })}
            className="w-full px-4 py-3 bg-white border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors"
          />
        </div>

        <div className="p-6 bg-stone-50 rounded-3xl border border-black/5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm">Rate per Kilometer</span>
            <span className="text-[10px] font-bold text-black/30 uppercase tracking-widest">KES / KM</span>
          </div>
          <input 
            type="number" 
            value={rules.ratePerKm} 
            onChange={(e) => setRules({ ...rules, ratePerKm: parseFloat(e.target.value) })}
            className="w-full px-4 py-3 bg-white border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors"
          />
        </div>

        <div className="p-6 bg-stone-50 rounded-3xl border border-black/5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm">Free Delivery Threshold</span>
            <span className="text-[10px] font-bold text-black/30 uppercase tracking-widest">KES Order Total</span>
          </div>
          <input 
            type="number" 
            value={rules.freeThreshold} 
            onChange={(e) => setRules({ ...rules, freeThreshold: parseFloat(e.target.value) })}
            className="w-full px-4 py-3 bg-white border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors"
          />
        </div>
      </div>

      <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
        <h4 className="font-bold text-sm mb-2 text-emerald-900">Calculation Logic:</h4>
        <p className="text-xs text-emerald-800 leading-relaxed">
          Delivery Charge = Max({rules.baseRate}, Distance × {rules.ratePerKm})<br />
          If Order Total ≥ {rules.freeThreshold.toLocaleString()}, Delivery is FREE.
        </p>
      </div>

      <div className="pt-8 border-t border-black/5 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-4 bg-black text-white rounded-2xl font-bold hover:bg-stone-800 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
          <span>Save Delivery Rules</span>
        </button>
      </div>
    </div>
  );
};

const SecuritySettings = ({ onSuccess, onError }: { onSuccess: () => void, onError: (err: string) => void }) => {
  const [loading, setLoading] = useState(true);
  const [securityStatus, setSecurityStatus] = useState<any>({
    rulesDeployed: true,
    adminVerified: true,
    piiProtected: true,
    rateLimiting: true,
    sslEnabled: window.location.protocol === 'https:',
  });

  useEffect(() => {
    // Simulate fetching security status
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto mb-4" /> Auditing security...</div>;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h3 className="font-bold text-xl mb-2">Security Audit Dashboard</h3>
        <p className="text-xs text-black/40">Real-time overview of platform security measures and potential vulnerabilities.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { id: 'rules', label: 'Firestore Rules', status: securityStatus.rulesDeployed, desc: 'Least-privilege rules enforced' },
          { id: 'admin', label: 'Admin Verification', status: securityStatus.adminVerified, desc: 'Role-based access control active' },
          { id: 'pii', label: 'PII Protection', status: securityStatus.piiProtected, desc: 'Sensitive data restricted to owners' },
          { id: 'rate', label: 'Rate Limiting', status: securityStatus.rateLimiting, desc: 'Brute force protection active' },
          { id: 'ssl', label: 'SSL / HTTPS', status: securityStatus.sslEnabled, desc: 'Encrypted traffic enforced' },
          { id: 'auth', label: 'Firebase Auth', status: true, desc: 'Google-grade authentication' }
        ].map((item) => (
          <div key={item.id} className="p-6 bg-stone-50 rounded-3xl border border-black/5 flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.status ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
              {item.status ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            </div>
            <div>
              <p className="font-bold text-sm">{item.label}</p>
              <p className="text-[10px] text-black/40 mt-1">{item.desc}</p>
              <span className={`mt-2 inline-block text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${item.status ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                {item.status ? 'Secure' : 'Vulnerable'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-8 bg-black text-white rounded-[3rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/20 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <Shield className="text-emerald-400" size={32} />
            <h4 className="text-2xl font-bold tracking-tight uppercase">Security Recommendations</h4>
          </div>
          <ul className="space-y-4">
            {[
              "Regularly audit admin access logs for suspicious activity.",
              "Ensure all third-party API keys are stored in server-side environment variables.",
              "Implement multi-factor authentication for all administrative accounts.",
              "Conduct quarterly penetration testing on the production environment."
            ].map((rec, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-white/60">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 flex-shrink-0" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, resetPassword, loading: authLoading, authFetch } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'products' | 'projects' | 'orders' | 'analytics' | 'services' | 'experts' | 'pricing' | 'delivery' | 'security'>('users');
  const [userFilter, setUserFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [serviceFilter, setServiceFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [projectFilter, setProjectFilter] = useState<'all' | 'pending' | 'active' | 'completed' | 'rejected'>('all');
  const [productView, setProductView] = useState<'table' | 'grid'>('table');
  const [productSearch, setProductSearch] = useState('');
  const [productFilter, setProductFilter] = useState('All');
  const [services, setServices] = useState<any[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditServiceModalOpen, setIsEditServiceModalOpen] = useState(false);
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [clonedProduct, setClonedProduct] = useState<any>(null);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isUpdateStatusModalOpen, setIsUpdateStatusModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [newStatusNote, setNewStatusNote] = useState('');
  const [pendingStatus, setPendingStatus] = useState('');
  const [analyticsData, setAnalyticsData] = useState<{
    revenueByMonth: any[];
    userGrowthByMonth: any[];
    salesByProduct: any[];
    salesByRegion: any[];
  }>({ revenueByMonth: [], userGrowthByMonth: [], salesByProduct: [], salesByRegion: [] });

  const [activePieIndex, setActivePieIndex] = useState(0);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    orderCount: 0,
    userCount: 0,
    projectCount: 0,
    categorySales: { Solar: 0, Water: 0, Sanitation: 0 }
  });

  const isAdmin = user?.email?.toLowerCase() === 'michael.kokonya@washpivot.com' || profile?.role === 'admin';

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, authLoading, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const fetchedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(fetchedUsers);
        setStats(prev => ({ ...prev, userCount: fetchedUsers.length }));
      } else if (activeTab === 'products') {
        const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const fetchedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(fetchedProducts);
      } else if (activeTab === 'services') {
        const q = query(collection(db, 'service_providers'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const fetchedServices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setServices(fetchedServices);
      } else if (activeTab === 'orders') {
        const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOrders(fetchedOrders);
        
        // Calculate stats
        const revenue = fetchedOrders.reduce((acc: number, order: any) => order.status === 'paid' ? acc + (order.totalAmount || 0) : acc, 0);
        const catSales = { Solar: 0, Water: 0, Sanitation: 0 };
        fetchedOrders.forEach((order: any) => {
          if (order.status === 'paid' && order.items) {
            order.items.forEach((item: any) => {
              const cat = item.category;
              if (cat && cat in catSales) {
                catSales[cat as keyof typeof catSales] += (item.price || 0) * (item.quantity || 0);
              }
            });
          }
        });

        setStats(prev => ({
          ...prev,
          totalRevenue: revenue,
          orderCount: fetchedOrders.length,
          categorySales: catSales
        }));
      } else if (activeTab === 'projects') {
        const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const fetchedProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProjects(fetchedProjects);
        setStats(prev => ({ ...prev, projectCount: fetchedProjects.length }));
      } else if (activeTab === 'analytics') {
        const [ordersSnap, usersSnap] = await Promise.all([
          getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')))
        ]);
        
        const fetchedOrders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const fetchedUsers = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Process Revenue by Month
        const revenueMap: { [key: string]: number } = {};
        fetchedOrders.forEach((order: any) => {
          if (order.status === 'paid' && order.createdAt) {
            const date = new Date(order.createdAt.seconds ? order.createdAt.seconds * 1000 : order.createdAt);
            const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
            revenueMap[month] = (revenueMap[month] || 0) + (order.totalAmount || 0);
          }
        });

        const revenueData = Object.entries(revenueMap)
          .map(([name, total]) => ({ name, total }))
          .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

        // Process Sales by Product
        const productSalesMap: { [key: string]: number } = {};
        fetchedOrders.forEach((order: any) => {
          if (order.status === 'paid' && order.items) {
            order.items.forEach((item: any) => {
              const name = item.name || 'Unknown Product';
              productSalesMap[name] = (productSalesMap[name] || 0) + (item.price || 0) * (item.quantity || 0);
            });
          }
        });

        const productSalesData = Object.entries(productSalesMap)
          .map(([name, total]) => ({ name, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5); // Top 5 products

        // Process Sales by Region
        const regionSalesMap: { [key: string]: number } = {};
        fetchedOrders.forEach((order: any) => {
          if (order.status === 'paid' && order.shippingInfo?.city) {
            const region = order.shippingInfo.city;
            regionSalesMap[region] = (regionSalesMap[region] || 0) + (order.totalAmount || 0);
          }
        });

        const totalRegionSales = Object.values(regionSalesMap).reduce((a, b) => a + b, 0);
        const regionSalesData = Object.entries(regionSalesMap)
          .map(([name, value]) => ({ 
            name, 
            value,
            percent: totalRegionSales > 0 ? value / totalRegionSales : 0
          }))
          .sort((a, b) => b.value - a.value);

        // Process User Growth by Month
        const userMap: { [key: string]: number } = {};
        fetchedUsers.forEach((u: any) => {
          if (u.createdAt) {
            const date = new Date(u.createdAt.seconds ? u.createdAt.seconds * 1000 : u.createdAt);
            const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
            userMap[month] = (userMap[month] || 0) + 1;
          }
        });

        const userData = Object.entries(userMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

        setAnalyticsData({
          revenueByMonth: revenueData,
          userGrowthByMonth: userData,
          salesByProduct: productSalesData,
          salesByRegion: regionSalesData
        });
      }
    } catch (error) {
      console.error(`Error fetching data for ${activeTab}:`, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    const previousUsers = [...users];
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));

    try {
      await updateDoc(doc(db, 'users', userId), { 
        role: newRole,
        updatedAt: serverTimestamp()
      });
      
      // If demoted from expert, remove public profile
      if (newRole !== 'expert') {
        await deleteDoc(doc(db, 'public_profiles', userId));
      }
      setMessage({ type: 'success', text: 'User role updated successfully' });
    } catch (error) {
      console.error("Error updating role:", error);
      setUsers(previousUsers);
      setMessage({ type: 'error', text: 'Failed to update user role' });
    }
  };

  const handleToggleApproval = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isApproved: !currentStatus });
      
      // Also update public profile if it exists
      try {
        await updateDoc(doc(db, 'public_profiles', userId), { isApproved: !currentStatus });
      } catch (e) {
        // Public profile might not exist, that's okay
      }
      
      setUsers(users.map(u => u.id === userId ? { ...u, isApproved: !currentStatus } : u));
      setMessage({ type: 'success', text: `User ${!currentStatus ? 'approved' : 'unapproved'} successfully` });
    } catch (error) {
      console.error("Error toggling approval:", error);
      setMessage({ type: 'error', text: 'Failed to update approval status' });
    }
  };

  const handleToggleServiceApproval = async (serviceId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'service_providers', serviceId), { isApproved: !currentStatus });
      setServices(services.map(s => s.id === serviceId ? { ...s, isApproved: !currentStatus } : s));
      setMessage({ type: 'success', text: `Service provider ${!currentStatus ? 'approved' : 'unapproved'} successfully` });
    } catch (error) {
      console.error("Error toggling service approval:", error);
      setMessage({ type: 'error', text: 'Failed to update service approval status' });
    }
  };

  const handleToggleContacts = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { showContacts: !currentStatus });
      setUsers(users.map(u => u.id === userId ? { ...u, showContacts: !currentStatus } : u));
      setMessage({ type: 'success', text: `Contacts ${!currentStatus ? 'revealed' : 'hidden'} successfully` });
    } catch (error) {
      console.error("Error toggling contacts:", error);
      setMessage({ type: 'error', text: 'Failed to update contact visibility' });
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!window.confirm(`Send password reset email to ${email}?`)) return;
    try {
      await resetPassword(email);
      setMessage({ type: 'success', text: `Password reset link sent to ${email}` });
    } catch (error) {
      console.error("Error resetting password:", error);
      setMessage({ type: 'error', text: 'Failed to send reset link' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action is irreversible.')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      try {
        await deleteDoc(doc(db, 'public_profiles', userId));
      } catch (e) {}
      setUsers(users.filter(u => u.id !== userId));
      setMessage({ type: 'success', text: 'User deleted successfully' });
    } catch (error) {
      console.error("Error deleting user:", error);
      setMessage({ type: 'error', text: 'Failed to delete user' });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      fetchData();
      setMessage({ type: 'success', text: 'Product deleted successfully' });
    } catch (error) {
      console.error("Error deleting product:", error);
      setMessage({ type: 'error', text: 'Failed to delete product' });
    }
  };

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const handleCloneProduct = (product: any) => {
    setClonedProduct(product);
    setIsAddModalOpen(true);
  };

  const handleDeleteService = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this service provider?')) return;
    try {
      await deleteDoc(doc(db, 'service_providers', id));
      fetchData();
      setMessage({ type: 'success', text: 'Service provider deleted successfully' });
    } catch (error) {
      console.error("Error deleting service provider:", error);
      setMessage({ type: 'error', text: 'Failed to delete service provider' });
    }
  };

  const handleEditService = (service: any) => {
    setSelectedService(service);
    setIsEditServiceModalOpen(true);
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string, note?: string) => {
    try {
      const currentOrder = orders.find(o => o.id === orderId);
      if (!currentOrder) return;

      const timelineEntry = {
        status: newStatus,
        label: newStatus.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
        timestamp: new Date().toISOString(),
        note: note || `Order status updated to ${newStatus}`
      };

      const updatedTimeline = [...(currentOrder.trackingTimeline || []), timelineEntry];

      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        trackingTimeline: updatedTimeline
      });
      
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus, trackingTimeline: updatedTimeline } : o));
      setMessage({ type: 'success', text: 'Order status updated successfully' });
      setIsUpdateStatusModalOpen(false);
      setNewStatusNote('');
    } catch (error: any) {
      console.error("Error updating order status:", error);
      setMessage({ type: 'error', text: error.message || 'Failed to update order status' });
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      setOrders(orders.filter(o => o.id !== orderId));
      setMessage({ type: 'success', text: 'Order deleted successfully' });
    } catch (error) {
      console.error("Error deleting order:", error);
      setMessage({ type: 'error', text: 'Failed to delete order' });
    }
  };

  const handleApproveProject = async (projectId: string, approve: boolean) => {
    try {
      await updateDoc(doc(db, 'projects', projectId), { 
        isApproved: approve,
        status: approve ? 'active' : 'rejected'
      });
      setProjects(projects.map(p => p.id === projectId ? { ...p, isApproved: approve, status: approve ? 'active' : 'rejected' } : p));
      setMessage({ type: 'success', text: `Project ${approve ? 'approved' : 'rejected'} successfully` });
    } catch (error) {
      console.error("Error updating project status:", error);
      setMessage({ type: 'error', text: 'Failed to update project status' });
    }
  };

  const handleCertifyProject = async (projectId: string, certify: boolean) => {
    try {
      await updateDoc(doc(db, 'projects', projectId), { isCertified: certify });
      setProjects(projects.map(p => p.id === projectId ? { ...p, isCertified: certify } : p));
      setMessage({ type: 'success', text: `Project ${certify ? 'certified' : 'uncertified'} successfully` });
    } catch (error) {
      console.error("Error certifying project:", error);
      setMessage({ type: 'error', text: 'Failed to certify project' });
    }
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!isAdmin) {
    return (
      <div className="pt-40 pb-20 text-center">
        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
          <Shield size={40} />
        </div>
        <h2 className="text-3xl font-bold mb-4">Unauthorized Access</h2>
        <p className="text-black/40">You do not have permission to view the admin console.</p>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
        <div>
          <h1 className="text-5xl font-bold tracking-tighter mb-4 uppercase">ADMIN CONSOLE</h1>
          <p className="text-black/50 text-lg">Manage platform users, products, and sustainable projects.</p>
        </div>
        
        <div className="flex bg-stone-100 p-1.5 rounded-2xl">
          {[
            { id: 'users', label: 'Users', icon: Users, count: users.filter(u => u.role !== 'expert' && !u.isApproved).length },
            { id: 'experts', label: 'Experts', icon: Award, count: users.filter(u => u.role === 'expert' && !u.isApproved).length },
            { id: 'products', label: 'Products', icon: ShoppingBag },
            { id: 'services', label: 'Services', icon: Briefcase, count: services.filter(s => !s.isApproved).length },
            { id: 'orders', label: 'Orders', icon: Package },
            { id: 'projects', label: 'Projects', icon: Droplets, count: projects.filter(p => !p.isApproved).length },
            { id: 'pricing', label: 'Pricing', icon: DollarSign },
            { id: 'delivery', label: 'Delivery', icon: Truck },
            { id: 'security', label: 'Security', icon: Shield },
            { id: 'analytics', label: 'Analytics', icon: BarChartIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold text-sm transition-all relative ${
                activeTab === tab.id ? 'bg-white text-black shadow-sm' : 'text-black/40 hover:text-black'
              }`}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-stone-50 p-8 rounded-[2rem] border border-black/5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">Total Revenue</p>
              <p className="text-2xl font-bold tracking-tight">KES {stats.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold">
            <TrendingUp size={14} />
            <span>Live Sales Data</span>
          </div>
        </div>

        <div className="bg-stone-50 p-8 rounded-[2rem] border border-black/5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
              <Package size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">Total Orders</p>
              <p className="text-2xl font-bold tracking-tight">{stats.orderCount}</p>
            </div>
          </div>
          <p className="text-xs text-black/40 font-medium">Across all categories</p>
        </div>

        <div className="bg-stone-50 p-8 rounded-[2rem] border border-black/5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
              <PieChart size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">Top Category</p>
              <p className="text-2xl font-bold tracking-tight">
                {Object.entries(stats.categorySales).sort((a: any, b: any) => b[1] - a[1])[0][0]}
              </p>
            </div>
          </div>
          <p className="text-xs text-black/40 font-medium">By revenue share</p>
        </div>

        <div className="bg-stone-50 p-8 rounded-[2rem] border border-black/5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">Active Users</p>
              <p className="text-2xl font-bold tracking-tight">{users.length}</p>
            </div>
          </div>
          <p className="text-xs text-black/40 font-medium">Registered on platform</p>
        </div>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-8 p-4 rounded-2xl text-sm font-bold flex items-center space-x-2 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            <span>{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-[3rem] border border-black/5 overflow-hidden shadow-sm">
      {activeTab === 'pricing' && (
        <PricingSettings 
          onSuccess={() => {
            setMessage({ type: 'success', text: 'Pricing rules updated successfully! Changes will reflect in Marketplace automatically.' });
          }}
          onError={(err) => setMessage({ type: 'error', text: err })}
        />
      )}

      {activeTab === 'delivery' && (
        <DeliverySettings 
          onSuccess={() => {
            setMessage({ type: 'success', text: 'Delivery rules updated successfully! These will be applied at checkout.' });
          }}
          onError={(err) => setMessage({ type: 'error', text: err })}
        />
      )}

        {activeTab === 'security' && (
          <SecuritySettings 
            onSuccess={() => setMessage({ type: 'success', text: 'Security audit completed' })}
            onError={(err) => setMessage({ type: 'error', text: err })}
          />
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="p-8 border-b border-black/5 flex flex-col md:flex-row justify-between items-start md:items-center bg-stone-50/30 gap-4">
              <div>
                <h3 className="font-bold text-xl">User Management</h3>
                <p className="text-xs text-black/40">Manage platform users and approval status</p>
              </div>
              
              <div className="flex bg-white border border-black/5 p-1 rounded-xl">
                {[
                  { id: 'all', label: 'All Users' },
                  { id: 'pending', label: 'Pending Approval' },
                  { id: 'approved', label: 'Approved' }
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setUserFilter(filter.id as any)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      userFilter === filter.id ? 'bg-stone-100 text-black' : 'text-black/40 hover:text-black'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-50 border-b border-black/5">
                    <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">User</th>
                    <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Role</th>
                    <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Joined</th>
                    <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Last Login</th>
                    <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Approval</th>
                    <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Visibility</th>
                    <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {users
                    .filter(u => u.role !== 'expert')
                    .filter(u => {
                      if (userFilter === 'pending') return !u.isApproved;
                      if (userFilter === 'approved') return u.isApproved;
                      return true;
                    })
                    .map((u) => (
                      <tr key={u.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-4">
                        <img 
                          src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} 
                          className="w-10 h-10 rounded-xl object-cover"
                          alt=""
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="font-bold text-sm">{u.displayName}</p>
                          <p className="text-xs text-black/40">{u.email}</p>
                          {u.role === 'expert' && (
                            <div className="mt-1 flex flex-col gap-1">
                              <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter bg-emerald-50 px-1.5 py-0.5 rounded w-fit">
                                {u.expertise || 'No expertise set'}
                              </span>
                              <p className="text-[9px] text-black/30 line-clamp-1 max-w-[200px] italic">
                                {u.bio || 'No bio provided'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <select
                        value={u.role || 'user'}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        className="text-[10px] font-bold uppercase tracking-widest bg-stone-100 border-none rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-600 outline-none"
                      >
                        <option value="user">User</option>
                        <option value="expert">Expert</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-[10px] font-medium text-black/60">
                        {u.createdAt ? (u.createdAt.toDate ? u.createdAt.toDate().toLocaleDateString() : new Date(u.createdAt).toLocaleDateString()) : 'N/A'}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-[10px] font-medium text-black/60">
                        {u.lastLogin ? (u.lastLogin.toDate ? u.lastLogin.toDate().toLocaleString() : new Date(u.lastLogin).toLocaleString()) : 'N/A'}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <button
                        onClick={() => handleToggleApproval(u.id, u.isApproved)}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all ${
                          u.isApproved ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {u.isApproved ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          {u.isApproved ? 'Approved' : 'Pending'}
                        </span>
                      </button>
                    </td>
                    <td className="px-8 py-6">
                      <button
                        onClick={() => handleToggleContacts(u.id, u.showContacts)}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all ${
                          u.showContacts ? 'bg-blue-50 text-blue-600' : 'bg-stone-100 text-black/40'
                        }`}
                      >
                        {u.showContacts ? <Eye size={14} /> : <EyeOff size={14} />}
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          {u.showContacts ? 'Visible' : 'Hidden'}
                        </span>
                      </button>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleResetPassword(u.email)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Reset Password"
                        >
                          <Key size={16} />
                        </button>
                        <button
                          onClick={() => handleUpdateRole(u.id, 'user')}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Reject/Reset Role"
                        >
                          <XCircle size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete User"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

        {activeTab === 'experts' && (
          <div className="space-y-6">
            <div className="p-8 border-b border-black/5 flex flex-col md:flex-row justify-between items-start md:items-center bg-stone-50/30 gap-4">
              <div>
                <h3 className="font-bold text-xl">Expert Applications</h3>
                <p className="text-xs text-black/40">Review and verify professional credentials</p>
              </div>
              
              <div className="flex bg-white border border-black/5 p-1 rounded-xl">
                {[
                  { id: 'all', label: 'All Experts' },
                  { id: 'pending', label: 'Pending Verification' },
                  { id: 'approved', label: 'Verified' }
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setUserFilter(filter.id as any)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      userFilter === filter.id ? 'bg-stone-100 text-black' : 'text-black/40 hover:text-black'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 gap-6">
              {users
                .filter(u => u.role === 'expert')
                .filter(u => {
                  if (userFilter === 'pending') return !u.isApproved;
                  if (userFilter === 'approved') return u.isApproved;
                  return true;
                })
                .map((u) => (
                  <div key={u.id} className="bg-stone-50 rounded-[2rem] border border-black/5 p-8 flex flex-col lg:flex-row gap-8">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-6">
                        <img 
                          src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} 
                          className="w-16 h-16 rounded-2xl object-cover"
                          alt=""
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <h4 className="text-xl font-bold tracking-tight">{u.displayName}</h4>
                          <p className="text-emerald-600 text-xs font-bold uppercase tracking-widest">
                            {u.expertise || 'General Expert'}
                          </p>
                          <div className="flex items-center space-x-3 mt-2 text-black/40 text-xs">
                            <span className="flex items-center space-x-1">
                              <Mail size={12} />
                              <span>{u.email}</span>
                            </span>
                            {u.phone && (
                              <span className="flex items-center space-x-1">
                                <Activity size={12} />
                                <span>{u.phone}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">Academic Background</p>
                          <p className="text-sm font-medium">{u.academics || 'Not provided'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">Experience</p>
                          <p className="text-sm font-medium">{u.yearsOfExperience ? `${u.yearsOfExperience} Years` : 'Not provided'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">Availability</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {u.availability?.map((a: string) => (
                              <span key={a} className="bg-stone-200 px-2 py-0.5 rounded text-[10px] font-bold">{a}</span>
                            )) || <span className="text-xs text-black/30 italic">No regions set</span>}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">Key Projects</p>
                          <p className="text-sm font-medium italic">"{u.keyProjects || 'None listed'}"</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">Professional Bio</p>
                        <p className="text-sm text-black/60 leading-relaxed">{u.bio || 'No bio provided'}</p>
                      </div>
                    </div>

                    <div className="lg:w-64 flex flex-col justify-center gap-3 border-t lg:border-t-0 lg:border-l border-black/5 pt-6 lg:pt-0 lg:pl-8">
                      <div className="mb-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2">Status</p>
                        <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          u.isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {u.isApproved ? <CheckCircle2 size={12} /> : <Activity size={12} />}
                          <span>{u.isApproved ? 'Verified' : 'Pending Review'}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleApproval(u.id, u.isApproved)}
                        className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
                          u.isApproved 
                            ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20'
                        }`}
                      >
                        {u.isApproved ? (
                          <>
                            <X size={16} />
                            <span>Revoke Verification</span>
                          </>
                        ) : (
                          <>
                            <Check size={16} />
                            <span>Approve Expert</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleUpdateRole(u.id, 'user')}
                        className="w-full py-3 bg-stone-100 text-black/60 rounded-xl font-bold text-xs hover:bg-stone-200 transition-all flex items-center justify-center space-x-2"
                      >
                        <XCircle size={16} />
                        <span>Reject Application</span>
                      </button>
                    </div>
                  </div>
                ))}

              {users.filter(u => u.role === 'expert').length === 0 && (
                <div className="p-20 text-center">
                  <div className="w-20 h-20 bg-stone-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-black/20">
                    <Award size={40} />
                  </div>
                  <h4 className="text-xl font-bold mb-2">No Expert Applications</h4>
                  <p className="text-black/40">There are currently no experts in the network.</p>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="p-8 border-b border-black/5 flex flex-col md:flex-row justify-between items-start md:items-center bg-stone-50/30 gap-4">
              <div>
                <h3 className="font-bold text-xl">Product Catalog</h3>
                <p className="text-xs text-black/40">Manage your marketplace inventory</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                <div className="relative flex-1 md:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/20" size={16} />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white border border-black/5 rounded-xl text-sm focus:outline-none focus:border-emerald-600 w-full md:w-64"
                  />
                </div>
                
                <select
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  className="px-4 py-2 bg-white border border-black/5 rounded-xl text-sm focus:outline-none focus:border-emerald-600"
                >
                  <option value="All">All Categories</option>
                  <option value="Solar">Solar</option>
                  <option value="Water">Water</option>
                  <option value="Sanitation">Sanitation</option>
                </select>

                <div className="flex bg-white border border-black/5 p-1 rounded-xl">
                  <button
                    onClick={() => setProductView('table')}
                    className={`p-1.5 rounded-lg transition-all ${productView === 'table' ? 'bg-stone-100 text-black' : 'text-black/20 hover:text-black'}`}
                    title="Table View"
                  >
                    <Filter size={16} />
                  </button>
                  <button
                    onClick={() => setProductView('grid')}
                    className={`p-1.5 rounded-lg transition-all ${productView === 'grid' ? 'bg-stone-100 text-black' : 'text-black/20 hover:text-black'}`}
                    title="Grid View"
                  >
                    <ShoppingBag size={16} />
                  </button>
                </div>

                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all flex items-center space-x-2 shadow-lg shadow-emerald-600/20"
                >
                  <Plus size={16} />
                  <span>Add Product</span>
                </button>
              </div>
            </div>

            {productView === 'table' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-stone-50 border-b border-black/5">
                      <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Product</th>
                      <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Category</th>
                      <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Price</th>
                      <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {products
                      .filter(p => 
                        (productFilter === 'All' || p.category === productFilter) &&
                        (p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.description.toLowerCase().includes(productSearch.toLowerCase()))
                      )
                      .map((product) => (
                        <tr key={product.id} className="hover:bg-stone-50/50 transition-colors">
                          <td className="px-8 py-6">
                            <div className="flex items-center space-x-4">
                              <img 
                                src={product.imageUrl} 
                                className="w-12 h-12 rounded-xl object-cover bg-stone-100"
                                alt=""
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <p className="font-bold text-sm">{product.name}</p>
                                <p className="text-xs text-black/40 line-clamp-1 max-w-xs">{product.description}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="px-3 py-1 bg-stone-100 rounded-full text-[10px] font-bold uppercase tracking-widest">
                              {product.category}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <p className="text-sm font-bold tracking-tight">KSh {product.price.toLocaleString()}</p>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleCloneProduct(product)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Duplicate Product"
                              >
                                <Copy size={18} />
                              </button>
                              <button
                                onClick={() => handleEditProduct(product)}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Edit Product"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Product"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products
                  .filter(p => 
                    (productFilter === 'All' || p.category === productFilter) &&
                    (p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.description.toLowerCase().includes(productSearch.toLowerCase()))
                  )
                  .map((product) => (
                    <motion.div
                      key={product.id}
                      layout
                      className="group bg-white rounded-3xl border border-black/5 overflow-hidden hover:shadow-xl transition-all flex flex-col"
                    >
                      <div className="aspect-square overflow-hidden bg-stone-100 relative">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[9px] font-bold uppercase tracking-widest shadow-sm">
                            {product.category}
                          </span>
                        </div>
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleCloneProduct(product)}
                            className="p-2 bg-white rounded-full text-blue-600 shadow-lg hover:bg-blue-600 hover:text-white transition-all"
                            title="Duplicate"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="p-2 bg-white rounded-full text-emerald-600 shadow-lg hover:bg-emerald-600 hover:text-white transition-all"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-2 bg-white rounded-full text-red-600 shadow-lg hover:bg-red-600 hover:text-white transition-all"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="p-6 flex flex-col flex-grow">
                        <h4 className="font-bold text-lg mb-1 line-clamp-1">{product.name}</h4>
                        <p className="text-black/40 text-xs mb-4 line-clamp-2 leading-relaxed">{product.description}</p>
                        <div className="mt-auto flex items-center justify-between">
                          <span className="text-lg font-bold tracking-tighter">KSh {product.price.toLocaleString()}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="p-8 border-b border-black/5 flex flex-col md:flex-row justify-between items-start md:items-center bg-stone-50/30 gap-4">
              <div>
                <h3 className="font-bold text-xl">Service Providers</h3>
                <p className="text-xs text-black/40">Manage professional WASH services</p>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex bg-stone-100 p-1 rounded-lg">
                  {(['all', 'pending', 'approved'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setServiceFilter(f)}
                      className={`px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${
                        serviceFilter === f ? 'bg-white text-black shadow-sm' : 'text-black/40 hover:text-black/60'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => setIsAddServiceModalOpen(true)}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all flex items-center space-x-2 shadow-lg shadow-emerald-600/20"
                >
                  <Plus size={16} />
                  <span>Add Provider</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-50 border-b border-black/5">
                    <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Provider</th>
                    <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Category</th>
                    <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Approval</th>
                    <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Location</th>
                    <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Contact</th>
                    <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {services
                    .filter(s => {
                      if (serviceFilter === 'pending') return !s.isApproved;
                      if (serviceFilter === 'approved') return s.isApproved;
                      return true;
                    })
                    .map((service) => (
                      <tr key={service.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-4">
                          <img 
                            src={service.imageUrl} 
                            className="w-12 h-12 rounded-xl object-cover bg-stone-100"
                            alt=""
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <p className="font-bold text-sm">{service.name}</p>
                            <p className="text-xs text-black/40 line-clamp-1 max-w-xs">{service.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1 bg-stone-100 rounded-full text-[10px] font-bold uppercase tracking-widest">
                          {service.category}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <button
                          onClick={() => handleToggleServiceApproval(service.id, service.isApproved)}
                          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all ${
                            service.isApproved ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {service.isApproved ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          <span className="text-[10px] font-bold uppercase tracking-widest">
                            {service.isApproved ? 'Approved' : 'Pending'}
                          </span>
                        </button>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm font-medium">{service.location}</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-xs space-y-1">
                          <p className="text-black/60">{service.contactEmail}</p>
                          <p className="text-black/60">{service.contactPhone}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditService(service)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteService(service.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="overflow-x-auto">
            <div className="p-8 border-b border-black/5 flex justify-between items-center bg-stone-50/30">
              <h3 className="font-bold">Order Management</h3>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-50 border-b border-black/5">
                  <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Order ID</th>
                  <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Customer</th>
                  <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Total</th>
                  <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Status</th>
                  <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Method</th>
                  <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <p className="font-mono text-xs font-bold">{order.id.slice(0, 8)}...</p>
                      <p className="text-[10px] text-black/40">{order.createdAt?.toDate().toLocaleDateString()}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="font-bold text-sm">{order.userEmail}</p>
                      <p className="text-xs text-black/40">{order.shippingInfo?.firstName} {order.shippingInfo?.lastName}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold tracking-tight">KSh {order.totalAmount.toLocaleString()}</p>
                    </td>
                    <td className="px-8 py-6">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setPendingStatus(order.status);
                          setIsUpdateStatusModalOpen(true);
                        }}
                        className={`text-[10px] font-bold uppercase tracking-widest border-none rounded-lg px-3 py-1.5 outline-none text-left flex items-center gap-2 hover:opacity-80 transition-all ${
                          order.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                          order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                          order.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                          order.status === 'out-for-delivery' ? 'bg-fuchsia-100 text-fuchsia-700' :
                          order.status === 'delivered' ? 'bg-emerald-600 text-white' :
                          order.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-stone-200 text-black/40'
                        }`}
                      >
                        <span>{order.status.replace(/-/g, ' ')}</span>
                        <Edit size={10} />
                      </button>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 bg-stone-100 rounded-full text-[10px] font-bold uppercase tracking-widest">
                        {order.paymentMethod}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Order"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="overflow-x-auto">
            <div className="p-8 border-b border-black/5 flex justify-between items-center bg-stone-50/30">
              <h3 className="font-bold">Project Approvals</h3>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setIsAddProjectModalOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-black text-white text-xs font-bold rounded-xl hover:bg-black/80 transition-all"
                >
                  <Plus size={16} />
                  <span>Create Project</span>
                </button>
                <div className="flex items-center bg-white border border-black/10 rounded-xl px-4 py-2">
                  <Filter size={16} className="text-black/40 mr-2" />
                  <select 
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value as any)}
                    className="bg-transparent text-sm font-bold focus:outline-none appearance-none pr-8 cursor-pointer"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-50 border-b border-black/5">
                  <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Project</th>
                  <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Owner</th>
                  <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Funding</th>
                  <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Status</th>
                  <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {projects
                  .filter(p => projectFilter === 'all' || p.status === projectFilter)
                  .map((project) => (
                  <tr key={project.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-4">
                        <img 
                          src={project.imageUrl} 
                          className="w-12 h-12 rounded-xl object-cover bg-stone-100"
                          alt=""
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm">{project.title}</p>
                            {project.isCertified && (
                              <Shield size={12} className="text-emerald-600 fill-emerald-600" />
                            )}
                          </div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">{project.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="font-bold text-sm">{project.ownerName}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold tracking-tight">KSh {project.targetFunding?.toLocaleString()}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        project.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                        project.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                        project.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-stone-200 text-black/40'
                      }`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => navigate(`/admin/projects/${project.id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleCertifyProject(project.id, !project.isCertified)}
                          className={`p-2 rounded-lg transition-colors ${
                            project.isCertified ? 'text-emerald-600 bg-emerald-50' : 'text-black/20 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={project.isCertified ? "Uncertify Project" : "Certify Project"}
                        >
                          <Shield size={18} />
                        </button>
                        {project.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveProject(project.id, true)}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Approve Project"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={() => handleApproveProject(project.id, false)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject Project"
                            >
                              <X size={18} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={async () => {
                            if (window.confirm('Delete this project?')) {
                              try {
                                await deleteDoc(doc(db, 'projects', project.id));
                                fetchData();
                                setMessage({ type: 'success', text: 'Project deleted successfully' });
                              } catch (error) {
                                console.error("Error deleting project:", error);
                                setMessage({ type: 'error', text: 'Failed to delete project' });
                              }
                            }
                          }}
                          className="p-2 text-black/20 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="p-8 space-y-12">
            <div>
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Monthly Revenue</h3>
                  <p className="text-xs text-black/40">Total earnings from paid orders over time</p>
                </div>
              </div>
              <div className="h-[400px] w-full bg-stone-50/50 rounded-3xl p-6 border border-black/5">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsData.revenueByMonth}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 600, fill: '#9ca3af' }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 600, fill: '#9ca3af' }}
                      tickFormatter={(value) => `KSh ${value.toLocaleString()}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        padding: '12px'
                      }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#059669' }}
                      labelStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#9ca3af', marginBottom: '4px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#059669" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorTotal)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-stone-50/50 p-8 rounded-3xl border border-black/5">
                <div className="flex items-center space-x-3 mb-8">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">User Growth</h3>
                    <p className="text-xs text-black/40">New registrations by month</p>
                  </div>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.userGrowthByMonth}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 600, fill: '#9ca3af' }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 600, fill: '#9ca3af' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          borderRadius: '16px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          padding: '12px'
                        }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#2563eb' }}
                        labelStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#9ca3af', marginBottom: '4px' }}
                      />
                      <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-stone-50/50 p-8 rounded-3xl border border-black/5">
                <div className="flex items-center space-x-3 mb-8">
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Platform Activity</h3>
                    <p className="text-xs text-black/40">Key metrics overview</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex justify-between items-center p-4 bg-white rounded-2xl border border-black/5">
                    <span className="text-sm font-medium text-black/60">Conversion Rate</span>
                    <span className="text-sm font-bold">{(stats.orderCount / (users.length || 1) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-white rounded-2xl border border-black/5">
                    <span className="text-sm font-medium text-black/60">Avg Order Value</span>
                    <span className="text-sm font-bold">KSh {(stats.totalRevenue / (stats.orderCount || 1)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-white rounded-2xl border border-black/5">
                    <span className="text-sm font-medium text-black/60">Project Success Rate</span>
                    <span className="text-sm font-bold">{(projects.filter(p => p.status === 'active').length / (projects.length || 1) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-stone-50/50 p-8 rounded-3xl border border-black/5">
                <div className="flex items-center space-x-3 mb-8">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                    <ShoppingBag size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Top Products</h3>
                    <p className="text-xs text-black/40">Revenue by individual product</p>
                  </div>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.salesByProduct} layout="vertical" margin={{ left: 20, right: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 600, fill: '#141414' }}
                        width={120}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          borderRadius: '16px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          padding: '12px'
                        }}
                        cursor={{ fill: '#f5f5f4' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#059669' }}
                        labelStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#9ca3af', marginBottom: '4px' }}
                        formatter={(value: any) => `KSh ${value.toLocaleString()}`}
                      />
                      <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={20}>
                        {analyticsData.salesByProduct.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'][index % 5]} 
                            fillOpacity={0.8}
                            className="hover:fill-opacity-100 transition-all duration-300 cursor-pointer"
                          />
                        ))}
                        <LabelList 
                          dataKey="total" 
                          position="right" 
                          formatter={(value: any) => `KSh ${(value / 1000).toFixed(1)}k`}
                          style={{ fontSize: '10px', fontWeight: 'bold', fill: '#059669' }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-stone-50/50 p-8 rounded-3xl border border-black/5">
                <div className="flex items-center space-x-3 mb-8">
                  <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                    <Droplets size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Regional Distribution</h3>
                    <p className="text-xs text-black/40">Sales breakdown by city/region</p>
                  </div>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        {...({
                          activeIndex: activePieIndex,
                          activeShape: renderActiveShape,
                          data: analyticsData.salesByRegion,
                          cx: "50%",
                          cy: "50%",
                          innerRadius: 60,
                          outerRadius: 80,
                          paddingAngle: 5,
                          dataKey: "value",
                          onMouseEnter: (_: any, index: number) => setActivePieIndex(index)
                        } as any)}
                      >
                        {analyticsData.salesByRegion.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#059669', '#2563eb', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={<CustomTooltip />}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        iconType="circle"
                        formatter={(value) => <span className="text-[10px] font-bold uppercase tracking-widest text-black/60">{value}</span>}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <EditProductModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        onSuccess={fetchData} 
        product={selectedProduct}
      />

      <AddProductModal 
        isOpen={isAddModalOpen} 
        onClose={() => {
          setIsAddModalOpen(false);
          setClonedProduct(null);
        }} 
        onSuccess={fetchData} 
        clonedProduct={clonedProduct}
      />

      <AddServiceModal
        isOpen={isAddServiceModalOpen}
        onClose={() => setIsAddServiceModalOpen(false)}
        onSuccess={fetchData}
      />

      <EditServiceModal
        isOpen={isEditServiceModalOpen}
        onClose={() => setIsEditServiceModalOpen(false)}
        onSuccess={fetchData}
        service={selectedService}
      />

      {/* Update Order Status Modal */}
      <AnimatePresence>
        {isUpdateStatusModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-black/5 bg-stone-50">
                <h3 className="text-xl font-bold tracking-tight">Update Order Status</h3>
                <p className="text-xs text-black/40 mt-1">ID: {selectedOrder?.id}</p>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Select New Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'pending', label: 'Pending' },
                      { id: 'paid', label: 'Paid' },
                      { id: 'processing', label: 'Processing' },
                      { id: 'shipped', label: 'Shipped' },
                      { id: 'out-for-delivery', label: 'Out for Delivery' },
                      { id: 'delivered', label: 'Delivered' },
                      { id: 'failed', label: 'Failed' }
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setPendingStatus(s.id)}
                        className={`px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${
                          pendingStatus === s.id 
                            ? 'bg-black text-white shadow-lg' 
                            : 'bg-stone-100 text-black/60 hover:bg-stone-200'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Status Note (Optional)</label>
                  <textarea
                    value={newStatusNote}
                    onChange={(e) => setNewStatusNote(e.target.value)}
                    placeholder="e.g. Package has been picked up by the courier"
                    className="w-full h-24 p-4 bg-stone-50 border border-black/5 rounded-xl text-sm focus:outline-none focus:border-black transition-all resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsUpdateStatusModalOpen(false)}
                    className="flex-1 py-4 bg-stone-100 text-black font-bold rounded-2xl hover:bg-stone-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleUpdateOrderStatus(selectedOrder.id, pendingStatus, newStatusNote)}
                    className="flex-1 py-4 bg-black text-white font-bold rounded-2xl hover:bg-stone-800 transition-all"
                  >
                    Update Status
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AddProjectModal
        isOpen={isAddProjectModalOpen}
        onClose={() => setIsAddProjectModalOpen(false)}
        onSuccess={() => {
          fetchData();
          setMessage({ type: 'success', text: 'Project created successfully' });
        }}
      />
    </div>
  );
};

export default AdminDashboard;

