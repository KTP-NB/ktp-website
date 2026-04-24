"use client";

export default function MouseGlow() {
  return (
    <>
      <style>{`
        @keyframes drift1 {
          0%   { transform: translate(10vw, 20vh); }
          25%  { transform: translate(60vw, 10vh); }
          50%  { transform: translate(70vw, 60vh); }
          75%  { transform: translate(20vw, 70vh); }
          100% { transform: translate(10vw, 20vh); }
        }
        @keyframes drift2 {
          0%   { transform: translate(75vw, 55vh); }
          25%  { transform: translate(25vw, 75vh); }
          50%  { transform: translate(15vw, 25vh); }
          75%  { transform: translate(65vw, 15vh); }
          100% { transform: translate(75vw, 55vh); }
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
          translate: -50% -50%;
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
          translate: -50% -50%;
        }
      `}</style>
      <div aria-hidden="true" className="glow-orb-1" />
      <div aria-hidden="true" className="glow-orb-2" />
    </>
  );
}