import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Linkedin, Twitter, Mail, Loader2, Users } from 'lucide-react';
import OptimizedImage from '../components/OptimizedImage';
import { db } from '../firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';

const Team = () => {
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const q = query(collection(db, 'team_members'), orderBy('order', 'asc'));
        const snapshot = await getDocs(q);
        const fetchedTeam = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Fallback for initial demo if empty
        if (fetchedTeam.length === 0) {
          setTeamMembers([
            {
              name: "Michael Kokonya",
              role: "Founder & CEO",
              bio: "Visionary leader with a passion for sustainable development and social impact. Dedicated to empowering communities through accessible technology and expertise.",
              image: "https://lh3.googleusercontent.com/d/10eosV20Sm4XeckDxGkO68zMAnmvBn8ZV",
              socials: { twitter: "#", linkedin: "#", mail: "michael.kokonya@washpivot.com" }
            }
          ]);
        } else {
          setTeamMembers(fetchedTeam);
        }
      } catch (error) {
        console.error("Error fetching team members:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
    >
      <div className="text-center mb-20">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tighter mb-6 uppercase">Meet the Team</h1>
        <p className="text-lg sm:text-xl text-black/60 max-w-2xl mx-auto leading-relaxed px-4">
          The dedicated individuals behind Wash Pivot, working together to build a more sustainable future.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-emerald-600" size={40} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 justify-items-center">
          {teamMembers.map((member, idx) => (
            <motion.div 
              key={member.id || idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="group max-w-sm w-full"
            >
              <div className="aspect-[3/4] rounded-3xl overflow-hidden bg-stone-100 border border-black/5 mb-6 relative">
                <OptimizedImage
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full transition-all duration-500 group-hover:scale-105"
                  width={800}
                />
                {(member.socials?.twitter || member.socials?.linkedin || member.socials?.mail) && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-4">
                    {member.socials.twitter && (
                      <a href={member.socials.twitter} target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded-full hover:bg-emerald-500 hover:text-white transition-colors">
                        <Twitter size={18} />
                      </a>
                    )}
                    {member.socials.linkedin && (
                      <a href={member.socials.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded-full hover:bg-emerald-500 hover:text-white transition-colors">
                        <Linkedin size={18} />
                      </a>
                    )}
                    {member.socials.mail && (
                      <a href={`mailto:${member.socials.mail}`} className="p-2 bg-white rounded-full hover:bg-emerald-500 hover:text-white transition-colors">
                        <Mail size={18} />
                      </a>
                    )}
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold mb-1 uppercase tracking-tight">{member.name}</h3>
              <p className="text-emerald-600 text-xs font-bold uppercase tracking-widest mb-3">{member.role}</p>
              <p className="text-black/50 text-sm leading-relaxed">{member.bio}</p>
            </motion.div>
          ))}
        </div>
      )}
      
      {!loading && teamMembers.length === 0 && (
        <div className="text-center py-20 text-black/20">
          <Users size={48} className="mx-auto mb-4 opacity-20" />
          <p>No team members listed yet.</p>
        </div>
      )}
    </motion.div>
  );
};

export default Team;
