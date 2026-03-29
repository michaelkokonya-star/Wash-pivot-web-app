import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { motion, useAnimation, AnimatePresence } from 'motion/react';
import { ShoppingCart, Filter, Search, Sun, Droplets, ShieldCheck, ChevronLeft, ChevronRight, Check, Plus, Edit, Trash2, LogIn, Mail, Phone, MapPin, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import OptimizedImage from '../components/OptimizedImage';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import AddProductModal from '../components/AddProductModal';
import EditProductModal from '../components/EditProductModal';

const Marketplace = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [subFilter, setSubFilter] = useState('All');
  const carouselRef = useRef<HTMLDivElement>(null);
  const servicesCarouselRef = useRef<HTMLDivElement>(null);
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
      let q;
      if (filter === 'All') {
        q = collection(db, 'products');
      } else {
        if (subFilter !== 'All') {
          q = query(
            collection(db, 'products'), 
            where('category', '==', filter),
            where('subCategory', '==', subFilter)
          );
        } else {
          q = query(collection(db, 'products'), where('category', '==', filter));
        }
      }
      
      const querySnapshot = await getDocs(q);
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      }));
      setProducts(productsData);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'products');
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    setServicesLoading(true);
    try {
      let q;
      if (filter === 'All') {
        q = query(collection(db, 'service_providers'), where('isApproved', '==', true), orderBy('createdAt', 'desc'));
      } else if (subFilter !== 'All') {
        q = query(
          collection(db, 'service_providers'), 
          where('isApproved', '==', true),
          where('category', '==', filter),
          where('subCategory', '==', subFilter),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(
          collection(db, 'service_providers'), 
          where('isApproved', '==', true),
          where('category', '==', filter),
          orderBy('createdAt', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(q);
      const servicesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      }));
      setServices(servicesData);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'service_providers');
    } finally {
      setServicesLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      fetchProducts();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  useEffect(() => {
    fetchProducts();
    fetchServices();
  }, [filter, subFilter]);

  useEffect(() => {
    if (carouselRef.current) {
      setWidth(carouselRef.current.scrollWidth - carouselRef.current.offsetWidth);
    }
  }, [products, loading]);

  const allProducts = products;

  const scroll = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = ref.current.offsetWidth * 0.8;
      ref.current.scrollBy({
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
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {['All', 'Solar', 'Water Treatment', 'Sanitation'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setFilter(cat);
                    setSubFilter('All');
                  }}
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

            {filter === 'Water Treatment' && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap gap-2 p-2 bg-stone-100 rounded-2xl border border-black/5"
              >
                {['All', 'Fluoride Removal', 'Filtration', 'Chlorination'].map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setSubFilter(sub)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      subFilter === sub 
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                        : 'bg-white text-black/40 hover:text-black'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </motion.div>
            )}

            {filter === 'Solar' && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap gap-2 p-2 bg-stone-100 rounded-2xl border border-black/5"
              >
                {['All', 'Solar Panels', 'Batteries', 'Charge Controller', 'Inverter', 'Accessories'].map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setSubFilter(sub)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      subFilter === sub 
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                        : 'bg-white text-black/40 hover:text-black'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </motion.div>
            )}

            {filter === 'Sanitation' && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap gap-2 p-2 bg-stone-100 rounded-2xl border border-black/5"
              >
                {['All', 'Exhaust Services'].map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setSubFilter(sub)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      subFilter === sub 
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                        : 'bg-white text-black/40 hover:text-black'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </motion.div>
            )}
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
          onClick={() => scroll(carouselRef as any, 'left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 p-4 bg-white shadow-2xl rounded-full border border-black/5 opacity-0 group-hover/carousel:opacity-100 group-hover/carousel:translate-x-0 transition-all hidden md:flex items-center justify-center hover:bg-stone-50"
        >
          <ChevronLeft size={24} />
        </button>
        
        <button 
          onClick={() => scroll(carouselRef as any, 'right')}
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

      {/* Service Providers Section */}
      <div className="mt-32">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h2 className="text-4xl font-bold tracking-tighter mb-2">SERVICE PROVIDERS</h2>
            <p className="text-black/50">Professional WASH installation and maintenance services.</p>
          </div>
          <Link 
            to="/recruitment"
            className="px-6 py-2 bg-black text-white rounded-full text-sm font-bold hover:bg-stone-800 transition-all flex items-center space-x-2"
          >
            <span>View Experts</span>
            <ExternalLink size={16} />
          </Link>
        </div>

        <div className="relative group/services">
          <button 
            onClick={() => scroll(servicesCarouselRef as any, 'left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 p-4 bg-white shadow-2xl rounded-full border border-black/5 opacity-0 group-hover/services:opacity-100 group-hover/services:translate-x-0 transition-all hidden md:flex items-center justify-center hover:bg-stone-50"
          >
            <ChevronLeft size={24} />
          </button>
          
          <button 
            onClick={() => scroll(servicesCarouselRef as any, 'right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 p-4 bg-white shadow-2xl rounded-full border border-black/5 opacity-0 group-hover/services:opacity-100 group-hover/services:translate-x-0 transition-all hidden md:flex items-center justify-center hover:bg-stone-50"
          >
            <ChevronRight size={24} />
          </button>

          <motion.div 
            ref={servicesCarouselRef}
            className="flex overflow-x-auto scrollbar-hide gap-8 pb-12 snap-x snap-mandatory cursor-grab active:cursor-grabbing"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <AnimatePresence mode="popLayout">
              {services.length > 0 ? (
                services.map((service) => (
                  <motion.div
                    key={service.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="min-w-[300px] sm:min-w-[350px] lg:min-w-[400px] snap-start"
                  >
                    <div className="group bg-stone-50 rounded-[2.5rem] border border-black/5 overflow-hidden hover:shadow-2xl transition-all h-full flex flex-col p-8">
                      <div className="flex items-start justify-between mb-8">
                        <div className="w-20 h-20 rounded-3xl overflow-hidden bg-white shadow-sm border border-black/5">
                          <img 
                            src={service.imageUrl} 
                            alt={service.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest">
                          {service.category}
                        </span>
                      </div>

                      <h3 className="text-2xl font-bold tracking-tight mb-4">{service.name}</h3>
                      <p className="text-black/50 text-sm mb-8 line-clamp-3 leading-relaxed">{service.description}</p>

                      <div className="mt-auto space-y-4">
                        <div className="flex items-center gap-3 text-sm text-black/60">
                          <MapPin size={16} className="text-emerald-600" />
                          <span>{service.location}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-4 border-t border-black/5">
                          <a 
                            href={`mailto:${service.contactEmail}`}
                            className="flex-1 py-3 bg-white border border-black/5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-black hover:text-white transition-all"
                          >
                            <Mail size={14} />
                            <span>Email</span>
                          </a>
                          <a 
                            href={`tel:${service.contactPhone}`}
                            className="flex-1 py-3 bg-white border border-black/5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-black hover:text-white transition-all"
                          >
                            <Phone size={14} />
                            <span>Call</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="w-full py-20 text-center bg-stone-50 rounded-3xl border border-dashed border-black/10">
                  <p className="text-black/40 font-medium">No service providers available at the moment.</p>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
