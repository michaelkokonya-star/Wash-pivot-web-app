import React from 'react';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ChevronLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import OptimizedImage from '../components/OptimizedImage';

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, cartTotal, cartCount } = useCart();
  const navigate = useNavigate();

  return (
    <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <Helmet>
        <title>Your Cart | Wash Pivot Marketplace</title>
      </Helmet>

      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-5xl font-bold tracking-tighter mb-2 uppercase">Your Cart</h1>
          <p className="text-black/50">Review your items before proceeding to checkout.</p>
        </div>
        <Link 
          to="/marketplace" 
          className="hidden md:flex items-center space-x-2 text-sm font-bold hover:text-emerald-600 transition-colors"
        >
          <ChevronLeft size={18} />
          <span>Continue Shopping</span>
        </Link>
      </div>

      {cart.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-6">
            <AnimatePresence mode="popLayout">
              {cart.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-white rounded-3xl border border-black/5 hover:shadow-xl transition-all"
                >
                  <div className="w-full sm:w-32 aspect-square rounded-2xl overflow-hidden bg-stone-100 flex-shrink-0">
                    <OptimizedImage
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      width={200}
                    />
                  </div>
                  
                  <div className="flex-grow text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                            {item.category}
                          </span>
                          {item.rating && (
                            <span className="px-2 py-0.5 bg-stone-100 text-black/40 rounded text-[9px] font-bold uppercase tracking-widest">
                              {item.rating}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-xl tracking-tight">{item.name}</h3>
                      </div>
                      <span className="text-lg font-bold tracking-tighter">
                        KSh {(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                      <div className="flex items-center bg-stone-100 rounded-xl p-1">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1, item.rating)}
                          className="p-2 hover:bg-white rounded-lg transition-all text-black/60 hover:text-black"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-12 text-center font-bold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1, item.rating)}
                          className="p-2 hover:bg-white rounded-lg transition-all text-black/60 hover:text-black"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      
                      <button
                        onClick={() => removeFromCart(item.id, item.rating)}
                        className="flex items-center space-x-2 text-sm font-bold text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 size={16} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-black text-white p-8 rounded-3xl sticky top-32 shadow-2xl shadow-black/20">
              <h2 className="text-2xl font-bold mb-8 tracking-tight">Order Summary</h2>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-white/60 text-sm">
                  <span>Subtotal ({cartCount} items)</span>
                  <span>KSh {cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-white/60 text-sm">
                  <span>Shipping</span>
                  <span className="text-emerald-400 font-bold uppercase tracking-widest text-[10px]">Calculated at next step</span>
                </div>
                <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                  <span className="text-lg font-medium">Total</span>
                  <span className="text-3xl font-bold tracking-tighter">KSh {cartTotal.toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/checkout')}
                className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-500 transition-all flex items-center justify-center space-x-3 group"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              
              <p className="mt-6 text-center text-[10px] text-white/30 uppercase tracking-widest font-bold">
                Secure payment powered by Stripe
              </p>
            </div>
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="py-32 text-center bg-stone-50 rounded-[3rem] border border-dashed border-black/10"
        >
          <div className="max-w-md mx-auto px-4">
            <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag size={32} className="text-black/20" />
            </div>
            <h2 className="text-3xl font-bold mb-4 tracking-tight">Your cart is empty</h2>
            <p className="text-black/50 mb-8 leading-relaxed">
              Looks like you haven't added anything to your cart yet. Explore our marketplace for sustainable WASH solutions.
            </p>
            <Link
              to="/marketplace"
              className="inline-flex items-center space-x-3 px-8 py-4 bg-black text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all"
            >
              <span>Start Shopping</span>
              <ArrowRight size={20} />
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Cart;
