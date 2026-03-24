import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, useAnimation, AnimatePresence } from 'motion/react';
import { ShoppingCart, Filter, Search, Sun, Droplets, ShieldCheck, ChevronLeft, ChevronRight, Check, Plus, Edit, Trash2, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import OptimizedImage from '../components/OptimizedImage';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import AddProductModal from '../components/AddProductModal';
import EditProductModal from '../components/EditProductModal';

const Marketplace = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const carouselRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const { user, profile, signIn } = useAuth();
  const { addToCart } = useCart();

  const isAdmin = user?.email?.toLowerCase() === 'michael.kokonya@washpivot.com';

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const q = filter === 'All' 
        ? collection(db, 'products') 
        : query(collection(db, 'products'), where('category', '==', filter));
      
      const querySnapshot = await getDocs(q);
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsData);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Failed to delete product.");
    }
  };

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  useEffect(() => {
    fetchProducts();
  }, [filter]);

  useEffect(() => {
    if (carouselRef.current) {
      setWidth(carouselRef.current.scrollWidth - carouselRef.current.offsetWidth);
    }
  }, [products, loading]);

  const allProducts = products;

  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = carouselRef.current.offsetWidth * 0.8;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleAddToCart = (product: any) => {
    addToCart(product);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 2000);
  };

  return (
    <div className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
      <Helmet>
        <title>WASH Marketplace | Sustainable Products & Solutions</title>
        <meta name="description" content="Browse our marketplace for certified sustainable solar energy, water treatment, and sanitation products. High-quality technology for your WASH projects." />
        <link rel="canonical" href="https://www.washpivot.com/marketplace" />
        <meta property="og:title" content="WASH Marketplace | Sustainable Products" />
        <meta property="og:description" content="Certified sustainable technology for solar, water, and sanitation projects." />
        <meta property="og:url" content="https://www.washpivot.com/marketplace" />
      </Helmet>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <h1 className="text-5xl font-bold tracking-tighter mb-2">MARKETPLACE</h1>
          <p className="text-black/50">Sustainable products for your WASH projects.</p>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
          {isAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-2 bg-emerald-600 text-white rounded-full text-sm font-bold hover:bg-emerald-700 transition-all flex items-center space-x-2 shadow-lg shadow-emerald-600/20"
            >
              <Plus size={18} />
              <span>Add Product</span>
            </button>
          )}
          <div className="flex gap-2">
            {['All', 'Solar', 'Water', 'Sanitation'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all border ${
                  filter === cat 
                    ? 'bg-black text-white border-black' 
                    : 'bg-white text-black/60 border-black/10 hover:border-black'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <AddProductModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchProducts} 
      />

      <EditProductModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        onSuccess={fetchProducts} 
        product={selectedProduct}
      />

      <div className="relative group/carousel">
        {/* Navigation Arrows - Hidden on mobile, visible on hover on desktop */}
        <button 
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 p-4 bg-white shadow-2xl rounded-full border border-black/5 opacity-0 group-hover/carousel:opacity-100 group-hover/carousel:translate-x-0 transition-all hidden md:flex items-center justify-center hover:bg-stone-50"
        >
          <ChevronLeft size={24} />
        </button>
        
        <button 
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 p-4 bg-white shadow-2xl rounded-full border border-black/5 opacity-0 group-hover/carousel:opacity-100 group-hover/carousel:translate-x-0 transition-all hidden md:flex items-center justify-center hover:bg-stone-50"
        >
          <ChevronRight size={24} />
        </button>

        <motion.div 
          ref={carouselRef}
          className="flex overflow-x-auto scrollbar-hide gap-8 pb-12 snap-x snap-mandatory cursor-grab active:cursor-grabbing"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <AnimatePresence mode="popLayout">
            {allProducts.length > 0 ? (
              allProducts.map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="min-w-[280px] sm:min-w-[320px] lg:min-w-[350px] snap-start"
                >
                  <div className="group bg-white rounded-3xl border border-black/5 overflow-hidden hover:shadow-2xl transition-all h-full flex flex-col">
                    <Link to={`/marketplace/${product.id}`}>
                      <div className="aspect-[4/5] overflow-hidden bg-stone-100 relative">
                        <OptimizedImage
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full group-hover:scale-110 transition-transform duration-700"
                          width={600}
                        />
                        <div className="absolute top-6 left-6 flex flex-col gap-2">
                          <span className="px-4 py-1.5 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm">
                            {product.category}
                          </span>
                          {isAdmin && (
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleEditProduct(product);
                                }}
                                className="p-2 bg-white/90 backdrop-blur-md rounded-full text-emerald-600 shadow-sm hover:bg-emerald-600 hover:text-white transition-all"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleDeleteProduct(product.id);
                                }}
                                className="p-2 bg-white/90 backdrop-blur-md rounded-full text-red-600 shadow-sm hover:bg-red-600 hover:text-white transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                    <div className="p-8 flex flex-col flex-grow">
                      <Link to={`/marketplace/${product.id}`}>
                        <h3 className="font-bold text-2xl mb-2 hover:text-emerald-600 transition-colors tracking-tight">{product.name}</h3>
                      </Link>
                      <p className="text-black/50 text-sm mb-6 line-clamp-2 leading-relaxed">{product.description}</p>
                      <div className="mt-auto flex items-center justify-between relative">
                        <span className="text-2xl font-bold tracking-tighter">KSh {product.price.toLocaleString()}</span>
                        <div className="relative">
                          <AnimatePresence>
                            {addedId === product.id && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: -20 }}
                                exit={{ opacity: 0 }}
                                className="absolute -top-8 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap shadow-lg"
                              >
                                Added!
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <button 
                            onClick={() => handleAddToCart(product)}
                            className={`p-4 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg ${
                              addedId === product.id 
                                ? 'bg-white text-emerald-600 border-2 border-emerald-600' 
                                : 'bg-emerald-600 text-white shadow-emerald-600/20'
                            }`}
                          >
                            {addedId === product.id ? <Check size={22} /> : <ShoppingCart size={22} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="w-full py-20 text-center bg-stone-50 rounded-3xl border border-dashed border-black/10">
                <p className="text-black/40 font-medium">No products found in this category.</p>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="mt-8 flex items-center justify-center space-x-2 md:hidden">
        <div className="w-12 h-1 bg-black/10 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-emerald-600"
            initial={{ width: "0%" }}
            animate={{ width: "30%" }}
          />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">Swipe to browse</span>
      </div>
    </div>
  );
};

export default Marketplace;
