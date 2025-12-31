import fs from 'fs';
import path from 'path';
import GalleryGridClient from '@/components/GalleryGridClient';
import Image from 'next/image';

function readPhotosFolder() {
  const dir = path.join(process.cwd(), 'public', 'photos for ktp website');
  try {
    const files = fs.readdirSync(dir);
    return files.filter((f) => /\.(jpe?g|png|gif|webp|avif|svg)$/i.test(f)).map((f) => `/photos for ktp website/${f}`);
  } catch (e) {
    return [];
  }
}

export default function GalleryPage() {
  const headerImage = '/IMG_6856.JPG';
  const images = readPhotosFolder();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Hero header: single stationary image */}
      <section className="relative h-64 sm:h-80 md:h-96 lg:h-[420px] w-full bg-gray-200 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={headerImage}
            alt="Gallery header"
            fill
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
          <div className="absolute inset-0 bg-[rgba(3,7,18,0.45)]" />
        </div>

        <div className="relative z-10 flex h-full items-center justify-center">
          <h1 className="text-white text-4xl sm:text-5xl md:text-6xl font-semibold tracking-widest">GALLERY</h1>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <GalleryGridClient images={images} initialLoad={20} />
      </main>
    </div>
  );
}
