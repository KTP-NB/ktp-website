'use client';

import { motion } from 'framer-motion';

export default function PopIn({ children, delay = 0, className = "" }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 32, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{
        duration: 0.55,
        delay,
        ease: [0.22, 1, 0.36, 1], // custom spring-like ease
      }}
    >
      {children}
    </motion.div>
  );
}
