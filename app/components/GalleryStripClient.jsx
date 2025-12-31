"use client";

import React from 'react';
import Image from 'next/image';

export default function GalleryStripClient({ images = [] }) {
  return (
    <div className="overflow-x-auto py-6">
      <div className="flex gap-4 px-4 snap-x snap-mandatory touch-pan-x">
        {images.map((src, idx) => (
          <div key={idx} className="snap-start flex-shrink-0 w-[260px] h-[180px] sm:w-[300px] sm:h-[200px] rounded overflow-hidden bg-gray-100">
            <Image src={src} alt={`strip-${idx}`} fill style={{ objectFit: 'cover' }} loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  );
}
