import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { User, Mail, Shield, Award, GraduationCap, Briefcase, CheckCircle2, Clock, Settings, LogOut, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  if (!user || !profile) {
    return (
      <div className="pt-32 px-8 text-center min-h-screen">
        <h1 className="text-3xl font-bold mb-4">Please Sign In</h1>
        <button 
          onClick={() => navigate('/')}
          className="text-emerald-600 font-bold hover:underline"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const completionSteps = [
    { label: "Account Created", completed: true },
    { label: "Email Verified", completed: user.emailVerified },
    { label: "Profile Details", completed: !!profile.displayName },
    { label: "Expert Network", completed: profile.role === 'expert' },
    { label: "Professional Bio", completed: !!profile.bio && profile.bio.length > 50 },
  ];

  const completionPercentage = Math.round((completionSteps.filter(s => s.completed).length / completionSteps.length) * 100);

  return (
    <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-stone-50 p-8 rounded-[2.5rem] border border-black/5 text-center">
            <div className="relative inline-block mb-6">
              <img
                src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}`}
                alt={profile.displayName}
                className="w-32 h-32 rounded-[2rem] object-cover border-4 border-white shadow-xl"
                referrerPolicy="no-referrer"
              />
              {profile.role === 'expert' && (
                <div className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-2 rounded-xl shadow-lg">
                  <Award size={20} />
                </div>
              )}
            </div>
            <h2 className="text-2xl font-bold mb-1">{profile.displayName}</h2>
            <p className="text-black/40 text-sm mb-6">{profile.email}</p>
            
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${profile.role === 'admin' ? 'bg-purple-100 text-purple-700' : profile.role === 'expert' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-black/40'}`}>
                {profile.role}
              </span>
              {user.emailVerified && (
                <span className="px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center space-x-1">
                  <Shield size={10} />
                  <span>Verified</span>
                </span>
              )}
            </div>

            <button
              onClick={logout}
              className="w-full py-4 bg-white text-black border border-black/10 font-bold rounded-2xl hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all flex items-center justify-center space-x-2"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Completion Checklist */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-black/5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg">Profile Completion</h3>
              <span className="text-emerald-600 font-bold text-sm">{completionPercentage}%</span>
            </div>
            <div className="w-full h-2 bg-stone-100 rounded-full mb-8 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionPercentage}%` }}
                className="h-full bg-emerald-600"
              />
            </div>
            <ul className="space-y-4">
              {completionSteps.map((step, idx) => (
                <li key={idx} className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${step.completed ? 'text-black/60' : 'text-black/30'}`}>
                    {step.label}
                  </span>
                  {step.completed ? (
                    <CheckCircle2 size={18} className="text-emerald-600" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-stone-200" />
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-stone-50 p-10 rounded-[3rem] border border-black/5">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-3xl font-bold tracking-tight">Profile Details</h3>
              <button className="p-3 bg-white rounded-2xl border border-black/5 hover:bg-stone-100 transition-all">
                <Settings size={20} className="text-black/40" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2 block">Full Name</label>
                  <p className="font-bold text-lg">{profile.displayName}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2 block">Email Address</label>
                  <p className="font-bold text-lg">{profile.email}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2 block">Member Since</label>
                  <div className="flex items-center space-x-2 font-bold text-lg">
                    <Clock size={18} className="text-black/20" />
                    <span>{profile.createdAt?.toDate().toLocaleDateString() || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {profile.role === 'expert' && (
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2 block">Specialization</label>
                    <div className="flex items-center space-x-2 font-bold text-lg text-emerald-600">
                      <Sparkles size={18} />
                      <span>{profile.expertise}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2 block">Academics</label>
                    <div className="flex items-center space-x-2 font-bold text-lg">
                      <GraduationCap size={18} className="text-black/20" />
                      <span>{profile.academics}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {profile.role === 'expert' && (
              <div className="mt-10 pt-10 border-t border-black/5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-4 block">Professional Bio</label>
                <p className="text-black/60 leading-relaxed italic">
                  "{profile.bio}"
                </p>
              </div>
            )}
          </div>

          {/* Activity Placeholder */}
          <div className="bg-white p-10 rounded-[3rem] border border-black/5">
            <h3 className="text-xl font-bold mb-8">Recent Activity</h3>
            <div className="space-y-6">
              {[1, 2].map((_, idx) => (
                <div key={idx} className="flex items-center justify-between py-4 border-b border-black/5 last:border-0">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center">
                      <Briefcase size={20} className="text-black/20" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Joined the Expert Network</p>
                      <p className="text-xs text-black/40">Your profile is now visible to the community.</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-black/30 uppercase tracking-widest">2 days ago</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
