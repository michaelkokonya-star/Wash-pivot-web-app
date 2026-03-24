import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, Key, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProvisionOwner = () => {
  const [secret, setSecret] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/admin/provision-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to provision password');
      }

      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 flex items-center justify-center bg-stone-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-xl shadow-black/5 border border-black/5"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tighter mb-2 uppercase">
            System Provisioning
          </h1>
          <p className="text-black/40 text-sm">
            Securely set the password for the system owner account.
          </p>
        </div>

        {success ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6"
          >
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">Provisioning Successful</h3>
            <p className="text-black/40 text-sm mb-8">The password for michael.kokonya@washpivot.com has been updated.</p>
            <button 
              onClick={() => navigate('/signin')}
              className="w-full bg-black text-white rounded-2xl py-4 font-bold text-sm flex items-center justify-center space-x-2 hover:bg-stone-800 transition-all"
            >
              <span>Go to Sign In</span>
              <ArrowRight size={18} />
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={18} />
              <input
                type="password"
                placeholder="Provisioning Secret"
                required
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="w-full bg-stone-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-emerald-600 outline-none transition-all"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={18} />
              <input
                type="password"
                placeholder="New Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-stone-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-emerald-600 outline-none transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-2xl text-xs font-bold">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white rounded-2xl py-4 font-bold text-sm flex items-center justify-center space-x-2 hover:bg-stone-800 transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <span>Provision Password</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <p className="text-[10px] text-center text-black/30 mt-6">
              This page is for administrative use only. Ensure you have set the <code>PROVISIONING_SECRET</code> in the environment variables.
            </p>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default ProvisionOwner;
