import React from 'react';
import { motion } from 'motion/react';

interface LogoProps {
  className?: string;
  light?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = "h-10", light = false }) => {
  const textColor = light ? "text-white" : "text-[#1A242F]";
  const dropColor = "#00C49A";

  return (
    <div className={`flex flex-col leading-none font-black tracking-tighter ${textColor} ${className}`}>
      <div className="text-[1.2em] flex items-center">
        WASH
      </div>
      <div className="text-[1.2em] flex items-center -mt-[0.1em]">
        PIV
        <span className="inline-block mx-[0.05em] relative w-[0.6em] h-[0.6em]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="absolute inset-0 w-full h-full"
            style={{ color: dropColor }}
          >
            <path
              d="M12 2.5C12 2.5 6 10.5 6 15.5C6 18.8137 8.68629 21.5 12 21.5C15.3137 21.5 18 18.8137 18 15.5C18 10.5 12 2.5 12 2.5Z"
              fill="currentColor"
            />
          </svg>
        </span>
        T
      </div>
    </div>
  );
};

export default Logo;
