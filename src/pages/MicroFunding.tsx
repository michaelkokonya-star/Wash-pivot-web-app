import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Plus, Target, Users, TrendingUp, Heart } from 'lucide-react';

const MicroFunding = () => {
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetFunding: 0,
    category: 'Solar',
    imageUrl: 'https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?auto=format&fit=crop&q=80&w=1000'
  });

  useEffect(() => {
    const fetchProjects = async () => {
      const querySnapshot = await getDocs(collection(db, 'projects'));
      setProjects(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'projects'), {
        ...formData,
        ownerUid: user.uid,
        ownerName: user.displayName,
        currentFunding: 0,
        createdAt: serverTimestamp(),
      });
      setIsAdding(false);
      window.location.reload();
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  const handleSupport = async (projectId: string, current: number) => {
    if (!user) return alert('Please sign in to support projects');
    try {
      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, {
        currentFunding: current + 5000 // Mock support amount in KSh
      });
      window.location.reload();
    } catch (error) {
      console.error("Error supporting project:", error);
    }
  };

  const displayProjects = projects;

  return (
    <div className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start mb-16 gap-8">
        <div className="max-w-2xl">
          <h1 className="text-5xl font-bold tracking-tighter mb-4">MICRO FUNDING</h1>
          <p className="text-black/50 text-lg">
            Support community-led WASH projects or upload your own to attract funding and supporters.
          </p>
        </div>
        
        {user && (profile?.role === 'expert' || profile?.role === 'admin') && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-8 py-4 bg-black text-white font-bold rounded-xl hover:bg-black/80 transition-all flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Upload Project</span>
          </button>
        )}
      </div>

      {isAdding && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-16 p-8 bg-stone-50 rounded-3xl border border-black/5"
        >
          <h2 className="text-2xl font-bold mb-6">Start a New Project</h2>
          <form onSubmit={handleCreateProject} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-black/40">Project Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full p-4 bg-white border border-black/10 rounded-xl focus:outline-none focus:border-emerald-600"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-black/40">Target Funding (KSh)</label>
              <input
                type="number"
                value={formData.targetFunding}
                onChange={(e) => setFormData({ ...formData, targetFunding: Number(e.target.value) })}
                className="w-full p-4 bg-white border border-black/10 rounded-xl focus:outline-none focus:border-emerald-600"
                required
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-black/40">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-4 bg-white border border-black/10 rounded-xl h-32 focus:outline-none focus:border-emerald-600"
                required
              />
            </div>
            <div className="flex gap-4">
              <button type="submit" className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all">
                Publish Project
              </button>
              <button type="button" onClick={() => setIsAdding(false)} className="px-8 py-4 bg-white text-black border border-black/10 font-bold rounded-xl hover:bg-stone-50 transition-all">
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {displayProjects.length > 0 ? (
          displayProjects.map((project) => {
            const progress = Math.min((project.currentFunding / project.targetFunding) * 100, 100);
            return (
              <motion.div
                key={project.id}
                className="bg-white rounded-3xl border border-black/5 overflow-hidden flex flex-col md:flex-row h-full group hover:shadow-2xl transition-all"
              >
                <div className="md:w-2/5 relative overflow-hidden">
                  <img
                    src={project.imageUrl}
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-black text-white rounded-full text-[10px] font-bold uppercase tracking-widest">
                      {project.category}
                    </span>
                  </div>
                </div>
                <div className="p-8 md:w-3/5 flex flex-col">
                  <h3 className="text-2xl font-bold mb-4">{project.title}</h3>
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
