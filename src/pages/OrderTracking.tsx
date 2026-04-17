import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  ArrowLeft, 
  ChevronRight, 
  Loader2,
  ExternalLink,
  ShoppingBag,
  CreditCard,
  Phone
} from 'lucide-react';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface Order {
  id: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'paid' | 'pending_verification' | 'failed' | 'shipped' | 'delivered';
  paymentMethod: 'card' | 'mpesa' | 'manual_mpesa';
  createdAt: string;
  updatedAt?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
}

const OrderTracking = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { user, authFetch } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!user || !orderId) return;
      try {
        const response = await authFetch(`/api/data/orders`);
        if (response.ok) {
          const allOrders = await response.json();
          const foundOrder = allOrders.find((o: any) => o.id === orderId && o.userId === user.uid);
          if (foundOrder) {
            setOrder(foundOrder);
          } else {
            setError("Order not found or you don't have permission to view it.");
          }
        } else {
          setError("Failed to fetch order details.");
        }
      } catch (err) {
        console.error("Error fetching order:", err);
        setError("An error occurred while loading order details.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, user]);

  if (loading) {
    return (
      <div className="pt-32 pb-20 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-emerald-600 mb-4" size={40} />
        <p className="text-black/40 font-medium font-mono text-sm uppercase tracking-widest">Locating Shipment...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="pt-32 pb-20 px-4 max-w-lg mx-auto text-center">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-4">Tracking Error</h2>
        <p className="text-black/50 mb-8">{error || "We couldn't find the tracking information for this order."}</p>
        <Link 
          to="/profile"
          className="inline-flex items-center space-x-2 bg-black text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-all"
        >
          <ArrowLeft size={18} />
          <span>Back to Profile</span>
        </Link>
      </div>
    );
  }

  const steps = [
    { 
      status: 'pending', 
      label: 'Order Placed', 
      icon: Clock,
      completed: true,
      active: order.status === 'pending'
    },
    { 
      status: 'paid', 
      label: 'Payment Verified', 
      icon: CreditCard,
      completed: ['paid', 'shipped', 'delivered'].includes(order.status),
      active: order.status === 'paid' || order.status === 'pending_verification'
    },
    { 
      status: 'shipped', 
      label: 'Out for Delivery', 
      icon: Truck,
      completed: ['shipped', 'delivered'].includes(order.status),
      active: order.status === 'shipped'
    },
    { 
      status: 'delivered', 
      label: 'Delivered', 
      icon: CheckCircle2,
      completed: order.status === 'delivered',
      active: order.status === 'delivered'
    }
  ];

  const activeIndex = steps.findIndex(s => s.active) === -1 
    ? steps.length - 1 
    : steps.findIndex(s => s.active);

  return (
    <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <Helmet>
        <title>Track Order #{order.id} | Wash Pivot</title>
      </Helmet>

      <div className="flex items-center justify-between mb-12">
        <Link to="/profile" className="flex items-center space-x-2 text-black/40 hover:text-emerald-600 transition-all group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold text-sm uppercase tracking-widest">Order History</span>
        </Link>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Tracking ID:</span>
          <span className="font-mono text-sm font-black text-emerald-600">{order.id}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Tracking Status */}
        <div className="lg:col-span-2 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-stone-50 p-10 rounded-[3rem] border border-black/5"
          >
            <div className="flex items-start justify-between mb-12">
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">Tracking Status</h1>
                <p className="text-black/40 text-sm">Update recorded on {new Date(order.updatedAt || order.createdAt).toLocaleDateString()}</p>
              </div>
              <div className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest ${
                order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {order.status.replace('_', ' ')}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative mb-20 px-4">
              <div className="absolute top-1/2 left-0 w-full h-1 bg-stone-200 -translate-y-1/2" />
              <div 
                className="absolute top-1/2 left-0 h-1 bg-emerald-600 -translate-y-1/2 transition-all duration-1000"
                style={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }}
              />
              
              <div className="relative flex justify-between items-center">
                {steps.map((step, idx) => {
                  const Icon = step.icon;
                  const isCompleted = step.completed;
                  const isActive = step.active;
                  
                  return (
                    <div key={idx} className="flex flex-col items-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-xl transition-all duration-500 z-10 ${
                        isCompleted ? 'bg-emerald-600 text-white' : isActive ? 'bg-black text-white' : 'bg-stone-100 text-black/20'
                      }`}>
                        {isCompleted ? <CheckCircle2 size={20} /> : <Icon size={20} />}
                      </div>
                      <div className="absolute mt-16 text-center">
                        <p className={`text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${
                          isCompleted || isActive ? 'text-black' : 'text-black/20'
                        }`}>
                          {step.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-24 grid grid-cols-1 md:grid-cols-2 gap-6 pt-10 border-t border-black/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-black/20 border border-black/5">
                  <MapPin size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">Ship to</p>
                  <p className="font-bold text-sm">Nairobi, Kenya</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-black/20 border border-black/5">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">Est. Delivery</p>
                  <p className="font-bold text-sm">May 12 - May 15, 2026</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Order Items */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-10 rounded-[3rem] border border-black/5"
          >
            <h3 className="text-xl font-bold mb-8">Order Summary</h3>
            <div className="space-y-6">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between group">
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 bg-stone-50 rounded-2xl overflow-hidden border border-black/5 group-hover:scale-105 transition-transform duration-500">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm group-hover:text-emerald-600 transition-colors">{item.name}</h4>
                      <p className="text-xs text-black/40">Quantity: {item.quantity}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">KES {(item.price * item.quantity).toLocaleString()}</p>
                    <p className="text-[10px] text-black/40">KES {item.price.toLocaleString()} each</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-8 border-t border-black/5 flex justify-between items-center text-lg font-black uppercase tracking-tighter">
              <span>Total Amount</span>
              <span className="text-emerald-600">KES {order.totalAmount.toLocaleString()}</span>
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <div className="bg-black text-white p-8 rounded-[2.5rem] shadow-2xl shadow-emerald-600/20">
            <div className="flex items-center space-x-3 mb-6">
              <ShoppingBag size={24} className="text-emerald-500" />
              <h3 className="font-bold">Need Help?</h3>
            </div>
            <p className="text-white/50 text-sm mb-8 leading-relaxed">
              If you have any issues with your delivery or the products received, our support team is ready to assist you.
            </p>
            <div className="space-y-4">
              <a 
                href="/contact" 
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 transition-all"
              >
                <span>Contact Support</span>
                <ChevronRight size={16} />
              </a>
              <a 
                href="https://wa.me/254712890155" 
                target="_blank" 
                rel="noreferrer" 
                className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 transition-all border border-white/5"
              >
                <Phone size={16} />
                <span>WhatsApp Chat</span>
              </a>
            </div>
          </div>

          <div className="bg-stone-50 p-8 rounded-[2.5rem] border border-black/5">
            <h3 className="font-bold mb-6">Payment Method</h3>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-black/20 border border-black/5">
                <CreditCard size={24} />
              </div>
              <div>
                <p className="font-bold text-sm uppercase tracking-tight">
                  {order.paymentMethod === 'card' ? 'Credit / Debit Card' : 'Mobile Money (M-Pesa)'}
                </p>
                <p className="text-xs text-black/40">Paid on {new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
