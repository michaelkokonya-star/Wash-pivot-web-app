import React from 'react';
import { motion } from 'motion/react';

interface LogoProps {
  className?: string;
  light?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = "h-10", light = false }) => {
  const textColor = light ? "text-white" : "text-[#1A242F]";
  
  return (
    <div className={`flex items-center gap-2.5 group cursor-pointer ${className}`}>
      <div className="relative w-11 h-11 flex items-center justify-center">
        {/* Modern Geometric Background */}
        <motion.div 
          className="absolute inset-0 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-600/20"
          whileHover={{ rotate: 90, borderRadius: "50%" }}
          transition={{ duration: 0.6, ease: "circOut" }}
        />
        <motion.div 
          className="absolute inset-2 border-2 border-white/40 rounded-xl"
          whileHover={{ rotate: -90, borderRadius: "50%" }}
          transition={{ duration: 0.6, ease: "circOut" }}
        />
        
        {/* Core Icon: The Water Drop + Pivot Axis */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-5 h-5 relative z-10 text-white"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2L12 22M12 22L7 17M12 22L17 17"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 3C12 3 6 11 6 16C6 19.3137 8.68629 22 12 22C15.3137 22 18 19.3137 18 16C18 11 12 3 12 3Z"
            fill="currentColor"
            fillOpacity="0.3"
          />
        </svg>
      </div>
      <div className={`flex flex-col -space-y-1.5 ${textColor}`}>
        <span className="text-2xl font-black tracking-tighter uppercase">Wash</span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
          <span className="text-[0.7rem] font-bold tracking-[0.4em] uppercase opacity-60">Pivot</span>
        </div>
      </div>
    </div>
  );
};

export default Logo;
