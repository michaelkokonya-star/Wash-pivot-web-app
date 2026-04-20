import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { 
  ArrowLeft, CheckCircle2, XCircle, Trash2, Calendar, 
  Users, Target, TrendingUp, Shield, Briefcase, 
  Clock, AlertCircle, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

const AdminProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = profile?.role === 'admin';
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (!id) return;

    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/data/projects/${id}`);
        if (response.ok) {
          const data = await response.json();
          setProject(data);
        } else {
          setProject(null);
        }
      } catch (error) {
        console.error("Error fetching project:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
    const interval = setInterval(fetchProject, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const handleApproveProject = async (approved: boolean) => {
    if (!project) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/data/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: approved ? 'active' : 'rejected',
          isApproved: approved
        })
      });
      
      if (response.ok) {
        setProject({ 
          ...project, 
          status: approved ? 'active' : 'rejected',
          isApproved: approved
        });
        toast.success(`Project ${approved ? 'approved' : 'rejected'} successfully`);
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error("Error updating project status:", error);
      toast.error("Failed to update project status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    if (!window.confirm('Are you sure you want to permanently delete this project? This action cannot be undone.')) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/data/projects/${project.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast.success("Project deleted successfully");
        navigate('/admin');
      } else {
        throw new Error('Failed to delete project');
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project");
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 pt-32 flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-stone-50 pt-32 px-8 text-center">
        <div className="max-w-md mx-auto bg-white p-12 rounded-3xl shadow-sm border border-black/5">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-6" />
          <h1 className="text-2xl font-bold mb-4">Project Not Found</h1>
          <p className="text-black/40 mb-8 text-sm">The project you are looking for might have been deleted or moved.</p>
          <button 
            onClick={() => navigate('/admin')}
            className="w-full py-4 bg-black text-white font-bold rounded-2xl hover:bg-black/80 transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const progress = Math.min((project.currentFunding / project.targetFunding) * 100, 100);

  return (
    <div className="min-h-screen bg-stone-50 pt-28 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/admin')}
              className="p-3 bg-white rounded-2xl border border-black/5 hover:bg-stone-100 transition-colors shadow-sm"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <h1 className="text-3xl font-bold tracking-tighter">{project.title}</h1>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                  project.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                  project.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                  project.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-stone-200 text-black/40'
                }`}>
                  {project.status}
                </span>
              </div>
              <p className="text-xs text-black/40 font-medium">Project ID: {project.id}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {project.status === 'pending' && (
              <>
                <button
                  onClick={() => handleApproveProject(true)}
                  disabled={actionLoading}
                  className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  <CheckCircle2 size={18} />
                  <span>Approve</span>
                </button>
                <button
                  onClick={() => handleApproveProject(false)}
                  disabled={actionLoading}
                  className="flex items-center space-x-2 px-6 py-3 bg-red-50 text-red-600 font-bold rounded-2xl hover:bg-red-100 transition-all disabled:opacity-50"
                >
                  <XCircle size={18} />
                  <span>Reject</span>
                </button>
              </>
            )}
            <button
              onClick={handleDeleteProject}
              disabled={actionLoading}
              className="p-3 bg-white text-red-600 border border-red-100 rounded-2xl hover:bg-red-50 transition-all shadow-sm disabled:opacity-50"
              title="Delete Project"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image & Description */}
            <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm">
              <div className="aspect-video rounded-2xl overflow-hidden mb-8 bg-stone-100 border border-black/5">
                <img 
                  src={project.imageUrl} 
                  alt={project.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h3 className="text-xl font-bold mb-4">Project Description</h3>
              <p className="text-black/60 leading-relaxed text-sm whitespace-pre-wrap">
                {project.description}
              </p>
            </div>

            {/* Milestones */}
            <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold">Milestones</h3>
                <span className="text-xs font-bold text-black/40 uppercase tracking-widest">
                  {project.milestones?.filter((m: any) => m.isCompleted).length || 0} / {project.milestones?.length || 0} Completed
                </span>
              </div>
              <div className="space-y-4">
                {project.milestones?.map((milestone: any, index: number) => (
                  <div key={milestone.id || index} className="flex items-start space-x-4 p-4 rounded-2xl bg-stone-50 border border-black/5">
                    <div className={`mt-1 p-1 rounded-full ${milestone.isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-200 text-black/20'}`}>
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{milestone.title}</p>
                      <p className="text-xs text-black/40 mt-1">{milestone.description}</p>
                    </div>
                  </div>
                ))}
                {(!project.milestones || project.milestones.length === 0) && (
                  <p className="text-center py-8 text-black/30 text-sm italic">No milestones defined.</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-8">
            {/* Funding Stats */}
            <div className="bg-black text-white rounded-[32px] p-8 shadow-xl">
              <div className="flex items-center space-x-2 mb-6 text-emerald-400">
                <Target size={20} />
                <h3 className="text-sm font-bold uppercase tracking-widest">Funding Progress</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Current Funding</p>
                  <p className="text-3xl font-bold tracking-tighter">KSh {project.currentFunding?.toLocaleString()}</p>
                </div>
                
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-emerald-500"
                  />
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Target Goal</p>
                    <p className="text-lg font-bold">KSh {project.targetFunding?.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Percentage</p>
                    <p className="text-lg font-bold text-emerald-400">{progress.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Owner Details */}
            <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm">
              <div className="flex items-center space-x-2 mb-6 text-black/40">
                <Users size={20} />
                <h3 className="text-sm font-bold uppercase tracking-widest">Owner Information</h3>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center text-stone-400">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{project.ownerName}</p>
                    <p className="text-[10px] text-black/40 font-medium">UID: {project.ownerUid}</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-black/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-black/40">
                      <Briefcase size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Category</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">{project.category}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-black/40">
                      <Clock size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Created</span>
                    </div>
                    <span className="text-xs font-bold">
                      {project.createdAt?.toDate ? project.createdAt.toDate().toLocaleDateString() : new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => navigate(`/funding/${project.id}`)}
                  className="w-full py-4 bg-stone-100 text-black font-bold rounded-2xl hover:bg-stone-200 transition-all flex items-center justify-center space-x-2 text-xs uppercase tracking-widest"
                >
                  <span>View Public Page</span>
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProjectDetails;
