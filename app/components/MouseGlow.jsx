"use client";

import { useEffect, useState } from "react";

export default function MouseGlow() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile/low-power devices and skip heavy GPU effects
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Skip entirely on mobile — these blur orbs are too GPU-heavy for Safari/mobile
  if (isMobile) return null;

  return (
    <>
      <style>{`
        @keyframes drift1 {
          0%   { transform: translate(10vw, 20vh) translate(-50%, -50%); }
          25%  { transform: translate(60vw, 10vh) translate(-50%, -50%); }
          50%  { transform: translate(70vw, 60vh) translate(-50%, -50%); }
          75%  { transform: translate(20vw, 70vh) translate(-50%, -50%); }
          100% { transform: translate(10vw, 20vh) translate(-50%, -50%); }
        }
        @keyframes drift2 {
          0%   { transform: translate(75vw, 55vh) translate(-50%, -50%); }
          25%  { transform: translate(25vw, 75vh) translate(-50%, -50%); }
          50%  { transform: translate(15vw, 25vh) translate(-50%, -50%); }
          75%  { transform: translate(65vw, 15vh) translate(-50%, -50%); }
          100% { transform: translate(75vw, 55vh) translate(-50%, -50%); }
        }
        .glow-orb-1 {
          position: fixed;
          top: 0; left: 0;
          width: 600px; height: 600px;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.5) 0%, rgba(255,255,255,0.10) 40%, transparent 60%);
          filter: blur(70px);
          animation: drift1 18s ease-in-out infinite;
          will-change: transform;
          mix-blend-mode: screen;
        }
        .glow-orb-2 {
          position: fixed;
          top: 0; left: 0;
          width: 500px; height: 500px;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          background: radial-gradient(circle, rgba(255,255,255,0.50) 0%, rgba(255,255,255,0.10) 40%, transparent 60%);
          filter: blur(70px);
          animation: drift2 24s ease-in-out infinite;
          will-change: transform;
          mix-blend-mode: screen;
        }
      `}</style>
      <div aria-hidden="true" className="glow-orb-1" />
      <div aria-hidden="true" className="glow-orb-2" />
    </>
  );
}