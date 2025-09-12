'use client';

import Image from 'next/image';

const IMAGES = [
  '/images/bg1.JPG',
  '/images/bg3.png',
  '/images/bg4.jpeg',
  '/images/bg5.jpeg',
  '/images/bg6.jpeg',
  '/images/bg7.jpeg',
  '/images/bg8.jpeg',
  '/images/bg9.png',
  '/images/bg10.png',
  '/images/bg11.jpeg',
  '/images/bg12.jpeg',
  '/images/bg13.jpeg',
  '/images/bg14.jpeg',
].filter(Boolean); 

const POS = [
  { top: '8%',  left: '6%',  w: 220 },
  { top: '14%', right: '8%', w: 260 },
  { top: '30%', left: '10%', w: 280 },
  { top: '26%', right: '14%', w: 220 },
  { top: '45%', left: '4%',  w: 240 },
  { top: '48%', right: '10%', w: 280 },
  { top: '62%', left: '18%', w: 220 },
  { top: '64%', right: '20%', w: 240 },
  { top: '10%', left: '40%', w: 220 },
  { top: '34%', left: '50%', w: 220 },
  { top: '54%', left: '46%', w: 260 },
  { top: '76%', left: '8%',  w: 220 },
  { top: '74%', right: '8%', w: 260 },
  { top: '86%', left: '36%', w: 220 },
];

export default function BackgroundCollage() {
  return (
    <>
      {IMAGES.map((src, i) => {
        const p = POS[i % POS.length];
        return (
          <div
            key={src + i}
            className="absolute z-0 opacity-30 pointer-events-none select-none"
            style={{ top: p.top, left: p.left, right: p.right }}
          >
            <Image
              src={src}
              alt=""
              width={p.w}
              height={p.w}
              className="rounded-xl"
              priority={i < 2}
            />
          </div>
        );
      })}
    </>
  );
}
