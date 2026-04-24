'use client';

import React, { useState, useEffect } from "react";
import GalleryGridClient from "@/components/GalleryGridClient";
import Image from "next/image";
import FadeIn from "@/components/FadeIn";

const headerImage = "/photos for ktp website/KTPFormal-54.jpg";

// Same list you used on the home page (or whatever subset you want)
const images = [
  "/photos for ktp website/KTPFormal-54.jpg",
  "/photos for ktp website/KTPFormal-48.jpg",
  "/photos for ktp website/KTPFormal-38.jpg",
  "/photos for ktp website/IMG_6482.JPEG",
  "/photos for ktp website/IMG_6524.JPG",
  "/photos for ktp website/IMG_6856.JPG",
  "/photos for ktp website/IMG_8831.JPG",
  "/photos for ktp website/100_5433.JPG",
  "/photos for ktp website/948404BD-45D8-42ED-944B-A1FC2F99BCB3_1_201_a.jpeg",
  "/photos for ktp website/DSC09511.jpg",
  "/photos for ktp website/IMG_3107.jpeg",
  "/photos for ktp website/IMG_3135.JPG",
  "/photos for ktp website/IMG_3646.JPG",
  "/photos for ktp website/IMG_3662.JPG",
  "/photos for ktp website/IMG_3805.jpeg",
  "/photos for ktp website/IMG_3855.jpeg",
  "/photos for ktp website/IMG_3943.JPG",
  "/photos for ktp website/IMG_4150.JPG",
  "/photos for ktp website/IMG_4265.JPG",
  "/photos for ktp website/IMG_4337.jpeg",
  "/photos for ktp website/IMG_4362.JPG",
  "/photos for ktp website/IMG_4405.jpeg",
  "/photos for ktp website/IMG_4672.JPG",
  "/photos for ktp website/IMG_5638.jpeg",
  "/photos for ktp website/IMG_6731.JPG",
  "/photos for ktp website/IMG_6198.JPG",
  "/photos for ktp website/IMG_6229.JPG",
  "/photos for ktp website/IMG_6877.JPG",
  "/photos for ktp website/IMG_6881.JPG",
  "/photos for ktp website/IMG_6892.JPG",
  "/photos for ktp website/IMG_6932.JPG",
  "/photos for ktp website/IMG_8832.JPG",
  "/photos for ktp website/IMG_8833.JPG",
  "/photos for ktp website/IMG_8834.JPG",
];

export default function GalleryPage() {
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setOffsetY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen text-white">
      <FadeIn>
      {/* Hero header: single stationary image */}
      <section className="relative h-[70vh] min-h-[950px] w-full bg-gray-200 overflow-hidden pb-30">
        <div 
          className="absolute inset-0"
          style={{ transform: `translateY(${offsetY * 0.35}px)` }}
        >
          <Image
            src={headerImage}
            alt="Gallery header"
            fill
            style={{ objectFit: "cover", objectPosition: "center" }}
          />
        </div>
        <div className="absolute inset-0 bg-black/35" />

        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <h1 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] drop-shadow-2xl mb-4 text-center text-white">
            GALLERY
          </h1>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-3xl border border-blue-100/35 bg-[#dbe8ff]/28 backdrop-blur-xl p-5 sm:p-7">
          <GalleryGridClient images={images} initialLoad={20} />
        </div>
      </main>
      </FadeIn>
    </div>
  );
}
