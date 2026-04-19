import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft, CreditCard, Smartphone, Loader2, AlertCircle, ArrowRight, ShieldCheck, Truck } from 'lucide-react';

const VisaIcon = () => (
  <svg viewBox="0 0 48 48" className="h-4 w-auto" xmlns="http://www.w3.org/2000/svg">
    <path fill="#1A1F71" d="M18.5 29.5L21.4 12H16L13.1 29.5h5.4zm16.4-17.1c-1.1-.4-2.8-.8-4.9-.8-5.4 0-9.2 2.8-9.2 6.7 0 3 2.7 4.7 4.8 5.7 2.1 1 2.8 1.7 2.8 2.6 0 1.4-1.7 2-3.3 2-2.2 0-3.4-.3-5.2-1.1l-.7-.3-.8 4.7c1.3.6 3.7 1.1 6.2 1.1 5.8 0 9.5-2.8 9.5-7.1 0-2.4-1.4-4.2-4.6-5.7-2.1-1.1-3.4-1.8-3.4-2.9 0-1 .1-1.8 3.5-1.8 2 0 3.4.4 4.5.9l.5.2.7-4.5zM47 12h-4.2c-1.3 0-2.3.4-2.9 1.7l-8.2 15.8h5.6s1-2.5 1.2-3.1h6.6c.2.7.5 3.1.5 3.1h5L47 12zm-8.2 10.3c.4-1 3.2-8.1 3.2-8.1l.2.5s1.8 8.1 1.8 8.1L38.8 22.3zM9.5 12L4.2 24.3l-.6-2.9C2.4 16.5 2 12 2 12h7.5z" />
  </svg>
);

const MastercardIcon = () => (
  <svg viewBox="0 0 48 48" className="h-6 w-auto" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="24" r="15" fill="#EB001B" />
    <circle cx="30" cy="24" r="15" fill="#F79E1B" />
    <path d="M24 12.3a14.9 14.9 0 0 0 0 23.4 14.9 14.9 0 0 0 0-23.4z" fill="#FF5F00" />
  </svg>
);

const MpesaLogo = ({ className = "h-8", light = false }) => (
  <div className={`flex items-center gap-1 select-none ${className}`}>
    <span className="font-black italic text-[#EB1B2D] text-lg leading-none transform translate-y-[2px]">M-</span>
    <div className={`px-2.5 py-1.5 rounded-lg flex items-center justify-center shadow-lg ${light ? 'bg-white' : 'bg-[#4CAF50]'}`}>
      <span className={`font-black uppercase text-[12px] tracking-tighter leading-none ${light ? 'text-[#4CAF50]' : 'text-white'}`}>PESA</span>
    </div>
  </div>
);

const Checkout = () => {
  const { cart, cartTotal, cartCount, clearCart } = useCart();
  const { user, profile, authFetch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mpesa' | 'manual_mpesa'>('card');
  const [mpesaWaiting, setMpesaWaiting] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: user?.email || '',
    firstName: profile?.displayName?.split(' ')[0] || '',
    lastName: profile?.displayName?.split(' ')[1] || '',
    address: '',
    city: '',
    phone: '',
    distance: '0',
  });

  const [deliveryRules, setDeliveryRules] = useState<any>({
    baseRate: 200,
    ratePerKm: 50,
    freeThreshold: 50000
  });

  React.useEffect(() => {
    const fetchDeliveryRules = async () => {
      try {
        const response = await fetch('/api/settings/delivery-rules');
        if (response.ok) {
          const data = await response.json();
          setDeliveryRules(data);
        }
      } catch (error) {
        console.error("Error fetching delivery rules:", error);
      }
    };
    fetchDeliveryRules();
  }, []);

  const distanceNum = parseFloat(formData.distance) || 0;
  const rawDeliveryCharge = Math.max(deliveryRules.baseRate, distanceNum * deliveryRules.ratePerKm);
  const deliveryCharge = cartTotal >= deliveryRules.freeThreshold ? 0 : rawDeliveryCharge;
  const finalTotal = cartTotal + deliveryCharge;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Save Order to Generic Data API (Initial state: Pending)
      const orderData = {
        userId: user?.uid,
        userEmail: user?.email,
        items: cart,
        totalAmount: finalTotal,
        subtotal: cartTotal,
        deliveryCharge: deliveryCharge,
        status: 'pending',
        paymentMethod: paymentMethod,
        shippingInfo: formData,
        createdAt: new Date().toISOString(),
      };

      const orderResponse = await authFetch('/api/data/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to create order');
      }

      const orderResult = await orderResponse.json();
      const orderId = orderResult.id;

      if (paymentMethod === 'card') {
        // 2a. Stripe Checkout
        const response = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: [
              ...cart,
              {
                id: 'delivery-charge',
                name: 'Delivery Charge',
                price: deliveryCharge,
                quantity: 1,
                imageUrl: 'https://cdn-icons-png.flaticon.com/512/2311/2311524.png'
              }
            ].filter(item => item.price > 0),
            successUrl: `${window.location.origin}/checkout/success?orderId=${orderId}`,
            cancelUrl: `${window.location.origin}/cart`,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to initiate checkout');
        }

        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error('No checkout URL received');
        }
      } else if (paymentMethod === 'mpesa') {
        // 2b. M-Pesa STK Push (Currently under maintenance)
        throw new Error('M-Pesa STK Push is currently undergoing maintenance. Please use the "Lipa na M-Pesa (Buy Goods)" option below or a credit/debit card.');
      } else {
        // 2c. Manual M-Pesa (Buy Goods)
        navigate(`/checkout/success?orderId=${orderId}&method=manual_mpesa`);
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setMpesaWaiting(false);
    } finally {
      if (paymentMethod === 'card') setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="pt-32 pb-20 px-4 text-center">
        <h2 className="text-3xl font-bold mb-4">Your cart is empty</h2>
        <Link to="/marketplace" className="text-emerald-600 font-bold hover:underline">
          Return to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <Helmet>
        <title>Checkout | Wash Pivot</title>
      </Helmet>

      <div className="flex items-center space-x-2 text-black/50 hover:text-black transition-colors mb-8 cursor-pointer" onClick={() => navigate('/cart')}>
        <ChevronLeft size={18} />
        <span className="font-bold uppercase tracking-widest text-xs">Back to Cart</span>
      </div>

      <h1 className="text-5xl font-bold tracking-tighter mb-12 uppercase">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Shipping Form */}
        <div>
          <form onSubmit={handleCheckout} className="space-y-8">
            <section>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-xs">1</div>
                Shipping Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    required
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full p-4 bg-stone-50 border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    required
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full p-4 bg-stone-50 border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full p-4 bg-stone-50 border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Shipping Address</label>
                  <input
                    type="text"
                    name="address"
                    required
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full p-4 bg-stone-50 border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">City</label>
                  <input
                    type="text"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full p-4 bg-stone-50 border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full p-4 bg-stone-50 border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Distance from Nairobi (KM)</label>
                  <input
                    type="number"
                    name="distance"
                    min="0"
                    required
                    value={formData.distance}
                    onChange={handleInputChange}
                    className="w-full p-4 bg-stone-50 border border-black/5 rounded-xl focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[9px] text-black/30 italic">Used to calculate delivery charges (Min KES {deliveryRules.baseRate})</p>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-3">
                  <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-xs">2</div>
                  Payment Method
                </h2>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-widest">M-Pesa Temporarily Unavailable</span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-6 rounded-3xl border transition-all flex items-center justify-between group relative overflow-hidden ${
                    paymentMethod === 'card' 
                      ? 'border-emerald-600 bg-emerald-50/30 ring-2 ring-emerald-600/10' 
                      : 'border-black/5 bg-white hover:border-black/20 hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-colors ${
                      paymentMethod === 'card' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-stone-50 border-black/5 text-black/20'
                    }`}>
                      <CreditCard size={24} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold">Credit / Debit Card</p>
                      <p className="text-xs text-black/40">Secure payment via Stripe</p>
                    </div>
                  </div>
                  <div className="flex gap-3 bg-white px-4 py-2 rounded-xl border border-black/5 shadow-sm items-center relative z-10 transition-transform group-hover:scale-105">
                    <VisaIcon />
                    <div className="w-px h-4 bg-black/10 mx-1" />
                    <MastercardIcon />
                  </div>
                </button>

                <button
                  type="button"
                  disabled
                  className="p-6 rounded-3xl border transition-all flex items-center justify-between bg-stone-50 border-black/5 opacity-60 cursor-not-allowed relative overflow-hidden group"
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center border bg-white border-black/5 text-black/20">
                      <Smartphone size={24} />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-black/40">M-Pesa Express</p>
                        <span className="bg-emerald-100 text-emerald-700 text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Coming Soon</span>
                      </div>
                      <p className="text-xs text-black/20">Mobile money (STK Push)</p>
                    </div>
                  </div>
                  <MpesaLogo className="h-5 opacity-20 grayscale" />
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('manual_mpesa')}
                  className={`p-6 rounded-3xl border transition-all flex items-center justify-between group relative overflow-hidden ${
                    paymentMethod === 'manual_mpesa' 
                      ? 'border-[#4CAF50] bg-[#4CAF50]/5 ring-2 ring-[#4CAF50]/10' 
                      : 'border-black/5 bg-white hover:border-[#4CAF50]/20 hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-colors ${
                      paymentMethod === 'manual_mpesa' ? 'bg-[#4CAF50] border-[#4CAF50] text-white' : 'bg-stone-50 border-black/5 text-black/20'
                    }`}>
                      <Smartphone size={24} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold">Lipa na M-Pesa (Buy Goods)</p>
                      <p className="text-xs text-black/40">Manual payment via Till Number</p>
                    </div>
                  </div>
                  <MpesaLogo className={`h-8 transition-all ${paymentMethod === 'manual_mpesa' ? 'opacity-100' : 'opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-100'}`} />
                </button>
              </div>

              {paymentMethod === 'manual_mpesa' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-8 bg-[#4CAF50] text-white rounded-3xl shadow-xl overflow-hidden relative"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                  <div className="relative z-10 text-center">
                    <div className="flex justify-center mb-4">
                      <MpesaLogo className="h-10" light />
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter mb-6">Buy Goods Till Number</h3>
                    
                    <div className="flex justify-center gap-2 mb-6">
                      {['8', '5', '0', '0', '1', '3', '2'].map((digit, i) => (
                        <div key={i} className="w-10 h-14 bg-white text-[#4CAF50] rounded-lg flex items-center justify-center text-3xl font-black shadow-lg">
                          {digit}
                        </div>
                      ))}
                    </div>

                    <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl py-3 px-6 inline-block mb-6">
                      <p className="text-sm font-bold uppercase tracking-widest opacity-80 mb-1">Account Name</p>
                      <p className="text-xl font-black">MICHAEL KOKONYA OKUO</p>
                    </div>

                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 leading-relaxed">
                      Use mySafaricom App (cost calculator) or dial *234# to view applicable charges
                    </p>
                  </div>
                </motion.div>
              )}
            </section>

            {mpesaWaiting && (
              <div className="p-8 bg-emerald-50 rounded-3xl border border-emerald-200 text-center space-y-4">
                <Loader2 size={32} className="animate-spin text-emerald-600 mx-auto" />
                <h3 className="font-bold text-lg">Waiting for M-Pesa Payment...</h3>
                <p className="text-sm text-black/60">Please check your phone and enter your M-Pesa PIN to complete the transaction.</p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-sm font-medium">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-500 transition-all flex items-center justify-center space-x-3 shadow-xl shadow-emerald-600/20 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Pay KES {finalTotal.toLocaleString()}</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:pl-12">
          <div className="bg-stone-50 p-8 rounded-[3rem] border border-black/5 sticky top-32">
            <h2 className="text-2xl font-bold mb-8 tracking-tight uppercase">Order Summary</h2>
            
            <div className="space-y-6 mb-8 max-h-[400px] overflow-y-auto pr-2">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-black/5 flex-shrink-0">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-bold text-sm line-clamp-1">{item.name}</h4>
                    <p className="text-xs text-black/40">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-bold text-sm">KES {(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="space-y-4 pt-6 border-t border-black/10">
              <div className="flex justify-between text-black/40 text-sm">
                <span>Subtotal</span>
                <span>KES {cartTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-black/40 text-sm">
                <span>Shipping ({distanceNum} km)</span>
                {deliveryCharge === 0 ? (
                  <span className="text-emerald-600 font-bold uppercase tracking-widest text-[10px]">Free</span>
                ) : (
                  <span>KES {deliveryCharge.toLocaleString()}</span>
                )}
              </div>
              <div className="pt-4 border-t border-black/10 flex justify-between items-end">
                <span className="text-lg font-bold">Total</span>
                <span className="text-3xl font-bold tracking-tighter">KES {finalTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3 text-xs text-black/40">
                <ShieldCheck size={16} className="text-emerald-600" />
                <span>Secure SSL encrypted checkout</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-black/40">
                <Truck size={16} className="text-emerald-600" />
                <span>Free shipping on all sustainable products</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
