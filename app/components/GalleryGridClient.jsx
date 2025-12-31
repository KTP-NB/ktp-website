"use client";

import React, { useState } from 'react';
import Image from 'next/image';

export default function GalleryGridClient({ images = [], initialLoad = 20 }) {
  const [count, setCount] = useState(initialLoad);

  const visible = images.slice(0, count);

  const handleLoadMore = () => {
    setCount((c) => Math.min(images.length, c + 20));
  };

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {visible.map((src, idx) => (
          <div key={idx} className="w-full h-48 sm:h-56 md:h-48 lg:h-56 relative rounded overflow-hidden bg-gray-100">
            <Image src={src} alt={`gallery-${idx}`} fill sizes="(max-width: 768px) 50vw, 25vw" style={{ objectFit: 'cover' }} loading="lazy" />
          </div>
        ))}
      </div>

      {count < images.length && (
        <div className="flex justify-center mt-8">
          <button onClick={handleLoadMore} className="px-6 py-3 bg-blue-900 text-white rounded-md hover:bg-blue-700">
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
