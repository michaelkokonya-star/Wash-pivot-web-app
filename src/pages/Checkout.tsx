import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft, CreditCard, Smartphone, Loader2, AlertCircle, ArrowRight, ShieldCheck, Truck } from 'lucide-react';

const VisaIcon = () => (
  <svg viewBox="0 0 100 32" className="h-4 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M36.19 2.067L30.342 29.83h5.66l5.852-27.763h-5.664zM16.91 2.067h-9.25C5.55 2.067 4.3 3.328 3.88 4.542l-9.04 25.295h5.922s.967-2.68 1.185-3.282h7.228c.17.794.7 3.282.7 3.282h5.228l-4.193-27.77zm-5.75 17.526l2.368-11.233c-.02.085 1.157 5.518 1.868 8.875l.18.847s-4.416-.017-4.416 1.51zm83.33-17.526h-5.46c-1.69 0-2.954.966-3.69 2.18l-8.082 19.336L79.16 4.932c-.386-1.93-1.898-2.864-3.593-2.864H66.11l-.093.432c3.483.882 6.64 3.016 8.767 6.136l1.242 5.86-5.94 15.334h5.952l9.055-27.763zm-39.01 10.364c.034-4.22 5.877-4.453 5.922-6.33.023-1.706-2.115-1.776-4.067-1.776-3.237 0-5.123 1.05-6.618 1.745l-.94.444-1.025-4.78c1.373-.635 3.903-1.186 6.542-1.186 6.94 0 11.516 3.424 11.558 8.73.042 6.542-9.055 6.907-8.996 10.457.025 2.144 2.652 2.186 4.09 2.186 2.454 0 4.223-.525 5.564-1.16l.66-.312 1.056 4.903c-1.503.69-3.873 1.258-6.69 1.258-7.394 0-11.96-3.924-12.01-14.18z" fill="#1434CB"/>
  </svg>
);

const MastercardIcon = () => (
  <svg viewBox="0 0 100 62" className="h-4 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="31" cy="31" r="31" fill="#EB001B"/>
    <circle cx="69" cy="31" r="31" fill="#F79E1B"/>
    <path d="M50 8.543a30.933 30.933 0 0111.01 22.457A30.933 30.933 0 0150 53.457 30.933 30.933 0 0138.99 31 30.933 30.933 0 0150 8.543z" fill="#FF5F00"/>
  </svg>
);

const MpesaLogo = ({ className = "h-6", light = false }) => (
  <svg viewBox="0 0 200 60" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M42.41 47.38H29.17l-3.32-23.71c-.08-.57-.49-.77-.85-.77-.32 0-.69.16-.85.77l-4.13 23.71H7.81L16.2 3.82h12.59l2.87 21.05c.08.57.45.81.85.81.36 0 .73-.24.81-.81l2.87-21.05h12.59l-6.38 43.56z" fill="#EB1B2D"/>
    <path d="M57.44 23.33H73.7v6.62H57.44v17.43H43.91V3.82H73.7v6.62H57.44v12.89z" fill={light ? "#FFFFFF" : "#4CAF50"}/>
    <path d="M96.11 34.02h8.08v6.62h-8.08v6.74h12.33v6.62H82.58V3.82h18.82v6.62h-5.29v23.58z" fill={light ? "#FFFFFF" : "#4CAF50"}/>
    <path d="M125.74 38.3c0 6.62 5.05 10.33 13.9 10.33 2.14 0 4.29-.24 6.38-.69v6.52c-2.09.4-4.25.53-6.43.53-15.36 0-27.42-7.25-27.42-23.11 0-16.14 12.06-23.63 27.42-23.63 2.18 0 4.34.12 6.43.53v6.51c-2.09-.45-4.24-.69-6.38-.69-8.85 0-13.9 3.71-13.9 10.33 0 10 5.4 13.41 12 13.41z" fill={light ? "#FFFFFF" : "#4CAF50"}/>
    <path d="M165.71 47.38H151l-1.95-12.89h-5.83v12.89H129.8V3.82h18.25c11.01 0 17.67 4.13 17.67 15.36 0 8.01-3.6 12.05-10.13 13.47l.02 14.73zm-22.49-36.93v17.43h4.74c6.38 0 10.13-2.14 10.13-8.71 0-6.57-3.75-8.72-10.13-8.72h-4.74z" fill={light ? "#FFFFFF" : "#4CAF50"}/>
    <path d="M176.4 3.82h12.55l8.47 43.56H184.22l-2.09-12.89h-7.22l-1.95 12.89h-13.23L176.4 3.82zm8.01 24.18l-2.03-12.89h-.08l-2.03 12.89h4.14z" fill={light ? "#FFFFFF" : "#4CAF50"}/>
  </svg>
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
                  <div className="flex gap-2 bg-white px-3 py-1.5 rounded-xl border border-black/5 shadow-sm items-center relative z-10">
                    <VisaIcon />
                    <div className="w-px h-3 bg-black/10 mx-1" />
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
                  <MpesaLogo className={`h-6 transition-all ${paymentMethod === 'manual_mpesa' ? 'opacity-100' : 'opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-100'}`} />
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
                  <span>Pay KSh {finalTotal.toLocaleString()}</span>
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
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-bold text-sm line-clamp-1">{item.name}</h4>
                    <p className="text-xs text-black/40">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-bold text-sm">KSh {(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="space-y-4 pt-6 border-t border-black/10">
              <div className="flex justify-between text-black/40 text-sm">
                <span>Subtotal</span>
                <span>KSh {cartTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-black/40 text-sm">
                <span>Shipping ({distanceNum} km)</span>
                {deliveryCharge === 0 ? (
                  <span className="text-emerald-600 font-bold uppercase tracking-widest text-[10px]">Free</span>
                ) : (
                  <span>KSh {deliveryCharge.toLocaleString()}</span>
                )}
              </div>
              <div className="pt-4 border-t border-black/10 flex justify-between items-end">
                <span className="text-lg font-bold">Total</span>
                <span className="text-3xl font-bold tracking-tighter">KSh {finalTotal.toLocaleString()}</span>
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
