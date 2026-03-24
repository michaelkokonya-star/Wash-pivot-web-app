import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
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
import { motion, AnimatePresence } from 'motion/react';
import Logo from './components/Logo';

import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import WelcomeOnboarding from './components/WelcomeOnboarding';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-white font-sans text-black selection:bg-emerald-200">
            <Navbar />
            <WelcomeOnboarding />
            <main>
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/marketplace/:id" element={<ProductDetail />} />
                  <Route path="/recruitment" element={<Recruitment />} />
                  <Route path="/funding" element={<MicroFunding />} />
                  <Route path="/funding/:id" element={<ProjectDetail />} />
                  <Route path="/build" element={
                    <ProtectedRoute>
                      <BuildProject />
                    </ProtectedRoute>
                  } />
                  <Route path="/about" element={<About />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } />
                </Routes>
              </AnimatePresence>
            </main>
            
            <footer className="bg-black text-white py-20 mt-20">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                  <div className="col-span-2">
                    <div className="flex items-center mb-6">
                      <Logo light className="h-12" />
                    </div>
                    <p className="text-white/50 max-w-sm leading-relaxed">
                      A social enterprise offering sustainable solutions in solar energy, water treatment, and sanitation. Empowering communities through technology and expertise.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold mb-6 uppercase tracking-widest text-xs text-white/40">Platform</h4>
                    <ul className="space-y-4 text-sm">
                      <li><a href="#" className="hover:text-emerald-500 transition-colors">Marketplace</a></li>
                      <li><a href="#" className="hover:text-emerald-500 transition-colors">Expert Network</a></li>
                      <li><a href="#" className="hover:text-emerald-500 transition-colors">Micro Funding</a></li>
                      <li><a href="#" className="hover:text-emerald-500 transition-colors">Project Builder</a></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold mb-6 uppercase tracking-widest text-xs text-white/40">Company</h4>
                    <ul className="space-y-4 text-sm">
                      <li><a href="#" className="hover:text-emerald-500 transition-colors">About Us</a></li>
                      <li><a href="#" className="hover:text-emerald-500 transition-colors">Impact Reports</a></li>
                      <li><a href="#" className="hover:text-emerald-500 transition-colors">Contact</a></li>
                      <li><a href="#" className="hover:text-emerald-500 transition-colors">Privacy Policy</a></li>
                    </ul>
                  </div>
                </div>
                <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/30">
                  <p>© 2026 Wash Pivot. All rights reserved.</p>
                  <div className="flex space-x-6">
                    <a href="#" className="hover:text-white transition-colors">Twitter</a>
                    <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
                    <a href="#" className="hover:text-white transition-colors">Instagram</a>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </Router>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
