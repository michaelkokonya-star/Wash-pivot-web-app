import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Send, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';

const VerificationBanner = () => {
  const { user, sendVerification, refreshUser } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Only show if user is logged in, not verified, and not a guest (anonymous)
  if (!user || user.emailVerified || user.isAnonymous || !isVisible) {
    return null;
  }

  const handleResend = async () => {
    setIsSending(true);
    try {
      await sendVerification();
      toast.success('Verification email sent! Please check your inbox.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send verification email.');
    } finally {
      setIsSending(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshUser();
      if (user.emailVerified) {
        toast.success('Email verified! You now have full access.');
      } else {
        toast.info('Email still not verified. Please check your inbox.');
      }
    } catch (error: any) {
      toast.error('Failed to refresh user status.');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 py-3 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-sm font-medium text-amber-800">
            Your email address is not verified. Some features may be restricted.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleResend}
            disabled={isSending}
            className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-amber-700 hover:text-amber-900 transition-colors disabled:opacity-50"
          >
            {isSending ? (
              <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
            ) : (
              <Send className="h-3 w-3 mr-2" />
            )}
            Resend Email
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-emerald-700 hover:text-emerald-900 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            I've Verified
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-amber-400 hover:text-amber-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerificationBanner;
