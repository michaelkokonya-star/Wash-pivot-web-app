import React from 'react';
import { motion } from 'motion/react';

interface LogoProps {
  className?: string;
  light?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = "h-10", light = false }) => {
  const textColor = light ? "text-white" : "text-[#1A242F]";
  const accentColor = "#00C49A";

  return (
    <div className={`flex items-center gap-2 group cursor-pointer ${className}`}>
      <div className="relative w-10 h-10 flex items-center justify-center">
        <motion.div 
          className="absolute inset-0 bg-[#00C49A]/10 rounded-xl rotate-12 group-hover:rotate-0 transition-transform duration-500"
        />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-6 h-6 relative z-10"
          style={{ color: accentColor }}
        >
          <path
            d="M12 2.5C12 2.5 6 10.5 6 15.5C6 18.8137 8.68629 21.5 12 21.5C15.3137 21.5 18 18.8137 18 15.5C18 10.5 12 2.5 12 2.5Z"
            fill="currentColor"
            stroke="white"
            strokeWidth="1.5"
          />
        </svg>
      </div>
      <div className={`flex flex-col leading-[0.8] ${textColor}`}>
        <span className="text-[1.4rem] font-black tracking-tighter uppercase italic">Wash</span>
        <span className="text-[1.4rem] font-black tracking-[0.2em] uppercase opacity-40 ml-1">Pivot</span>
      </div>
    </div>
  );
};

export default Logo;
