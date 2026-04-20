import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { Plus, Target, Users, TrendingUp, Heart, ListTodo, X, Shield, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AddProjectModal from '../components/AddProjectModal';
import { db } from '../firebase';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';

const MicroFunding = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchProjects = async () => {
    try {
      const q = collection(db, 'projects');
      const snapshot = await getDocs(q);
      const allProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Only show approved projects to regular users
      if (profile?.role === 'admin') {
        setProjects(allProjects);
      } else {
        setProjects(allProjects.filter((p: any) => p.isApproved === true));
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [profile]);

  const handleSupport = async (projectId: string, current: number) => {
    if (!user) return alert('Please sign in to support projects');
    try {
      const newFunding = current + 5000;
      await updateDoc(doc(db, 'projects', projectId), {
        currentFunding: newFunding
      });
      fetchProjects();
    } catch (error) {
      console.error("Error supporting project:", error);
    }
  };

  const displayProjects = projects;

  return (
    <div className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <Helmet>
        <title>Micro Funding | Support Community WASH Projects</title>
        <meta name="description" content="Support community-led water, sanitation, and hygiene projects. Fund sustainable initiatives and track their impact through transparent milestones." />
        <link rel="canonical" href="https://www.washpivot.com/funding" />
        <meta property="og:title" content="Micro Funding | WASH Pivot" />
        <meta property="og:description" content="Support community-led water, sanitation, and hygiene projects." />
        <meta property="og:url" content="https://www.washpivot.com/funding" />
      </Helmet>
      <div className="flex flex-col md:flex-row justify-between items-start mb-16 gap-8">
        <div className="max-w-2xl">
          <h1 className="text-5xl font-bold tracking-tighter mb-4">MICRO FUNDING</h1>
          <p className="text-black/50 text-lg">
            Support community-led WASH projects or upload your own to attract funding and supporters.
          </p>
        </div>
        
        {user && (profile?.role === 'expert' || profile?.role === 'admin') && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-8 py-4 bg-black text-white font-bold rounded-xl hover:bg-black/80 transition-all flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Upload Project</span>
          </button>
        )}
      </div>

      <AddProjectModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchProjects}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {displayProjects.length > 0 ? (
          displayProjects.map((project) => {
            const progress = Math.min((project.currentFunding / project.targetFunding) * 100, 100);
            return (
              <motion.div
                key={project.id}
                className="bg-white rounded-3xl border border-black/5 overflow-hidden flex flex-col md:flex-row h-full group hover:shadow-2xl transition-all"
              >
                <div className="md:w-2/5 relative overflow-hidden cursor-pointer" onClick={() => navigate(`/funding/${project.id}`)}>
                  <img
                    src={project.imageUrl}
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <span className="px-3 py-1 bg-black text-white rounded-full text-[10px] font-bold uppercase tracking-widest">
                      {project.category}
                    </span>
                    {project.isCertified && (
                      <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-lg shadow-emerald-600/20">
                        <Shield size={10} className="fill-white" />
                        Certified
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-8 md:w-3/5 flex flex-col">
                  <h3 className="text-2xl font-bold mb-4 hover:text-emerald-600 transition-colors cursor-pointer" onClick={() => navigate(`/funding/${project.id}`)}>{project.title}</h3>
                  <p className="text-black/60 text-sm mb-8 line-clamp-3 flex-grow">{project.description}</p>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm font-bold">
                      <span>KSh {project.currentFunding.toLocaleString()} raised</span>
                      <span className="text-black/40">Target: KSh {project.targetFunding.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-emerald-600"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-4">
                      <div className="flex items-center space-x-2 text-xs text-black/40">
                        <Users size={14} />
                        <span>By {project.ownerName}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Link
                          to={`/funding/${project.id}`}
                          className="px-4 py-2 bg-stone-100 text-black text-xs font-bold rounded-lg hover:bg-stone-200 transition-all flex items-center space-x-2"
                        >
                          <ListTodo size={14} />
                          <span>Milestones</span>
                        </Link>
                        <button
                          onClick={() => handleSupport(project.id, project.currentFunding)}
                          className="px-6 py-2 bg-black text-white text-sm font-bold rounded-lg hover:bg-emerald-600 transition-all flex items-center space-x-2"
                        >
                          <Heart size={16} />
                          <span>Support</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="col-span-full py-20 text-center bg-stone-50 rounded-3xl border border-dashed border-black/10">
            <p className="text-black/40 font-medium">No funding projects active at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MicroFunding;
