'use client'

import { useState } from 'react'
import { Dialog, DialogPanel } from '@headlessui/react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import Link from 'next/link'

export default function Example() {
  // Exact, case-sensitive paths from /public/images
  const BG_IMAGES = [
    '/images/bg1.JPG',
    '/images/bg2.png',
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
  ];

  // --- FilmStrip (inline) ---
  const FilmStrip = ({ images, speedSec = 40 }) => {
    const row = [...images, ...images]; // duplicate for seamless loop
    return (
      // moved lower so it doesn't overlap hero
      <div className="absolute inset-x-0 top-[52%] z-0 px-4 pointer-events-none select-none">
        <div className="relative mx-auto max-w-7xl">
          <div className="relative h-[300px] overflow-hidden">
            {/* scrolling row */}
            <motion.div
              className="flex gap-8 w-max"
              animate={{ x: ['-50%', '0%'] }} // rightward loop
              transition={{ duration: speedSec, ease: 'linear', repeat: Infinity }}
              style={{ willChange: 'transform' }}
            >
              {row.map((src, i) => (
                <div key={`${src}-${i}`} className="shrink-0">
                  <Image
                    src={src}
                    alt=""
                    width={400}
                    height={260}
                    className="h-[260px] w-[400px] object-cover rounded-2xl shadow-xl opacity-70"
                    priority={i < 2}
                  />
                </div>
              ))}
            </motion.div>

            {/* edge fades for a clean embed */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-gray-900/95 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-gray-900/95 to-transparent" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden text-white bg-gray-900/40">
      {/* ---- Gradients (furthest back) ---- */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 -top-40 -z-20 transform-gpu overflow-hidden blur-3xl sm:-top-80"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem]
                     -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr
                     from-[#3b82f6] to-[#1e40af] opacity-30
                     sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
        />
      </div>

          <div className="mx-auto py-24 sm:py-32 lg:py-40 flex flex-col items-center">
            <div className="text-center w-full max-w-none">
              <h1 className="text-5xl font-bold tracking-tight text-white sm:text-5xl">
                Kappa Theta Pi - New Brunswick
              </h1>
              <div className="mt-6 text-lg leading-8 text-gray-300 max-w-2xl mx-auto">
                New Brunswick&apos;s premier co-ed professional technology fraternity, committed to building a supportive community and helping students grow professionally. We foster diversity and inclusivity, empowering individuals with a shared passion for technology and career development.
              </div>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link href="/rush">
                  <div className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                    Rush
                  </div>
                </Link>
              </div>
            </div>
          </div>

        {/* ---- Bottom gradient (furthest back) ---- */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-[calc(100%-13rem)] -z-20 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
        >
          <div
            className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem]
                       -translate-x-1/2 bg-gradient-to-tr from-[#3b82f6] to-[#1e40af]
                       opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
