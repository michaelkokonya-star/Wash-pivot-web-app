import React, { useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { motion } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { CheckCircle2, ShoppingBag, ArrowRight, Mail, Package } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

const CheckoutSuccess = () => {
  const { clearCart } = useCart();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  const method = searchParams.get('method');
  const isManualMpesa = method === 'manual_mpesa';

  useEffect(() => {
    const finalizeOrder = async () => {
      clearCart();
      if (orderId) {
        try {
          await fetch(`/api/data/orders/${orderId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: isManualMpesa ? 'pending_verification' : 'paid',
              paidAt: isManualMpesa ? null : new Date().toISOString()
            })
          });
        } catch (error) {
          console.error("Error updating order status:", error);
        }
      }
    };
    finalizeOrder();
  }, [orderId, isManualMpesa]);

  return (
    <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto text-center">
      <Helmet>
        <title>Order Successful | Wash Pivot</title>
      </Helmet>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-stone-50 p-12 sm:p-20 rounded-[4rem] border border-black/5 shadow-2xl shadow-emerald-600/5"
      >
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-10">
          <CheckCircle2 size={48} />
        </div>

        <h1 className="text-5xl font-bold tracking-tighter mb-6 uppercase">
          {isManualMpesa ? 'Order Placed!' : 'Order Successful!'}
        </h1>
        <p className="text-black/50 text-lg mb-12 leading-relaxed max-w-md mx-auto">
          {isManualMpesa 
            ? "Your order has been placed. Please ensure you have completed the M-Pesa payment. Our team will verify the transaction and update your order status shortly."
            : "Thank you for your purchase. Your order has been placed successfully and is being processed."}
        </p>

        {isManualMpesa && (
          <div className="mb-12 p-8 bg-[#4CAF50] text-white rounded-[3rem] shadow-xl text-center">
            <h3 className="text-xl font-black uppercase tracking-tighter mb-4">Payment Instructions</h3>
            <p className="text-sm mb-6 opacity-90">Please pay the total amount to the Till Number below if you haven't already:</p>
            <div className="flex justify-center gap-1 mb-6">
              {['8', '5', '0', '0', '1', '3', '2'].map((digit, i) => (
                <div key={i} className="w-8 h-10 bg-white text-[#4CAF50] rounded flex items-center justify-center text-xl font-black shadow-lg">
                  {digit}
                </div>
              ))}
            </div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-80">Account: MICHAEL KOKONYA OKUO</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          {orderId && (
            <div className="sm:col-span-2 p-6 bg-emerald-600 text-white rounded-3xl flex items-center gap-4 text-left">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Package size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Order ID</p>
                <p className="font-bold text-sm">{orderId}</p>
              </div>
            </div>
          )}
          <div className="p-6 bg-white rounded-3xl border border-black/5 flex items-center gap-4 text-left">
            <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center text-black/40">
              <Mail size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">Confirmation</p>
              <p className="font-bold text-sm">Sent to your email</p>
            </div>
          </div>
          <div className="p-6 bg-white rounded-3xl border border-black/5 flex items-center gap-4 text-left">
            <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center text-black/40">
              <ShoppingBag size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">Delivery</p>
              <p className="font-bold text-sm">7-14 business days</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/marketplace"
            className="px-8 py-4 bg-black text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all flex items-center justify-center space-x-3"
          >
            <span>Back to Marketplace</span>
            <ArrowRight size={20} />
          </Link>
          <Link
            to="/profile"
            className="px-8 py-4 bg-white text-black border-2 border-black font-bold rounded-2xl hover:bg-stone-50 transition-all"
          >
            View My Orders
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default CheckoutSuccess;
