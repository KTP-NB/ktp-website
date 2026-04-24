'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

const heroImages = [
  '/photos for ktp website/IMG_6856.JPG',
  '/photos for ktp website/IMG_8831.JPG',
  '/photos for ktp website/IMG_6482.JPEG',
  '/photos for ktp website/KTPFormal-48.jpg',
];

const galleryImages = [
  '/photos for ktp website/IMG_6482.JPEG',
  '/photos for ktp website/IMG_6524.JPG',
  '/photos for ktp website/IMG_6856.JPG',
  '/photos for ktp website/IMG_8831.JPG',
  '/photos for ktp website/100_5433.JPG',
  '/photos for ktp website/948404BD-45D8-42ED-944B-A1FC2F99BCB3_1_201_a.jpeg',
  '/photos for ktp website/DSC09511.jpg',
  '/photos for ktp website/IMG_3107.jpeg',
  '/photos for ktp website/IMG_3135.JPG',
  '/photos for ktp website/IMG_3646.JPG',
  '/photos for ktp website/IMG_3662.JPG',
  '/photos for ktp website/IMG_3805.jpeg',
    '/photos for ktp website/IMG_3855.jpeg',
    '/photos for ktp website/IMG_3943.JPG',
    '/photos for ktp website/IMG_4150.JPG',
];

const whoAreWeImages = [
    '/photos for ktp website/IMG_8831.JPG',
    '/photos for ktp website/IMG_6856.JPG',
    '/photos for ktp website/IMG_3805.jpeg',
    '/photos for ktp website/IMG_3943.JPG',
];

const logos = [
    { src: '/images/amazon.png', alt: 'Amazon' },
    { src: '/images/verizon.png', alt: 'Verizon' },
    { src: '/images/vanguard.png', alt: 'Vanguard' },
    { src: '/images/jnj.png', alt: 'JNJ' },
    { src: '/images/panasonic.png', alt: 'Panasonic' },
    { src: '/images/fidelity.png', alt: 'Fidelity' },
    { src: '/images/nokia.png', alt: 'Nokia' },
    { src: '/images/ADP.png', alt: 'ADP' },
    { src: '/images/s&p.png', alt: 'S&P' },
    { src: '/images/pfizer.png', alt: 'Pfizer' },
    { src: '/images/firstcitizens.png', alt: 'First Citizens' },
    { src: '/images/church.png', alt: 'Church & Dwight' },
    { src: '/images/cvs.png', alt: 'CVS' },
    { src: '/images/dow.png', alt: 'DOW' },
    { src: '/images/Regeneron.png', alt: 'Regeneron' },
    { src: '/images/shi.png', alt: 'SHI' },
    { src: '/images/parsons.png', alt: 'Parsons' },
    { src: '/images/allstate.png', alt: 'Allstate' },
];

function Hero() {
    return (
        <section className="relative isolate w-full text-white overflow-hidden">
            {/* Multi-spot Radial Gradients */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] -z-10 animate-pulse" />
            <div className="absolute bottom-[10%] right-[-5%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[150px] -z-10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-400/10 rounded-full blur-[180px] -z-10" />
            <div className="absolute top-[20%] right-[15%] w-[400px] h-[400px] bg-blue-500/15 rounded-full blur-[100px] -z-10 animate-pulse" />

            <div className="relative z-10 px-6 lg:px-8 pt-24 pb-32 lg:pt-36 lg:pb-44">
                <div className="mx-auto max-w-7xl relative">
                    {/* Floating Images - Left Side */}
                    <div className="hidden xl:block absolute left-[-4rem] top-[-4rem] bottom-[-4rem] w-64 pointer-events-none z-10">
                        <motion.div initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.8, ease: "easeOut" }} className="absolute top-[5%] left-0">
                            <div className="relative w-64 h-80 rounded-2xl border border-blue-100/35 overflow-hidden shadow-2xl animate-float pointer-events-auto" style={{ '--rotation': '-6deg', transform: 'rotate(-6deg)' }}>
                                <Image src={heroImages[0]} alt="KTP moment" fill className="object-cover" />
                            </div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.9, ease: "easeOut" }} className="absolute bottom-[5%] left-8">
                            <div className="relative w-72 h-72 rounded-2xl border border-blue-100/35 overflow-hidden shadow-2xl animate-float-slow pointer-events-auto" style={{ '--rotation': '4deg', transform: 'rotate(4deg)' }}>
                                <Image src={heroImages[1]} alt="KTP moment" fill className="object-cover" />
                            </div>
                        </motion.div>
                    </div>

                    {/* Floating Images - Right Side */}
                    <div className="hidden xl:block absolute right-[-4rem] top-[-4rem] bottom-[-4rem] w-80 pointer-events-none z-10">
                        <motion.div initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.5, delay: 1.0, ease: "easeOut" }} className="absolute top-[8%] right-0">
                            <div className="relative w-72 h-72 rounded-2xl border border-blue-100/35 overflow-hidden shadow-2xl animate-float-slow pointer-events-auto" style={{ '--rotation': '8deg', transform: 'rotate(8deg)' }}>
                                <Image src={heroImages[2]} alt="KTP moment" fill className="object-cover" />
                            </div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.5, delay: 1.1, ease: "easeOut" }} className="absolute top-[43%] right-[10rem] z-30">
                            <div className="relative right-[-1rem] w-56 h-44 rounded-2xl border border-blue-100/35 overflow-hidden shadow-2xl animate-float pointer-events-auto" style={{ '--rotation': '-1deg', transform: 'rotate(-1deg)' }}>
                                <Image src={'/photos for ktp website/IMG_6731.JPG'} alt="KTP moment" fill className="object-cover" />
                            </div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.5, delay: 1.2, ease: "easeOut" }} className="absolute bottom-5 right-3">
                            <div className="relative bottom-[-1rem] w-80 h-60 rounded-3xl border border-blue-100/35 overflow-hidden shadow-2xl animate-float pointer-events-auto" style={{ '--rotation': '-5deg', transform: 'rotate(-5deg)' }}>
                                <Image src={heroImages[3]} alt="KTP moment" fill className="object-cover" />
                            </div>
                        </motion.div>
                    </div>

                    <div className="relative flex flex-col items-center justify-center text-center">
                        
                        {/* Left side for smaller screens */}
                        <div className="xl:hidden flex gap-4 mb-12">
                             <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.8 }}>
                                <div className="relative w-36 h-48 sm:w-44 sm:h-60 rounded-xl border border-blue-100/35 overflow-hidden shadow-xl animate-float" style={{ '--rotation': '-4deg', transform: 'rotate(-4deg)' }}>
                                    <Image src={heroImages[0]} alt="KTP moment" fill className="object-cover" />
                                </div>
                            </motion.div>
                            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.9 }}>
                                <div className="relative w-36 h-48 sm:w-44 sm:h-60 rounded-xl border border-blue-100/35 overflow-hidden shadow-xl animate-float-slow mt-10" style={{ '--rotation': '3deg', transform: 'rotate(3deg)' }}>
                                    <Image src={heroImages[1]} alt="KTP moment" fill className="object-cover" />
                                </div>
                            </motion.div>
                        </div>

                        <div className="max-w-3xl z-20">
                            <motion.p
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="text-sm uppercase tracking-[0.3em] text-blue-200 font-bold mb-4 drop-shadow-md"
                            >
                                Kappa Theta Pi | New Brunswick
                            </motion.p>
                            <motion.h1
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] drop-shadow-2xl"
                            >
                                New Brunswick&apos;s
                                <span className="block text-blue-200 mt-2">Premier Tech Fraternity</span>
                            </motion.h1>
                             <motion.p
                                 initial={{ opacity: 0, y: 16 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 transition={{ duration: 0.5, delay: 0.3 }}
                                 className="mt-8 text-xl text-blue-50/90 max-w-2xl mx-auto leading-relaxed font-medium"
                             >
                                 A co-ed professional technology fraternity focused on developing a brotherhood of technical professionals. We foster technical growth, professional development, and long-lasting community.
                             </motion.p>
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.4 }}
                                className="mt-10 flex flex-wrap justify-center gap-5"
                            >
                                <Link href="/rush" className="group relative inline-flex items-center rounded-full bg-blue-600 px-10 py-4 text-lg font-bold text-white hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)]">
                                    Rush Now
                                    <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
                                </Link>
                                <Link href="/about" className="inline-flex items-center rounded-full border-2 border-blue-200/50 px-10 py-4 text-lg font-bold text-white hover:bg-white/10 transition-all backdrop-blur-sm">
                                    About Us
                                </Link>
                            </motion.div>
                        </div>

                        {/* Right side for smaller screens */}
                        <div className="xl:hidden flex gap-4 mt-12">
                             <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 1.0 }}>
                                <div className="relative w-36 h-48 sm:w-44 sm:h-60 rounded-xl border border-blue-100/35 overflow-hidden shadow-xl animate-float-slow" style={{ '--rotation': '5deg', transform: 'rotate(5deg)' }}>
                                    <Image src={heroImages[2]} alt="KTP moment" fill className="object-cover" />
                                </div>
                            </motion.div>
                            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 1.1 }}>
                                <div className="relative w-36 h-48 sm:w-44 sm:h-60 rounded-xl border border-blue-100/35 overflow-hidden shadow-xl animate-float mt-10" style={{ '--rotation': '-6deg', transform: 'rotate(-6deg)' }}>
                                    <Image src={heroImages[3]} alt="KTP moment" fill className="object-cover" />
                                </div>
                            </motion.div>
                        </div>

                    </div>
                </div>
            </div>
        </section>
    );
}

function CarouselSection() {
    const carouselImages = galleryImages.filter((img) => !whoAreWeImages.includes(img));

    return (
        <section className="px-6 lg:px-8 pb-16 lg:pb-20">
            <div className="mx-auto max-w-7xl rounded-3xl border border-blue-100/35 bg-[#dbe8ff]/28 backdrop-blur-xl shadow-[0_16px_45px_rgba(16,36,76,0.30)] p-8 md:p-10 lg:p-12">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-white font-semibold">KTP Moments</p>
                        <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-blue-200">Chapter Life In Motion</h2>
                    </div>
                    <Link href="/gallery" className="inline-flex items-center rounded-full bg-blue-600/90 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition">
                        View Full Gallery
                    </Link>
                </div>

                <div className="mt-8 overflow-x-auto touch-pan-x pretty-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <div className="flex gap-6 pb-4 snap-x snap-mandatory">
                        {carouselImages.map((src, i) => (
                            <div key={src + i} className="relative snap-start min-w-[260px] md:min-w-[320px] lg:min-w-[360px] h-56 rounded-2xl overflow-hidden border border-blue-100/35 shadow-[0_16px_36px_rgba(18,40,82,0.34)] backdrop-blur-md bg-white/10 flex-shrink-0">
                                <Image src={src} alt="KTP photo" width={720} height={480} className="object-cover w-full h-full" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#112347]/18 via-transparent to-white/10" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

function NetworkSection() {
    return (
        <section className="px-6 lg:px-8 pb-16 lg:pb-20">
            <div className="mx-auto max-w-7xl rounded-3xl border border-blue-100/35 bg-[#dbe8ff]/28 backdrop-blur-xl shadow-[0_16px_45px_rgba(16,36,76,0.30)] p-8 md:p-10 lg:p-12">
                <div className="flex justify-start">
                    <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-blue-200 text-left">Our Network</h2>
                </div>
                <div className="mt-8 flex flex-wrap justify-center gap-4 md:gap-5">
                    {logos.map((l) => (
                        <div
                            key={l.alt}
                            className="relative h-[70px] w-[160px] md:w-[180px] px-2 transition-transform duration-300 ease-out hover:scale-125"
                        >                         
                            <Image
                                src={l.src}
                                alt={l.alt}
                                fill
                                sizes="(max-width:768px) 140px, 180px"
                                className="object-contain drop-shadow-[0_5px_5px_#000]"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default function Home() {
    return (
        <main className="min-h-screen text-foreground pb-8 overflow-x-hidden">
            <Hero />
            <CarouselSection />
            <NetworkSection />
        </main>
    );
}