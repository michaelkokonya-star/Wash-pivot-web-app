import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, CheckCircle2, Circle, Heart, Users, Target, Calendar, ShieldCheck, TrendingUp, Facebook, Twitter, Linkedin, MessageSquare, Link as LinkIcon, Shield, Play } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(doc(db, 'projects', id), (docSnap) => {
      if (docSnap.exists()) {
        setProject({ id: docSnap.id, ...docSnap.data() });
      } else {
        setProject(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching project:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  const handleToggleMilestone = async (milestoneId: string) => {
    if (!project || !user || project.ownerUid !== user.uid) return;

    setUpdating(true);
    try {
      const updatedMilestones = project.milestones.map((m: any) => 
        m.id === milestoneId ? { ...m, isCompleted: !m.isCompleted } : m
      );

      await updateDoc(doc(db, 'projects', project.id), { milestones: updatedMilestones });
      
      setProject({ ...project, milestones: updatedMilestones });
    } catch (error) {
      console.error("Error updating milestone:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleSupport = async () => {
    if (!user) return alert('Please sign in to support projects');
    if (!project) return;

    try {
      const newFunding = project.currentFunding + 5000;
      await updateDoc(doc(db, 'projects', project.id), {
        currentFunding: newFunding
      });
      setProject({ ...project, currentFunding: newFunding });
    } catch (error) {
      console.error("Error supporting project:", error);
    }
  };

  const renderVideo = (url: string) => {
    // Check for YouTube
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})/);
    if (ytMatch) {
      return (
        <iframe
          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }

    // Check for Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) {
      return (
        <iframe
          src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
          className="w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      );
    }

    // Direct video file (S3 or other)
    return (
      <video 
        src={url} 
        controls 
        className="w-full h-full object-cover"
        poster={project.imageUrl}
      />
    );
  };

  if (loading) {
    return (
      <div className="pt-32 flex justify-center items-center min-h-screen">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="pt-32 px-8 text-center min-h-screen">
        <h1 className="text-3xl font-bold mb-4">Project Not Found</h1>
        <button 
          onClick={() => navigate('/funding')}
          className="text-emerald-600 font-bold hover:underline"
        >
          Back to Funding
        </button>
      </div>
    );
  }

  const progress = Math.min((project.currentFunding / project.targetFunding) * 100, 100);
  const completedMilestones = project.milestones?.filter((m: any) => m.isCompleted).length || 0;
  const totalMilestones = project.milestones?.length || 0;
  const milestoneProgress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
    >
      <Helmet>
        <title>{`${project.title} | WASH Pivot Funding`}</title>
        <meta name="description" content={project.description.substring(0, 160)} />
        <link rel="canonical" href={`https://www.washpivot.com/funding/${project.id}`} />
        <meta property="og:title" content={project.title} />
        <meta property="og:description" content={project.description.substring(0, 160)} />
        <meta property="og:image" content={project.imageUrl} />
        <meta property="og:url" content={`https://www.washpivot.com/funding/${project.id}`} />
      </Helmet>
      <button 
        onClick={() => navigate('/funding')}
        className="flex items-center space-x-2 text-black/50 hover:text-black transition-colors mb-8 group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-bold uppercase tracking-widest text-xs">Back to Micro Funding</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-12">
          <section>
            <div className="relative aspect-video rounded-3xl overflow-hidden mb-8 border border-black/5">
              <img 
                src={project.imageUrl} 
                alt={project.title} 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-6 left-6">
                <span className="px-4 py-1.5 bg-white/90 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-widest shadow-sm">
                  {project.category}
                </span>
              </div>
            </div>
            
            <h1 className="text-5xl font-bold tracking-tighter mb-6 leading-tight">{project.title}</h1>
            <div className="flex flex-wrap items-center gap-6 text-sm text-black/40 mb-8">
              <div className="flex items-center space-x-2">
                <Users size={16} />
                <span className="font-bold text-black/60">By {project.ownerName}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar size={16} />
                <span>Created {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <ShieldCheck size={16} className="text-emerald-600" />
                <span className="text-emerald-600 font-bold">Verified Project</span>
              </div>
              {project.isCertified && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-emerald-600 text-white rounded-full">
                  <Shield size={14} className="fill-white" />
                  <span className="font-bold text-[10px] uppercase tracking-widest">Certified Genuine</span>
                </div>
              )}
            </div>

            <div className="prose prose-lg text-black/60 leading-relaxed max-w-none">
              <p>{project.description}</p>
            </div>

            {/* Project Gallery */}
            {project.media && project.media.length > 0 && (
              <div className="mt-12">
                <h3 className="text-xl font-bold mb-6 tracking-tight uppercase">Project Gallery</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {project.media.map((item: any, index: number) => (
                    <div key={index} className="relative aspect-video rounded-3xl overflow-hidden bg-stone-100 border border-black/5 group shadow-sm">
                      {item.type === 'image' ? (
                        <img 
                          src={item.url} 
                          alt={`Gallery ${index}`} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full">
                          {renderVideo(item.url)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Social Sharing */}
            <div className="mt-10 pt-8 border-t border-black/5">
              <div className="flex items-center space-x-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Share this project</span>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')}
                    className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center hover:bg-[#1877F2] hover:text-white transition-all group"
                    title="Share on Facebook"
                  >
                    <Facebook size={18} />
                  </button>
                  <button 
                    onClick={() => window.open(`https://x.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(`Support this project: ${project.title} on WASH Pivot!`)}`, '_blank')}
                    className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center hover:bg-black hover:text-white transition-all"
                    title="Share on X"
                  >
                    <Twitter size={18} />
                  </button>
                  <button 
                    onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank')}
                    className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center hover:bg-[#0A66C2] hover:text-white transition-all"
                    title="Share on LinkedIn"
                  >
                    <Linkedin size={18} />
                  </button>
                  <button 
                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Check out this project on WASH Pivot: ${project.title} - ${window.location.href}`)}`, '_blank')}
                    className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center hover:bg-[#25D366] hover:text-white transition-all"
                    title="Share on WhatsApp"
                  >
                    <MessageSquare size={18} />
                  </button>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      const btn = document.getElementById('copy-project-link-btn');
                      if (btn) {
                        const originalContent = btn.innerHTML;
                        btn.innerHTML = '<span class="text-[10px] font-bold">COPIED!</span>';
                        setTimeout(() => {
                          btn.innerHTML = originalContent;
                        }, 2000);
                      }
                    }}
                    id="copy-project-link-btn"
                    className="px-4 h-10 rounded-full bg-stone-100 flex items-center justify-center hover:bg-black hover:text-white transition-all"
                    title="Copy Link"
                  >
                    <LinkIcon size={18} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Milestones Section */}
          <section className="bg-stone-50 rounded-3xl p-8 border border-black/5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <div>
                <h2 className="text-3xl font-bold tracking-tighter">PROJECT MILESTONES</h2>
                <p className="text-black/40 text-sm font-bold uppercase tracking-widest mt-1">Track the progress of this project</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-emerald-600">{completedMilestones}/{totalMilestones}</span>
                <p className="text-[10px] font-bold uppercase tracking-widest text-black/30">Completed</p>
              </div>
            </div>

            <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden mb-10">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${milestoneProgress}%` }}
                className="h-full bg-emerald-600"
              />
            </div>

            <div className="space-y-4">
              {project.milestones && project.milestones.length > 0 ? (
                project.milestones.map((milestone: any) => (
                  <div 
                    key={milestone.id}
                    className={`p-6 rounded-2xl border transition-all flex items-start space-x-4 ${milestone.isCompleted ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-black/5'}`}
                  >
                    <div className="mt-1">
                      {milestone.isCompleted ? (
                        <CheckCircle2 className="text-emerald-600" size={24} />
                      ) : (
                        <Circle className="text-black/10" size={24} />
                      )}
                    </div>
                    <div className="flex-grow">
                      <h3 className={`font-bold text-lg ${milestone.isCompleted ? 'text-emerald-900' : 'text-black'}`}>
                        {milestone.title}
                      </h3>
                      <p className={`text-sm mt-1 ${milestone.isCompleted ? 'text-emerald-700/60' : 'text-black/50'}`}>
                        {milestone.description}
                      </p>
                    </div>
                    {user?.uid === project.ownerUid && (
                      <button
                        onClick={() => handleToggleMilestone(milestone.id)}
                        disabled={updating}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${milestone.isCompleted ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-black text-white hover:bg-black/80'}`}
                      >
                        {milestone.isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-black/10">
                  <p className="text-black/40 font-medium">No milestones defined for this project.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-32 space-y-8">
            {/* Funding Card */}
            <div className="bg-black text-white p-8 rounded-3xl shadow-2xl">
              <div className="flex items-center space-x-2 mb-8 text-emerald-400">
                <Target size={24} />
                <h2 className="text-xl font-bold uppercase tracking-tighter">Funding Goal</h2>
              </div>

              <div className="space-y-6 mb-10">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-4xl font-bold tracking-tighter">KSh {project.currentFunding.toLocaleString()}</span>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mt-1">Raised so far</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-white/60">KSh {project.targetFunding.toLocaleString()}</span>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mt-1">Target</p>
                  </div>
                </div>

                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-emerald-500"
                  />
                </div>

                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-white/40">
                  <span>{progress.toFixed(1)}% Funded</span>
                  <span>{project.ownerName}</span>
                </div>
              </div>

              <button 
                onClick={handleSupport}
                className="w-full py-5 bg-emerald-500 text-black font-bold rounded-2xl hover:bg-emerald-400 transition-all flex items-center justify-center space-x-3 shadow-xl shadow-emerald-500/20"
              >
                <Heart size={24} fill="currentColor" />
                <span>Support Project</span>
              </button>
            </div>

            {/* Impact Card */}
            <div className="bg-stone-50 p-8 rounded-3xl border border-black/5">
              <div className="flex items-center space-x-2 mb-6 text-black/40">
                <TrendingUp size={20} />
                <h3 className="text-sm font-bold uppercase tracking-widest">Project Impact</h3>
              </div>
              <p className="text-black/60 text-sm leading-relaxed mb-6">
                By supporting this project, you're directly contributing to sustainable development in the {project.category} sector.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-xs font-bold">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Transparent Fund Allocation</span>
                </div>
                <div className="flex items-center space-x-3 text-xs font-bold">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Regular Progress Updates</span>
                </div>
                <div className="flex items-center space-x-3 text-xs font-bold">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Community-Led Initiative</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProjectDetail;
