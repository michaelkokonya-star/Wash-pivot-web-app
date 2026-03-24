import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Users, ShoppingBag, Droplets, Shield, CheckCircle2, XCircle, Search, Filter, Edit, Trash2, Plus } from 'lucide-react';
import EditProductModal from '../components/EditProductModal';
import AddProductModal from '../components/AddProductModal';

const AdminDashboard = () => {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'products' | 'projects'>('users');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const isAdmin = user?.email?.toLowerCase() === 'michael.kokonya@washpivot.com';

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const querySnapshot = await getDocs(collection(db, 'users'));
        setUsers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else if (activeTab === 'products') {
        const querySnapshot = await getDocs(collection(db, 'products'));
        setProducts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action is irreversible.')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      await deleteDoc(doc(db, 'public_profiles', userId));
      setUsers(users.filter(u => u.id !== userId));
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      fetchData();
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  return (
    <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
        <div>
          <h1 className="text-5xl font-bold tracking-tighter mb-4">ADMIN CONSOLE</h1>
          <p className="text-black/50 text-lg">Manage platform users, products, and sustainable projects.</p>
        </div>
        
        <div className="flex bg-stone-100 p-1.5 rounded-2xl">
          {[
            { id: 'users', label: 'Users', icon: Users },
            { id: 'products', label: 'Products', icon: ShoppingBag },
            { id: 'projects', label: 'Projects', icon: Droplets }
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

      <div className="bg-white rounded-[3rem] border border-black/5 overflow-hidden shadow-sm">
        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-50 border-b border-black/5">
                  <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">User</th>
                  <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Role</th>
                  <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Status</th>
                  <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-black/40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-4">
                        <img 
                          src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                          className="w-10 h-10 rounded-xl object-cover"
                          alt=""
                        />
                        <div>
                          <p className="font-bold text-sm">{user.displayName}</p>
                          <p className="text-xs text-black/40">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                        user.role === 'expert' ? 'bg-emerald-100 text-emerald-700' : 
                        'bg-stone-100 text-black/40'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-2 text-emerald-600">
                        <CheckCircle2 size={16} />
                        <span className="text-xs font-bold">Active</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-3">
                        <select
                          value={user.role}
                          onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                          className="text-xs font-bold bg-stone-100 border-none rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-600 outline-none"
                        >
                          <option value="user">User</option>
                          <option value="expert">Expert</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
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

        {activeTab === 'projects' && (
          <div className="p-20 text-center">
            <div className="w-20 h-20 bg-stone-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Shield size={40} className="text-black/10" />
            </div>
            <h3 className="text-xl font-bold mb-2">Project Management Coming Soon</h3>
            <p className="text-black/40 max-w-sm mx-auto">We're building advanced tools to help you manage platform projects more efficiently.</p>
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
