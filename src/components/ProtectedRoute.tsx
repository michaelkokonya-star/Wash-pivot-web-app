import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireAuth?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles, 
  requireAuth = true 
}) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (requireAuth && !user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (allowedRoles && profile) {
    const isSuperAdmin = user?.email?.toLowerCase() === 'michael.kokonya@washpivot.com';
    const isAllowed = allowedRoles.includes(profile.role) || (allowedRoles.includes('admin') && isSuperAdmin);
    
    if (!isAllowed) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
