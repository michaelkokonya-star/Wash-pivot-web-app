import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { Plus, Target, Users, TrendingUp, Heart, ListTodo, X, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const MicroFunding = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [milestoneInput, setMilestoneInput] = useState({ title: '', description: '' });
  const [milestones, setMilestones] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetFunding: 0,
    category: 'Solar',
    imageUrl: 'https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?auto=format&fit=crop&q=80&w=1000'
  });

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects');
        if (response.ok) {
          const allProjects = await response.json();
          // Only show approved projects to regular users
          if (profile?.role === 'admin') {
            setProjects(allProjects);
          } else {
            setProjects(allProjects.filter((p: any) => p.isApproved === true));
          }
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };
    fetchProjects();
  }, [profile]);

  const handleAddMilestone = () => {
    if (!milestoneInput.title.trim()) return;
    setMilestones([...milestones, { 
      id: Math.random().toString(36).substr(2, 9),
      ...milestoneInput, 
      isCompleted: false 
    }]);
    setMilestoneInput({ title: '', description: '' });
  };

  const handleRemoveMilestone = (id: string) => {
    setMilestones(milestones.filter(m => m.id !== id));
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ownerUid: user.uid,
          ownerName: profile?.displayName || user.displayName || 'Anonymous',
          currentFunding: 0,
          milestones: milestones,
          isApproved: false,
          status: 'pending'
        })
      });
      if (response.ok) {
        setIsAdding(false);
        setMilestones([]);
        window.location.reload();
      }
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  const handleSupport = async (projectId: string, current: number) => {
    if (!user) return alert('Please sign in to support projects');
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentFunding: current + 5000 // Mock support amount in KSh
        })
      });
      if (response.ok) {
        window.location.reload();
      }
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
            <div className="md:col-span-2 space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-black/40">Project Milestones</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Milestone Title"
                    value={milestoneInput.title}
                    onChange={(e) => setMilestoneInput({ ...milestoneInput, title: e.target.value })}
                    className="w-full p-4 bg-white border border-black/10 rounded-xl focus:outline-none focus:border-emerald-600 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Milestone Description"
                    value={milestoneInput.description}
                    onChange={(e) => setMilestoneInput({ ...milestoneInput, description: e.target.value })}
                    className="w-full p-4 bg-white border border-black/10 rounded-xl focus:outline-none focus:border-emerald-600 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddMilestone}
                    className="w-full py-3 bg-stone-100 text-black font-bold rounded-xl hover:bg-stone-200 transition-all text-xs uppercase tracking-widest"
                  >
                    Add Milestone
                  </button>
                </div>
                <div className="space-y-2">
                  {milestones.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-4 bg-white border border-black/5 rounded-xl">
                      <div className="truncate mr-4">
                        <p className="font-bold text-sm">{m.title}</p>
                        <p className="text-xs text-black/40 truncate">{m.description}</p>
                      </div>
                      <button type="button" onClick={() => handleRemoveMilestone(m.id)} className="text-red-500 hover:text-red-700">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  {milestones.length === 0 && (
                    <div className="h-full flex items-center justify-center border border-dashed border-black/10 rounded-xl p-8">
                      <p className="text-xs text-black/30 italic">No milestones added yet</p>
                    </div>
                  )}
                </div>
              </div>
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
