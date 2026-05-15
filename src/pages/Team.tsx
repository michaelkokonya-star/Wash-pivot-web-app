import React from 'react';
import { motion } from 'motion/react';
import { Linkedin, Twitter, Mail } from 'lucide-react';
import OptimizedImage from '../components/OptimizedImage';

const teamMembers = [
  {
    name: "Michael Kokonya",
    role: "Founder & CEO",
    bio: "Visionary leader with a passion for sustainable development and social impact. Dedicated to empowering communities through accessible technology and expertise.",
    image: "https://drive.google.com/file/d/10eosV20Sm4XeckDxGkO68zMAnmvBn8ZV/view?usp=sharing",
    socials: { twitter: "#", linkedin: "#", mail: "michael.kokonya@washpivot.com" }
  }
];

const Team = () => {
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

      <div className="flex justify-center">
        {teamMembers.map((member, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group max-w-sm w-full"
          >
            <div className="aspect-[3/4] rounded-3xl overflow-hidden bg-stone-100 border border-black/5 mb-6 relative">
              <OptimizedImage
                src={member.image}
                alt={member.name}
                className="w-full h-full transition-all duration-500"
                width={800}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-4">
                <a href={member.socials.twitter} className="p-2 bg-white rounded-full hover:bg-emerald-500 hover:text-white transition-colors">
                  <Twitter size={18} />
                </a>
                <a href={member.socials.linkedin} className="p-2 bg-white rounded-full hover:bg-emerald-500 hover:text-white transition-colors">
                  <Linkedin size={18} />
                </a>
                <a href={`mailto:${member.socials.mail}`} className="p-2 bg-white rounded-full hover:bg-emerald-500 hover:text-white transition-colors">
                  <Mail size={18} />
                </a>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-1 uppercase tracking-tight">{member.name}</h3>
            <p className="text-emerald-600 text-xs font-bold uppercase tracking-widest mb-3">{member.role}</p>
            <p className="text-black/50 text-sm leading-relaxed">{member.bio}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default Team;
