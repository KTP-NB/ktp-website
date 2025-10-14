'use client';

import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function randomPos() {
  return {
    top: `${rand(6, 84)}%`,
    left: `${rand(6, 84)}%`,
    rotate: rand(-8, 8),
    size: Math.round(rand(180, 300)),
  };
}

function Tile({ src, period = 7, delay = 0 }) {
  const [key, setKey] = useState(0);
  const [pos, setPos] = useState(randomPos());

  useEffect(() => {
    const id = setInterval(() => {
      setPos(randomPos());
      setKey(k => k + 1); // re-mount to re-animate from new position
    }, period * 1000);
    return () => clearInterval(id);
  }, [period]);

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={key}
        className="absolute z-0 pointer-events-none select-none"
        style={{ top: pos.top, left: pos.left }}
        initial={{ opacity: 0, scale: 0.85, rotate: pos.rotate }}
        animate={{ opacity: 0.3, scale: 1, rotate: pos.rotate }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.9, delay, ease: 'easeOut' }}
      >
        <Image
          src={src}
          alt=""
          width={pos.size}
          height={pos.size}
          className="rounded-2xl shadow-xl"
          priority={false}
        />
      </motion.div>
    </AnimatePresence>
  );
}

export default function AnimatedCollage({ images = [] }) {
  return (
    <>
      {images.map((src, i) => (
        <Tile
          key={i}
          src={src}
          period={6 + (i % 4)}     // slightly different loop lengths
          delay={(i % 6) * 0.1}    // slight stagger on first entry
        />
      ))}
    </>
  );
}