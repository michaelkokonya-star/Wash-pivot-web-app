import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Marketplace from './pages/Marketplace';
import Recruitment from './pages/Recruitment';
import MicroFunding from './pages/MicroFunding';
import ProjectDetail from './pages/ProjectDetail';
import BuildProject from './pages/BuildProject';
import ProductDetail from './pages/ProductDetail';
import About from './pages/About';
import Team from './pages/Team';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './components/Logo';

import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import AdminProjectDetails from './pages/AdminProjectDetails';
import ProvisionOwner from './pages/ProvisionOwner';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import CheckoutSuccess from './pages/CheckoutSuccess';
import OrderTracking from './pages/OrderTracking';
import Auth from './pages/Auth';
import CreativeStudio from './pages/CreativeStudio';
import WelcomeOnboarding from './components/WelcomeOnboarding';
import ProtectedRoute from './components/ProtectedRoute';
import VerificationBanner from './components/VerificationBanner';

import { Toaster } from 'sonner';

import ErrorBoundary from './components/ErrorBoundary';
import WhatsAppButton from './components/WhatsAppButton';

// Main Application Component - Updated 2026-03-24
function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <CartProvider>
          <Router>
            <ErrorBoundary>
              <div className="min-h-screen bg-white font-sans text-black selection:bg-emerald-200">
                <Toaster position="top-center" expand={false} richColors />
                <Navbar />
                <VerificationBanner />
                <WelcomeOnboarding />
                <WhatsAppButton />
                <main>
                  <AnimatePresence mode="wait">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/signin" element={<Auth />} />
                      <Route path="/signup" element={<Auth />} />
                      <Route path="/provision-owner" element={<ProvisionOwner />} />
                      <Route path="/marketplace" element={<Marketplace />} />
                      <Route path="/marketplace/:id" element={<ProductDetail />} />
                      <Route path="/cart" element={<Cart />} />
                      <Route path="/checkout" element={<Checkout />} />
                      <Route path="/checkout/success" element={<CheckoutSuccess />} />
                      <Route path="/track/:orderId" element={
                        <ProtectedRoute>
                          <OrderTracking />
                        </ProtectedRoute>
                      } />
                      <Route path="/recruitment" element={<Recruitment />} />
                      <Route path="/funding" element={<MicroFunding />} />
                      <Route path="/funding/:id" element={<ProjectDetail />} />
                      <Route path="/build" element={
                        <ProtectedRoute requireVerification>
                          <BuildProject />
                        </ProtectedRoute>
                      } />
                      <Route path="/about" element={<About />} />
                      <Route path="/team" element={<Team />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/privacy" element={<Privacy />} />
                      <Route path="/ai-studio" element={
                        <ProtectedRoute requireVerification>
                          <CreativeStudio />
                        </ProtectedRoute>
                      } />
                      <Route path="/profile" element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      } />
                      <Route path="/admin" element={
                        <ProtectedRoute allowedRoles={['admin']} requireVerification>
                          <AdminDashboard />
                        </ProtectedRoute>
                      } />
                      <Route path="/admin/projects/:id" element={
                        <ProtectedRoute allowedRoles={['admin']} requireVerification>
                          <AdminProjectDetails />
                        </ProtectedRoute>
                      } />
                    </Routes>
                  </AnimatePresence>
                </main>
                
                <footer className="bg-black text-white py-20 mt-20">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                      <div className="col-span-2">
                        <Link to="/" className="flex items-center mb-6">
                          <Logo light className="h-12" />
                        </Link>
                        <p className="text-white/50 max-w-sm leading-relaxed">
                          A social enterprise offering sustainable solutions in solar energy, water treatment, and sanitation. Empowering communities through technology and expertise.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-bold mb-6 uppercase tracking-widest text-xs text-white/40">Platform</h4>
                        <ul className="space-y-4 text-sm">
                          <li><Link to="/marketplace" className="hover:text-emerald-500 transition-colors">Marketplace</Link></li>
                          <li><Link to="/recruitment" className="hover:text-emerald-500 transition-colors">Expert Network</Link></li>
                          <li><Link to="/funding" className="hover:text-emerald-500 transition-colors">Micro Funding</Link></li>
                          <li><Link to="/build" className="hover:text-emerald-500 transition-colors">Project & Kit Builder</Link></li>
                          <li><Link to="/ai-studio" className="hover:text-emerald-500 transition-colors">AI Creative Studio</Link></li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-bold mb-6 uppercase tracking-widest text-xs text-white/40">Company</h4>
                        <ul className="space-y-4 text-sm">
                          <li><Link to="/about" className="hover:text-emerald-500 transition-colors">About Us</Link></li>
                          <li><Link to="/team" className="hover:text-emerald-500 transition-colors">Our Team</Link></li>
                          <li><Link to="/contact" className="hover:text-emerald-500 transition-colors">Contact</Link></li>
                          <li><Link to="/privacy" className="hover:text-emerald-500 transition-colors">Privacy Policy</Link></li>
                        </ul>
                      </div>
                    </div>
                    <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/30">
                      <p>© 2026 Wash Pivot. All rights reserved.</p>
                      <div className="flex space-x-6">
                        <a href="https://twitter.com/washpivot" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Twitter</a>
                        <a href="https://linkedin.com/company/washpivot" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">LinkedIn</a>
                        <a href="https://instagram.com/washpivot" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Instagram</a>
                      </div>
                    </div>
                  </div>
                </footer>
              </div>
            </ErrorBoundary>
          </Router>
        </CartProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
