import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { User, Briefcase, GraduationCap, Search, Filter, Mail, Award, Sparkles, Trash2 } from 'lucide-react';
import ExpertOnboardingModal from '../components/ExpertOnboardingModal';

const Recruitment = () => {
  const { user, profile } = useAuth();
  const [experts, setExperts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const isAdmin = user?.email?.toLowerCase() === 'michael.kokonya@washpivot.com';

  const fetchExperts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'public_profiles'), where('role', '==', 'expert'));
      const querySnapshot = await getDocs(q);
      const expertsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setExperts(expertsData);
    } catch (error) {
      console.error("Error fetching experts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpert = async (expertId: string) => {
    if (!window.confirm('Are you sure you want to remove this expert?')) return;
    try {
      // Delete from both collections
      await deleteDoc(doc(db, 'users', expertId));
      await deleteDoc(doc(db, 'public_profiles', expertId));
      setExperts(experts.filter(e => e.id !== expertId));
    } catch (error) {
      console.error("Error deleting expert:", error);
    }
  };

  useEffect(() => {
    fetchExperts();
  }, []);

  const allExperts = experts;
  const totalPages = Math.ceil(allExperts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayExperts = allExperts.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start mb-16 gap-8">
        <div className="max-w-2xl">
          <h1 className="text-5xl font-bold tracking-tighter mb-4">EXPERT NETWORK</h1>
          <p className="text-black/50 text-lg">
            Connect with certified professionals in the WASH sector. Join our network to offer your expertise to sustainable projects.
          </p>
        </div>
        
        {user && profile?.role !== 'expert' && (
          <button
            onClick={() => setShowOnboarding(true)}
            className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center space-x-2 group"
          >
            <Sparkles size={18} className="group-hover:scale-110 transition-transform" />
            <span>Join as Expert</span>
          </button>
        )}
      </div>

      <ExpertOnboardingModal 
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => {
          setShowOnboarding(false);
          fetchExperts();
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
        {displayExperts.length > 0 ? (
          displayExperts.map((expert) => (
            <motion.div
              key={expert.id}
              whileHover={{ y: -5 }}
              className="bg-white p-8 rounded-3xl border border-black/5 hover:shadow-xl transition-all"
            >
              <div className="flex items-center space-x-4 mb-6">
                <img
                  src={expert.photoURL || `https://ui-avatars.com/api/?name=${expert.displayName}`}
                  alt={expert.displayName}
                  className="w-16 h-16 rounded-2xl object-cover"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-xl">{expert.displayName}</h3>
                    {isAdmin && (
                      <button 
                        onClick={() => handleDeleteExpert(expert.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <span className="text-emerald-600 text-sm font-bold uppercase tracking-widest">
                    {expert.expertise}
                  </span>
                </div>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start space-x-3 text-sm text-black/60">
                  <GraduationCap size={18} className="mt-1 flex-shrink-0" />
                  <p>{expert.academics}</p>
                </div>
                <div className="flex items-start space-x-3 text-sm text-black/60">
                  <Award size={18} className="mt-1 flex-shrink-0" />
                  <p className="line-clamp-3">{expert.bio}</p>
                </div>
              </div>

              <button className="w-full py-4 bg-stone-100 text-black font-bold rounded-xl hover:bg-black hover:text-white transition-all flex items-center justify-center space-x-2">
                <Mail size={18} />
                <span>Contact Expert</span>
              </button>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-stone-50 rounded-3xl border border-dashed border-black/10">
            <p className="text-black/40 font-medium">No experts found in the network yet.</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-black/10 rounded-lg disabled:opacity-30 hover:bg-black/5 transition-colors font-bold text-sm"
          >
            Previous
          </button>
          <span className="text-sm font-bold">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-black/10 rounded-lg disabled:opacity-30 hover:bg-black/5 transition-colors font-bold text-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Recruitment;
