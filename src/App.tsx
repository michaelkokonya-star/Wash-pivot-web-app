import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Link } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SettingsProvider } from './context/SettingsContext';
import Navbar from './components/Navbar';
import Logo from './components/Logo';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';

import WelcomeOnboarding from './components/WelcomeOnboarding';
import ProtectedRoute from './components/ProtectedRoute';
import VerificationBanner from './components/VerificationBanner';

import { Toaster } from 'sonner';

import ErrorBoundary from './components/ErrorBoundary';
import WhatsAppButton from './components/WhatsAppButton';

// Lazy load pages for performance
const Home = lazy(() => import('./pages/Home'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const Recruitment = lazy(() => import('./pages/Recruitment'));
const MicroFunding = lazy(() => import('./pages/MicroFunding'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const BuildProject = lazy(() => import('./pages/BuildProject'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const About = lazy(() => import('./pages/About'));
const Team = lazy(() => import('./pages/Team'));
const Contact = lazy(() => import('./pages/Contact'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminProjectDetails = lazy(() => import('./pages/AdminProjectDetails'));
const ProvisionOwner = lazy(() => import('./pages/ProvisionOwner'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const CheckoutSuccess = lazy(() => import('./pages/CheckoutSuccess'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const Auth = lazy(() => import('./pages/Auth'));
const CreativeStudio = lazy(() => import('./pages/CreativeStudio'));
const ProductCatalogue = lazy(() => import('./pages/ProductCatalogue'));

const PageLoader = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center space-y-4"
    >
      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      <p className="text-sm font-medium text-black/40 uppercase tracking-widest">Loading Platform...</p>
    </motion.div>
  </div>
);

// Main Application Component - Updated 2026-03-24
function AppContent() {
  const location = useLocation();

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-white font-sans text-black selection:bg-emerald-200">
        <Toaster position="top-center" expand={false} richColors />
        <Navbar />
        <VerificationBanner />
        <WelcomeOnboarding />
        <WhatsAppButton />
        <main>
          <Suspense fallback={<PageLoader />}>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
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
                        <Route path="/catalogue" element={
                          <ProtectedRoute>
                            <ProductCatalogue />
                          </ProtectedRoute>
                        } />
                      </Routes>
                    </AnimatePresence>
                  </Suspense>
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
  );
}

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <SettingsProvider>
          <CartProvider>
            <Router>
              <AppContent />
            </Router>
          </CartProvider>
        </SettingsProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
