import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isResetMode) {
        await resetPassword(email);
        setResetSent(true);
      } else if (isLogin) {
        await signIn(email, password);
        navigate(from, { replace: true });
      } else {
        await signUp(email, password, displayName);
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during authentication');
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
          <h1 className="text-4xl font-bold tracking-tighter mb-2 uppercase">
            {isResetMode ? 'Reset Password' : isLogin ? 'Welcome Back' : 'Join Wash Pivot'}
          </h1>
          <p className="text-black/40 text-sm">
            {isResetMode 
              ? 'Enter your email to receive a reset link' 
              : isLogin 
                ? 'Enter your credentials to access your account' 
                : 'Create an account to start building sustainable solutions'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {resetSent ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10"
            >
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Check your email</h3>
              <p className="text-black/40 text-sm mb-8">We've sent a password reset link to {email}</p>
              <button 
                onClick={() => {
                  setIsResetMode(false);
                  setResetSent(false);
                }}
                className="text-emerald-600 font-bold text-sm hover:underline"
              >
                Back to Login
              </button>
            </motion.div>
          ) : (
            <motion.form 
              key={isLogin ? 'login' : 'signup'}
              initial={{ opacity: 0, x: isLogin ? -10 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLogin ? 10 : -10 }}
              onSubmit={handleSubmit} 
              className="space-y-4"
            >
              {!isLogin && !isResetMode && (
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={18} />
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-stone-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-emerald-600 outline-none transition-all"
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={18} />
                <input
                  type="email"
                  placeholder="Email Address"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-stone-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-emerald-600 outline-none transition-all"
                />
              </div>

              {!isResetMode && (
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={18} />
                  <input
                    type="password"
                    placeholder="Password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-stone-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-emerald-600 outline-none transition-all"
                  />
                </div>
              )}

              {error && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-2xl text-xs font-bold">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              {isLogin && !isResetMode && (
                <div className="text-right">
                  <button 
                    type="button"
                    onClick={() => setIsResetMode(true)}
                    className="text-xs font-bold text-black/40 hover:text-black transition-colors"
                  >
                    Forgot Password?
                  </button>
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
                    <span>{isResetMode ? 'Send Reset Link' : isLogin ? 'Sign In' : 'Create Account'}</span>
                    {!isResetMode && <ArrowRight size={18} />}
                  </>
                )}
              </button>

              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (isResetMode) {
                      setIsResetMode(false);
                    } else {
                      setIsLogin(!isLogin);
                    }
                    setError(null);
                  }}
                  className="text-xs font-bold text-black/40 hover:text-black transition-colors"
                >
                  {isResetMode 
                    ? 'Back to Login' 
                    : isLogin 
                      ? "Don't have an account? Sign Up" 
                      : "Already have an account? Sign In"}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Auth;
