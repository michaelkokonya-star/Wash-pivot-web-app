import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { ShoppingCart, ArrowLeft, Sun, Droplets, ShieldCheck, CheckCircle2, Star, MessageSquare, Send, User, ArrowRight, Facebook, Twitter, Linkedin, Share2, Link as LinkIcon, Globe, ChevronDown, ChevronUp, Trash2, Loader2 } from 'lucide-react';
import OptimizedImage from '../components/OptimizedImage';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addedToCart, setAddedToCart] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [currency, setCurrency] = useState('KES');
  const [rates, setRates] = useState<any>({ KES: 1 });
  const [loadingRates, setLoadingRates] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
    { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
    { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  ];

  const faqs = [
    {
      question: "How do I install this product?",
      answer: "Most of our products come with a comprehensive DIY installation guide. For complex systems like the Solar Home Kit or UV Water Purifier, we recommend consulting a local certified technician to ensure optimal performance and safety."
    },
    {
      question: "What kind of maintenance is required?",
      answer: "Maintenance varies by product. Generally, solar panels should be kept free of dust and debris, while water filters require periodic cartridge replacements (usually every 6-12 months depending on usage and water quality)."
    },
    {
      question: "Is there a warranty included?",
      answer: "Yes, all products purchased through WASH Pivot come with a standard 12-month manufacturer warranty covering defects in materials and workmanship. Extended protection plans are available for select high-value items."
    }
  ];

  useEffect(() => {
    const fetchRates = async () => {
      setLoadingRates(true);
      try {
        const response = await fetch('https://open.er-api.com/v6/latest/KES');
        const data = await response.json();
        if (data && data.rates) {
          setRates(data.rates);
        }
      } catch (error) {
        console.error("Error fetching exchange rates:", error);
      } finally {
        setLoadingRates(false);
      }
    };
    fetchRates();
  }, []);

  const formatPrice = (price: number) => {
    const rate = rates[currency] || 1;
    const converted = price * rate;
    const symbol = currencies.find(c => c.code === currency)?.symbol || '$';
    
    return `${symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        if (!id) return;
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const productData = { id: docSnap.id, ...docSnap.data() } as any;
          setProduct(productData);
          setSelectedImage(productData.imageUrl);
          fetchRelated(productData.category, docSnap.id);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchRelated = async (category: string, currentId: string) => {
      try {
        const q = query(
          collection(db, 'products'),
          where('category', '==', category)
        );
        const querySnapshot = await getDocs(collection(db, 'products')); // Simplified for now since where might need index
        const allProductsData = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((p: any) => p.category === category && p.id !== currentId)
          .slice(0, 4);
        
        setRelatedProducts(allProductsData);
      } catch (error) {
        console.error("Error fetching related products:", error);
      }
    };

    fetchProduct();
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const q = query(
      collection(db, 'reviews'),
      where('productId', '==', id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort in memory to avoid index requirement
      reviewsData.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate()?.getTime() || 0;
        const dateB = b.createdAt?.toDate()?.getTime() || 0;
        return dateB - dateA;
      });
      setReviews(reviewsData);
    }, (error) => {
      console.error("Error fetching reviews:", error);
    });

    return () => unsubscribe();
  }, [id]);

  const averageRating = reviews.length > 0 
    ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length 
    : 0;

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to delete your review?')) return;
    setDeletingReviewId(reviewId);
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
    } catch (error) {
      console.error("Error deleting review:", error);
    } finally {
      setDeletingReviewId(null);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !newComment.trim()) return;

    setSubmittingReview(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        productId: id,
        userId: user.uid,
        userName: profile?.displayName || user.displayName || 'Anonymous',
        rating: newRating,
        comment: newComment,
        createdAt: serverTimestamp()
      });
      setNewComment('');
      setNewRating(5);
    } catch (error) {
      console.error("Error submitting review:", error);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleAddToCart = (productToAdd = product) => {
    if (!productToAdd) return;
    addToCart(productToAdd);
    if (productToAdd.id === product.id) {
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="pt-32 flex justify-center items-center min-h-screen">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pt-32 px-8 text-center min-h-screen">
        <h1 className="text-3xl font-bold mb-4">Product Not Found</h1>
        <button 
          onClick={() => navigate('/marketplace')}
          className="text-emerald-600 font-bold hover:underline"
        >
          Back to Marketplace
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
    >
      <Helmet>
        <title>{`${product.name} | WASH Pivot Marketplace`}</title>
        <meta name="description" content={product.description.substring(0, 160)} />
        <link rel="canonical" href={`https://www.washpivot.com/marketplace/${product.id}`} />
        <meta property="og:title" content={product.name} />
        <meta property="og:description" content={product.description.substring(0, 160)} />
        <meta property="og:image" content={product.imageUrl} />
        <meta property="og:url" content={`https://www.washpivot.com/marketplace/${product.id}`} />
      </Helmet>
      <button 
        onClick={() => navigate('/marketplace')}
        className="flex items-center space-x-2 text-black/50 hover:text-black transition-colors mb-8 group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-bold uppercase tracking-widest text-xs">Back to Marketplace</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-24">
        {/* Image Section */}
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="aspect-square rounded-3xl overflow-hidden bg-stone-100 border border-black/5"
          >
            <AnimatePresence mode="wait">
              <OptimizedImage
                key={selectedImage}
                src={selectedImage || product.imageUrl}
                alt={product.name}
                className="w-full h-full"
                priority={true}
                width={1000}
              />
            </AnimatePresence>
          </motion.div>

          {/* Thumbnail Gallery */}
          <div className="grid grid-cols-4 gap-4">
            {[
              product.imageUrl,
            ].map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(img)}
                className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${selectedImage === img ? 'border-emerald-600 ring-2 ring-emerald-600/20' : 'border-transparent hover:border-black/10'}`}
              >
                <OptimizedImage
                  src={img}
                  alt={`${product.name} view ${idx + 1}`}
                  className="w-full h-full"
                  width={200}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Content Section */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col justify-center"
        >
          <div className="mb-6">
            <span className="px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-widest mb-4 inline-block">
              {product.category}
            </span>
            <h1 className="text-5xl font-bold tracking-tighter mb-4 leading-tight">{product.name}</h1>
            <div className="flex items-center space-x-6 mb-8">
              <div className="text-3xl font-bold text-black">{formatPrice(product.price)}</div>
              <div className="flex items-center space-x-2">
                <div className="flex text-emerald-600">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} size={16} fill={star <= Math.round(averageRating) ? "currentColor" : "none"} />
                  ))}
                </div>
                <span className="text-sm font-bold text-black/40">({reviews.length})</span>
              </div>
              <div className="relative group">
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-stone-100 rounded-lg text-xs font-bold cursor-pointer hover:bg-stone-200 transition-colors">
                  <Globe size={14} className="text-black/40" />
                  <span>{currency}</span>
                </div>
                <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-black/10 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                  {currencies.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => setCurrency(c.code)}
                      className={`w-full px-4 py-2.5 text-left text-xs font-bold hover:bg-stone-50 transition-colors flex items-center justify-between ${currency === c.code ? 'text-emerald-600 bg-emerald-50/50' : 'text-black/60'}`}
                    >
                      <span>{c.name}</span>
                      <span className="opacity-40">{c.code}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="prose prose-lg text-black/60 mb-10 leading-relaxed">
            <p>{product.description}</p>
          </div>

          <div className="space-y-4 mb-10">
            <div className="flex items-center space-x-3 text-sm font-medium">
              <CheckCircle2 className="text-emerald-600" size={20} />
              <span>Certified Sustainable Technology</span>
            </div>
            <div className="flex items-center space-x-3 text-sm font-medium">
              <CheckCircle2 className="text-emerald-600" size={20} />
              <span>2-Year Manufacturer Warranty</span>
            </div>
            <div className="flex items-center space-x-3 text-sm font-medium">
              <CheckCircle2 className="text-emerald-600" size={20} />
              <span>Expert Installation Support Available</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={handleAddToCart}
              className={`flex-1 py-5 rounded-2xl font-bold text-lg transition-all flex items-center justify-center space-x-3 shadow-xl ${
                addedToCart 
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20' 
                  : 'bg-black text-white hover:bg-black/80 shadow-black/10'
              }`}
            >
              <ShoppingCart size={24} />
              <span>{addedToCart ? 'Added to Cart!' : 'Add to Cart'}</span>
            </button>
            <button className="flex-1 py-5 bg-white text-black border-2 border-black rounded-2xl font-bold text-lg hover:bg-stone-50 transition-all">
              Request Quote
            </button>
          </div>

          {/* Social Sharing */}
          <div className="mt-10 pt-8 border-t border-black/5">
            <div className="flex items-center space-x-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Share this product</span>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')}
                  className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center hover:bg-[#1877F2] hover:text-white transition-all group"
                  title="Share on Facebook"
                >
                  <Facebook size={18} />
                </button>
                <button 
                  onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(`Check out this ${product.name} on WASH Pivot!`)}`, '_blank')}
                  className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center hover:bg-[#1DA1F2] hover:text-white transition-all"
                  title="Share on Twitter"
                >
                  <Twitter size={18} />
                </button>
                <button 
                  onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank')}
                  className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center hover:bg-[#0A66C2] hover:text-white transition-all"
                  title="Share on LinkedIn"
                >
                  <Linkedin size={18} />
                </button>
                <button 
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Check out this ${product.name} on WASH Pivot: ${window.location.href}`)}`, '_blank')}
                  className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center hover:bg-[#25D366] hover:text-white transition-all"
                  title="Share on WhatsApp"
                >
                  <MessageSquare size={18} />
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    const btn = document.getElementById('copy-link-btn');
                    if (btn) {
                      const originalContent = btn.innerHTML;
                      btn.innerHTML = '<span class="text-[10px] font-bold">COPIED!</span>';
                      setTimeout(() => {
                        btn.innerHTML = originalContent;
                      }, 2000);
                    }
                  }}
                  id="copy-link-btn"
                  className="px-4 h-10 rounded-full bg-stone-100 flex items-center justify-center hover:bg-black hover:text-white transition-all"
                  title="Copy Link"
                >
                  <LinkIcon size={18} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Reviews Section */}
      <div className="mt-16 border-t border-black/5 pt-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h2 className="text-4xl font-bold tracking-tighter mb-2">CUSTOMER REVIEWS</h2>
            <div className="flex items-center space-x-2">
              <div className="flex text-emerald-600">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} size={18} fill={star <= Math.round(averageRating) ? "currentColor" : "none"} />
                ))}
              </div>
              <span className="text-sm font-bold text-black/50">
                {averageRating > 0 ? averageRating.toFixed(1) : 'No'} Rating • {reviews.length} Reviews
              </span>
            </div>
          </div>

          {user && (
            <button 
              onClick={() => document.getElementById('review-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-6 py-3 bg-stone-100 text-black font-bold rounded-xl hover:bg-black hover:text-white transition-all text-sm"
            >
              Write a Review
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Reviews List */}
          <div className="lg:col-span-2 space-y-8">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <motion.div 
                  key={review.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-stone-50 p-6 rounded-2xl border border-black/5"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-black/5">
                        <User size={20} className="text-black/30" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">{review.userName}</h4>
                        <p className="text-[10px] text-black/40 uppercase tracking-widest">
                          {review.createdAt?.toDate().toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex text-emerald-600">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} size={14} fill={star <= review.rating ? "currentColor" : "none"} />
                        ))}
                      </div>
                      {(user?.uid === review.userId || profile?.role === 'admin') && (
                        <button
                          onClick={() => handleDeleteReview(review.id)}
                          disabled={deletingReviewId === review.id}
                          className="text-red-500 hover:text-red-700 transition-colors"
                          title="Delete Review"
                        >
                          {deletingReviewId === review.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-black/70 leading-relaxed text-sm italic">"{review.comment}"</p>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12 bg-stone-50 rounded-3xl border border-dashed border-black/10">
                <MessageSquare size={48} className="mx-auto text-black/10 mb-4" />
                <p className="text-black/40 font-medium">No reviews yet. Be the first to share your experience!</p>
              </div>
            )}
          </div>

          {/* Review Form */}
          <div id="review-form" className="lg:col-span-1">
            {user ? (
              <div className="bg-white p-8 rounded-3xl border border-black/10 sticky top-32">
                <h3 className="text-xl font-bold mb-6">Share Your Feedback</h3>
                <form onSubmit={handleSubmitReview} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-3 block">Rating</label>
                    <div className="flex space-x-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating(star)}
                          className={`transition-colors ${star <= newRating ? 'text-emerald-600' : 'text-black/10'}`}
                        >
                          <Star size={28} fill={star <= newRating ? "currentColor" : "none"} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-3 block">Review Comment</label>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="What did you think of this product?"
                      className="w-full p-4 bg-stone-50 border border-black/5 rounded-xl h-32 focus:outline-none focus:border-emerald-600 transition-colors text-sm"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingReview || !newComment.trim()}
                    className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {submittingReview ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Send size={18} />
                        <span>Submit Review</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-stone-50 p-8 rounded-3xl border border-black/5 text-center">
                <h3 className="text-xl font-bold mb-4">Want to review?</h3>
                <p className="text-black/50 text-sm mb-6">Please sign in to share your experience with this product.</p>
                <button 
                  onClick={() => navigate('/login')} // Assuming there's a login route or just trigger sign in
                  className="w-full py-4 bg-black text-white font-bold rounded-xl hover:bg-black/80 transition-all"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-24 pt-16 border-t border-black/5">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold tracking-tighter mb-4">FREQUENTLY ASKED QUESTIONS</h2>
              <p className="text-black/50 text-sm uppercase tracking-widest font-bold">Everything you need to know about {product.name}</p>
            </div>
            
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div 
                  key={index}
                  className="bg-stone-50 rounded-2xl border border-black/5 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                    className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-stone-100 transition-colors"
                  >
                    <span className="font-bold text-lg">{faq.question}</span>
                    <div className={`p-2 rounded-full bg-white border border-black/5 transition-transform duration-300 ${openFaqIndex === index ? 'rotate-180' : ''}`}>
                      <ChevronDown size={18} className="text-black/40" />
                    </div>
                  </button>
                  <AnimatePresence>
                    {openFaqIndex === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                      >
                        <div className="px-8 pb-8 text-black/60 leading-relaxed">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <div className="mt-24 border-t border-black/5 pt-16">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-4xl font-bold tracking-tighter mb-2">RELATED PRODUCTS</h2>
              <p className="text-black/50 text-sm uppercase tracking-widest font-bold">More from {product.category}</p>
            </div>
            <button 
              onClick={() => navigate('/marketplace')}
              className="hidden sm:flex items-center space-x-2 text-emerald-600 font-bold hover:underline"
            >
              <span>View All</span>
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {relatedProducts.map((related) => (
              <motion.div
                key={related.id}
                whileHover={{ y: -10 }}
                className="group bg-stone-50 rounded-2xl border border-black/5 overflow-hidden hover:shadow-xl transition-all"
              >
                <div 
                  className="aspect-square overflow-hidden bg-stone-100 relative cursor-pointer"
                  onClick={() => navigate(`/marketplace/${related.id}`)}
                >
                  <OptimizedImage
                    src={related.imageUrl}
                    alt={related.name}
                    className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                    width={400}
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest">
                      {related.category}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 
                    className="font-bold text-lg mb-1 hover:text-emerald-600 transition-colors cursor-pointer line-clamp-1"
                    onClick={() => navigate(`/marketplace/${related.id}`)}
                  >
                    {related.name}
                  </h3>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xl font-bold">{formatPrice(related.price)}</span>
                    <button 
                      onClick={() => handleAddToCart(related)}
                      className="p-2 bg-black text-white rounded-lg hover:bg-emerald-600 transition-colors"
                    >
                      <ShoppingCart size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Related Info */}
      <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-black/5 pt-16">
        <div>
          <h4 className="font-bold text-xl mb-4">Shipping Info</h4>
          <p className="text-black/50 text-sm leading-relaxed">
            Global shipping available. Delivery times vary by region, typically 7-14 business days for international orders.
          </p>
        </div>
        <div>
          <h4 className="font-bold text-xl mb-4">Sustainability Impact</h4>
          <p className="text-black/50 text-sm leading-relaxed">
            This product contributes to UN Sustainable Development Goal 6 (Clean Water and Sanitation) and Goal 7 (Affordable and Clean Energy).
          </p>
        </div>
        <div>
          <h4 className="font-bold text-xl mb-4">Support</h4>
          <p className="text-black/50 text-sm leading-relaxed">
            Our team of WASH experts is available for consultation on how to best integrate this product into your project.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductDetail;
