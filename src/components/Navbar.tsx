import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Menu, X, LogIn, User as UserIcon, ChevronDown, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';

const Navbar = () => {
  const { user, profile, signIn, logout } = useAuth();
  const { cartCount } = useCart();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isAboutOpen, setIsAboutOpen] = React.useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Marketplace', path: '/marketplace' },
    { name: 'Experts', path: '/recruitment' },
    { name: 'Funding', path: '/funding' },
    { name: 'Build', path: '/build' },
  ];

  const isSuperAdmin = user?.email?.toLowerCase() === 'michael.kokonya@washpivot.com';

  if (isSuperAdmin) {
    navLinks.push({ name: 'Admin', path: '/admin' });
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <Logo className="h-10" />
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors hover:text-emerald-600 ${
                  location.pathname === link.path ? 'text-emerald-600' : 'text-black/60'
                }`}
              >
                {link.name}
              </Link>
            ))}

            {/* About Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setIsAboutOpen(true)}
              onMouseLeave={() => setIsAboutOpen(false)}
            >
              <button 
                className={`flex items-center space-x-1 text-sm font-medium transition-colors hover:text-emerald-600 ${
                  location.pathname.startsWith('/about') || location.pathname.startsWith('/team') ? 'text-emerald-600' : 'text-black/60'
                }`}
              >
                <span>About</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isAboutOpen ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {isAboutOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 mt-2 w-48 bg-white border border-black/5 rounded-2xl shadow-xl overflow-hidden py-2"
                  >
                    <Link
                      to="/about"
                      className="block px-4 py-3 text-sm font-medium text-black/60 hover:text-emerald-600 hover:bg-stone-50 transition-colors"
                    >
                      About Us
                    </Link>
                    <Link
                      to="/team"
                      className="block px-4 py-3 text-sm font-medium text-black/60 hover:text-emerald-600 hover:bg-stone-50 transition-colors"
                    >
                      Our Team
                    </Link>
                    <Link
                      to="/contact"
                      className="block px-4 py-3 text-sm font-medium text-black/60 hover:text-emerald-600 hover:bg-stone-50 transition-colors"
                    >
                      Contact Us
                    </Link>
                    <Link
                      to="/privacy"
                      className="block px-4 py-3 text-sm font-medium text-black/60 hover:text-emerald-600 hover:bg-stone-50 transition-colors"
                    >
                      Privacy Policy
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {user ? (
              <div className="flex items-center space-x-4">
                <Link to="/cart" className="p-2 hover:bg-black/5 rounded-full transition-colors relative group">
                  <ShoppingCart size={20} className="group-hover:text-emerald-600 transition-colors" />
                  {cartCount > 0 && (
                    <span className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                      {cartCount}
                    </span>
                  )}
                </Link>
                <Link to="/profile" className="p-2 hover:bg-black/5 rounded-full transition-colors">
                  <UserIcon size={20} />
                </Link>
                <button
                  onClick={logout}
                  className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-black/80 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/cart" className="p-2 hover:bg-black/5 rounded-full transition-colors relative group">
                  <ShoppingCart size={20} className="group-hover:text-emerald-600 transition-colors" />
                  {cartCount > 0 && (
                    <span className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                      {cartCount}
                    </span>
                  )}
                </Link>
                <Link
                  to="/signin"
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center space-x-2"
                >
                  <LogIn size={18} />
                  <span>Sign In</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-black/60 hover:text-black transition-colors"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden bg-white border-b border-black/5"
          >
            <div className="px-4 pt-2 pb-6 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-4 text-base font-medium text-black/60 hover:text-emerald-600 hover:bg-black/5 rounded-lg transition-all"
                >
                  {link.name}
                </Link>
              ))}
              
              {/* Mobile About Links */}
              <div className="pt-2 pb-2 space-y-1">
                <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-black/30 mb-2">About</p>
                <Link
                  to="/about"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-4 text-base font-medium text-black/60 hover:text-emerald-600 hover:bg-black/5 rounded-lg transition-all"
                >
                  About Us
                </Link>
                <Link
                  to="/team"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-4 text-base font-medium text-black/60 hover:text-emerald-600 hover:bg-black/5 rounded-lg transition-all"
                >
                  Our Team
                </Link>
                <Link
                  to="/contact"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-4 text-base font-medium text-black/60 hover:text-emerald-600 hover:bg-black/5 rounded-lg transition-all"
                >
                  Contact Us
                </Link>
                <Link
                  to="/privacy"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-4 text-base font-medium text-black/60 hover:text-emerald-600 hover:bg-black/5 rounded-lg transition-all"
                >
                  Privacy Policy
                </Link>
              </div>

              <div className="pt-4 border-t border-black/5">
                <Link
                  to="/cart"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-4 text-base font-medium text-black/60 hover:text-emerald-600 flex items-center justify-between"
                >
                  <span>Shopping Cart</span>
                  {cartCount > 0 && (
                    <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {cartCount}
                    </span>
                  )}
                </Link>
                {user ? (
                  <div className="space-y-2">
                    <Link
                      to="/profile"
                      onClick={() => setIsOpen(false)}
                      className="block px-3 py-4 text-base font-medium text-black/60 hover:text-emerald-600"
                    >
                      Profile
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setIsOpen(false);
                      }}
                      className="w-full text-left px-3 py-4 text-base font-medium text-red-600"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/signin"
                    onClick={() => setIsOpen(false)}
                    className="block px-3 py-4 text-base font-medium text-emerald-600"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
