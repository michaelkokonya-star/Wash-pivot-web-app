import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Users, ShoppingBag, Droplets, Shield, CheckCircle2, XCircle, Search, Filter, Edit, Trash2, Plus, Eye, EyeOff, Key, Package, TrendingUp, DollarSign, PieChart, Check, X, BarChart as BarChartIcon, Activity } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, AreaChart, Area, PieChart as RePieChart, Pie, Cell 
} from 'recharts';
import EditProductModal from '../components/EditProductModal';
import AddProductModal from '../components/AddProductModal';

const AdminDashboard = () => {
  const { user, profile, resetPassword } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'products' | 'projects' | 'orders' | 'analytics'>('users');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [analyticsData, setAnalyticsData] = useState<{
    revenueByMonth: any[];
    userGrowthByMonth: any[];
    salesByProduct: any[];
    salesByRegion: any[];
  }>({ revenueByMonth: [], userGrowthByMonth: [], salesByProduct: [], salesByRegion: [] });

  const [stats, setStats] = useState({
    totalRevenue: 0,
    orderCount: 0,
    userCount: 0,
    projectCount: 0,
    categorySales: { Solar: 0, Water: 0, Sanitation: 0 }
  });

  const isAdmin = user?.email?.toLowerCase() === 'michael.kokonya@washpivot.com';

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const fetchedUsers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(fetchedUsers);
        setStats(prev => ({ ...prev, userCount: fetchedUsers.length }));
      } else if (activeTab === 'products') {
        const querySnapshot = await getDocs(collection(db, 'products'));
        setProducts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else if (activeTab === 'orders') {
        const querySnapshot = await getDocs(collection(db, 'orders'));
        const fetchedOrders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        setOrders(fetchedOrders);
        
        // Calculate stats
        const revenue = fetchedOrders.reduce((acc, order) => order.status === 'paid' ? acc + (order.totalAmount || 0) : acc, 0);
        const catSales = { Solar: 0, Water: 0, Sanitation: 0 };
        fetchedOrders.forEach(order => {
          if (order.status === 'paid' && order.items) {
            order.items.forEach((item: any) => {
              // Try to find category in item or product
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
        const querySnapshot = await getDocs(collection(db, 'projects'));
        const fetchedProjects = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProjects(fetchedProjects);
        setStats(prev => ({ ...prev, projectCount: fetchedProjects.length }));
      } else if (activeTab === 'analytics') {
        const ordersSnap = await getDocs(collection(db, 'orders'));
        const usersSnap = await getDocs(collection(db, 'users'));
        
        const fetchedOrders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        const fetchedUsers = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

        // Process Revenue by Month
        const revenueMap: { [key: string]: number } = {};
        fetchedOrders.forEach(order => {
          if (order.status === 'paid' && order.createdAt) {
            const date = order.createdAt.toDate();
            const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
            revenueMap[month] = (revenueMap[month] || 0) + (order.totalAmount || 0);
          }
        });

        const revenueData = Object.entries(revenueMap)
          .map(([name, total]) => ({ name, total }))
          .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

        // Process Sales by Product
        const productSalesMap: { [key: string]: number } = {};
        fetchedOrders.forEach(order => {
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
        fetchedOrders.forEach(order => {
          if (order.status === 'paid' && order.shippingInfo?.city) {
            const region = order.shippingInfo.city;
            regionSalesMap[region] = (regionSalesMap[region] || 0) + (order.totalAmount || 0);
          }
        });

        const regionSalesData = Object.entries(regionSalesMap)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);

        // Process User Growth by Month
        const userMap: { [key: string]: number } = {};
        fetchedUsers.forEach(u => {
          if (u.createdAt) {
            const date = u.createdAt.toDate();
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
      console.error(`Error fetching ${activeTab}:`, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      const publicRef = doc(db, 'public_profiles', userId);
      
      await updateDoc(userRef, { role: newRole });
      
      // If demoted from expert, remove public profile
      if (newRole !== 'expert') {
        await deleteDoc(publicRef);
      }
      
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setMessage({ type: 'success', text: 'User role updated successfully' });
    } catch (error) {
      console.error("Error updating role:", error);
      setMessage({ type: 'error', text: 'Failed to update user role' });
    }
  };

  const handleToggleApproval = async (userId: string, currentStatus: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { isApproved: !currentStatus });
      setUsers(users.map(u => u.id === userId ? { ...u, isApproved: !currentStatus } : u));
      setMessage({ type: 'success', text: `User ${!currentStatus ? 'approved' : 'unapproved'} successfully` });
    } catch (error) {
      console.error("Error toggling approval:", error);
      setMessage({ type: 'error', text: 'Failed to update approval status' });
    }
  };

  const handleToggleContacts = async (userId: string, currentStatus: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { showContacts: !currentStatus });
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
      await deleteDoc(doc(db, 'public_profiles', userId));
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

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { status: newStatus });
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      setMessage({ type: 'success', text: 'Order status updated successfully' });
    } catch (error) {
      console.error("Error updating order status:", error);
      setMessage({ type: 'error', text: 'Failed to update order status' });
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
      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, { 
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

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
        <div>
          <h1 className="text-5xl font-bold tracking-tighter mb-4 uppercase">ADMIN CONSOLE</h1>
          <p className="text-black/50 text-lg">Manage platform users, products, and sustainable projects.</p>
        </div>
        
        <div className="flex bg-stone-100 p-1.5 rounded-2xl">
          {[
            { id: 'users', label: 'Users', icon: Users },
            { id: 'products', label: 'Products', icon: ShoppingBag },
            { id: 'orders', label: 'Orders', icon: Package },
            { id: 'projects', label: 'Projects', icon: Droplets },
            { id: 'analytics', label: 'Analytics', icon: BarChartIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === tab.id ? 'bg-white text-black shadow-sm' : 'text-black/40 hover:text-black'
              }`}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
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
        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-50 border-b border-black/5">
                  <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">User</th>
                  <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Role</th>
                  <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Approval</th>
                  <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Visibility</th>
                  <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-4">
                        <img 
                          src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} 
                          className="w-10 h-10 rounded-xl object-cover"
                          alt=""
                        />
                        <div>
                          <p className="font-bold text-sm">{u.displayName}</p>
                          <p className="text-xs text-black/40">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        className="text-[10px] font-bold uppercase tracking-widest bg-stone-100 border-none rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-600 outline-none"
                      >
                        <option value="user">User</option>
                        <option value="expert">Expert</option>
                        <option value="admin">Admin</option>
                      </select>
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
        )}

        {activeTab === 'products' && (
          <div className="overflow-x-auto">
            <div className="p-8 border-b border-black/5 flex justify-between items-center bg-stone-50/30">
              <h3 className="font-bold">Product Catalog</h3>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all flex items-center space-x-2"
              >
                <Plus size={14} />
                <span>Add Product</span>
              </button>
            </div>
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
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-4">
                        <img 
                          src={product.imageUrl} 
                          className="w-12 h-12 rounded-xl object-cover bg-stone-100"
                          alt=""
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
                          onClick={() => handleEditProduct(product)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
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
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                        className={`text-[10px] font-bold uppercase tracking-widest border-none rounded-lg px-3 py-1.5 outline-none ${
                          order.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                          order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          order.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-stone-200 text-black/40'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="failed">Failed</option>
                      </select>
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
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-4">
                        <img 
                          src={project.imageUrl} 
                          className="w-12 h-12 rounded-xl object-cover bg-stone-100"
                          alt=""
                        />
                        <div>
                          <p className="font-bold text-sm">{project.title}</p>
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
                        project.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-stone-200 text-black/40'
                      }`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-2">
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
                              await deleteDoc(doc(db, 'projects', project.id));
                              fetchData();
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
                    <BarChart data={analyticsData.salesByProduct} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 600, fill: '#141414' }}
                        width={100}
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
                        formatter={(value: any) => `KSh ${value.toLocaleString()}`}
                      />
                      <Bar dataKey="total" fill="#059669" radius={[0, 4, 4, 0]} barSize={20} />
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
                        data={analyticsData.salesByRegion}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {analyticsData.salesByRegion.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#059669', '#2563eb', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          borderRadius: '16px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          padding: '12px'
                        }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                        formatter={(value: any) => `KSh ${value.toLocaleString()}`}
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
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={fetchData} 
      />
    </div>
  );
};

export default AdminDashboard;

