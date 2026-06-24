import React, { useEffect } from 'react';
import { motion } from 'motion/react';

export const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
      className="fixed md:absolute inset-0 z-[999] bg-white flex flex-col items-center justify-center p-6 overflow-hidden"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center relative z-10 flex flex-col items-center justify-center"
      >
        <h1 className="text-orange-600 text-5xl font-black italic tracking-tighter mb-4 select-none">
          TrocShop
        </h1>
        
        {/* Animated 999 loader below TrocShop */}
        <div className="flex gap-1.5 items-center justify-center mt-2">
          {['9', '9', '9'].map((char, index) => (
            <motion.span
              key={index}
              className="text-orange-600 text-3xl font-black italic select-none"
              animate={{
                y: [0, -10, 0],
                opacity: [0.35, 1, 0.35]
              }}
              transition={{
                duration: 1.0,
                repeat: Infinity,
                delay: index * 0.18,
                ease: "easeInOut"
              }}
            >
              {char}
            </motion.span>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};
export default SplashScreen;
