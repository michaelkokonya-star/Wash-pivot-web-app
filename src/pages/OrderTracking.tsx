import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft, Package, Truck, CheckCircle2, Clock, MapPin, AlertCircle, ShoppingBag, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Order {
  id: string;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'failed';
  items: any[];
  totalAmount: number;
  deliveryCharge: number;
  createdAt: string;
  shippingInfo: any;
  paymentMethod: string;
}

const OrderTracking = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { authFetch } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await authFetch(`/api/data/orders/${orderId}`);
        if (response.ok) {
          const data = await response.json();
          setOrder(data);
        } else {
          setError('Order not found');
        }
      } catch (err) {
        console.error('Error fetching order:', err);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId, authFetch]);

  if (loading) {
    return (
      <div className="pt-32 pb-20 px-4 text-center">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-black/40 font-bold uppercase tracking-widest text-xs">Locating Order...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="pt-32 pb-20 px-4 text-center">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-4">{error || 'Order Not Found'}</h2>
        <Link to="/profile" className="text-emerald-600 font-bold hover:underline">
          Return to Profile
        </Link>
      </div>
    );
  }

  const steps = [
    { id: 'pending', label: 'Order Placed', icon: Clock, description: 'We have received your order' },
    { id: 'paid', label: 'Payment Confirmed', icon: CheckCircle2, description: 'Payment has been successfully processed' },
    { id: 'shipped', label: 'Shipped', icon: Truck, description: 'Your order is on its way to you' },
    { id: 'delivered', label: 'Delivered', icon: Package, description: 'Package has been delivered' },
  ];

  const currentStepIndex = steps.findIndex(step => step.id === order.status);
  
  // Custom logic for tracking progress
  // If failed, we show red. If beyond a step, it's green.
  
  const getStepStatus = (index: number) => {
    if (order.status === 'failed') return 'failed';
    if (index < currentStepIndex) return 'complete';
    if (index === currentStepIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <Helmet>
        <title>Track Order #{order.id.slice(0, 8)} | Wash Pivot</title>
      </Helmet>

      <div className="flex items-center space-x-2 text-black/50 hover:text-black transition-colors mb-12 cursor-pointer" onClick={() => navigate('/profile')}>
        <ChevronLeft size={18} />
        <span className="font-bold uppercase tracking-widest text-xs">Back to Profile</span>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter mb-2 uppercase">Track Order</h1>
          <p className="text-black/40 font-mono text-sm font-bold uppercase tracking-widest">#{order.id}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-1">Placed on</p>
          <p className="text-lg font-bold">{new Date(order.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          {/* Tracking visualization */}
          <div className="bg-white p-10 rounded-[3rem] border border-black/5 shadow-xl shadow-black/5">
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-stone-100 md:left-0 md:top-[27px] md:bottom-auto md:w-full md:h-0.5" />
              <motion.div 
                className="absolute left-[27px] top-6 w-0.5 bg-emerald-600 md:left-0 md:top-[27px] md:h-0.5"
                initial={{ height: 0, width: 0 }}
                animate={{ 
                  height: window.innerWidth < 768 ? `${(currentStepIndex / (steps.length - 1)) * 100}%` : '2px',
                  width: window.innerWidth >= 768 ? `${(currentStepIndex / (steps.length - 1)) * 100}%` : '2px'
                }}
              />

              <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center space-y-12 md:space-y-0">
                {steps.map((step, index) => {
                  const status = getStepStatus(index);
                  const Icon = step.icon;
                  
                  return (
                    <div key={step.id} className="relative flex items-center md:flex-col group">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 z-10 ${
                        status === 'complete' || status === 'active' 
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                          : 'bg-stone-50 text-black/20 border border-black/5'
                      }`}>
                        <Icon size={24} />
                      </div>
                      
                      <div className="ml-6 md:ml-0 md:mt-4 text-left md:text-center">
                        <p className={`font-bold text-sm tracking-tight mb-0.5 ${
                          status === 'active' ? 'text-black' : 
                          status === 'complete' ? 'text-emerald-600' : 
                          'text-black/30'
                        }`}>
                          {step.label}
                        </p>
                        <p className="text-[10px] text-black/40 font-medium max-w-[120px] line-clamp-2 md:mx-auto">
                          {status === 'active' || status === 'complete' ? step.description : ''}
                        </p>
                      </div>

                      {status === 'active' && (
                        <motion.div
                          layoutId="pulse"
                          className="absolute -inset-1 rounded-[20px] bg-emerald-600/10 z-0"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {order.status === 'failed' && (
              <div className="mt-12 p-6 bg-red-50 rounded-3xl border border-red-100 flex items-start space-x-4">
                <AlertCircle className="text-red-500 shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-red-900 mb-1 leading-none">Order Issue Detected</h4>
                  <p className="text-xs text-red-700/70">Payment failed or was cancelled. Please contact support or try placing the order again.</p>
                </div>
              </div>
            )}
          </div>

          {/* Shipping Details */}
          <div className="bg-stone-50 p-10 rounded-[3rem] border border-black/5 divide-y divide-black/5">
            <div className="pb-8">
              <h3 className="text-lg font-bold mb-6 flex items-center space-x-2">
                <MapPin size={20} className="text-emerald-600" />
                <span>Shipping Address</span>
              </h3>
              <div className="space-y-1 text-black/60 font-medium">
                <p className="text-black font-bold">{order.shippingInfo.firstName} {order.shippingInfo.lastName}</p>
                <p>{order.shippingInfo.address}</p>
                <p>{order.shippingInfo.city}</p>
                <p>{order.shippingInfo.phone}</p>
              </div>
            </div>

            <div className="pt-8 flex flex-col md:flex-row justify-between gap-8">
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-4">Payment Info</h3>
                <div className="inline-flex items-center px-4 py-2 bg-white rounded-xl border border-black/5 text-sm font-bold uppercase tracking-widest">
                  {order.paymentMethod === 'card' ? 'Visa / Mastercard' : 'M-Pesa'}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-4">Support</h3>
                <p className="text-xs text-black/40 leading-relaxed">
                  Having trouble with your delivery? Contact our logistics partners at 
                  <span className="text-black font-bold ml-1">support@washpivot.com</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Items Summary Card */}
        <div>
          <div className="bg-white p-8 rounded-[3rem] border border-black/5 sticky top-32 shadow-xl shadow-black/5">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold uppercase tracking-widest text-xs text-black/40">Order Items</h3>
              <span className="text-xs font-bold bg-stone-100 px-3 py-1 rounded-full uppercase tracking-widest">
                {order.items.length} {order.items.length === 1 ? 'Item' : 'Items'}
              </span>
            </div>

            <div className="space-y-6 mb-8 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-stone-50 border border-black/5 shrink-0">
                    <img src={item.imageUrl || item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm truncate">{item.name}</h4>
                    <p className="text-[10px] text-black/40 font-bold uppercase tracking-widest">Qty: {item.quantity}</p>
                    <p className="text-xs font-bold text-emerald-600 mt-1">KES {item.price.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4 pt-6 border-t border-black/5">
              <div className="flex justify-between text-xs font-medium text-black/40">
                <span>Subtotal</span>
                <span>KES {(order.totalAmount - (order.deliveryCharge || 0)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-medium text-black/40">
                <span>Delivery</span>
                <span>KES {(order.deliveryCharge || 0).toLocaleString()}</span>
              </div>
              <div className="pt-4 flex justify-between items-end border-t border-black/5">
                <span className="text-sm font-bold uppercase tracking-widest text-black/40">Total</span>
                <span className="text-2xl font-bold tracking-tighter">KES {order.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <Link 
              to="/marketplace"
              className="mt-8 w-full py-4 bg-stone-100 text-black font-bold rounded-2xl hover:bg-black hover:text-white transition-all flex items-center justify-center space-x-2 group"
            >
              <ShoppingBag size={18} />
              <span>Back to Shop</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
