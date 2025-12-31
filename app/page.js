import fs from 'fs';
import path from 'path';
import Image from 'next/image';
import Link from 'next/link';

// read images from public/photos for ktp website directory
function readPhotosFolder() {
    const dir = path.join(process.cwd(), 'public', 'photos for ktp website');
    try {
        const files = fs.readdirSync(dir);
        // return raw public paths; do not pre-encode — let the browser/next/image handle encoding
        const images = files.filter((f) => /\.(jpe?g|png|gif|webp|avif|svg)$/i.test(f)).map((f) => `/photos for ktp website/${f}`);
        return images;
    } catch (e) {
        // fallback to public/images if folder missing
        const fallbackDir = path.join(process.cwd(), 'public', 'images');
        try {
            const files = fs.readdirSync(fallbackDir);
            return files.filter((f) => /\.(jpe?g|png|gif|webp|avif|svg)$/i.test(f)).map((f) => `/images/${f}`);
        } catch (e2) {
            return [];
        }
    }
}

const images = readPhotosFolder();

function Hero({ heroImages }) {
    return (
        <section className="relative isolate w-full bg-gray-900 text-white">
            {/* Top gradient matching About page */}
            <div aria-hidden="true" className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
                <div
                    style={{
                        clipPath:
                            'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
                    }}
                    className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#3b82f6] to-[#1e40af] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
                />
            </div>

            {/* cluster of images on the background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* hide decorative photos on small screens */}
                <div className="absolute inset-0 hidden md:flex items-center justify-center opacity-75 mix-blend-normal">
                    <div className="relative w-full max-w-6xl pointer-events-none">
                        <div className="absolute -left-12 -top-20 w-48 h-64 rounded-2xl overflow-hidden shadow-2xl rotate-6">
                            <Image src={heroImages[0]} alt="" fill className="object-cover" />
                        </div>
                        <div className="absolute left-36 -top-28 w-56 h-72 rounded-2xl overflow-hidden shadow-2xl -rotate-6">
                            <Image src={heroImages[1]} alt="" fill className="object-cover" />
                        </div>
                        <div className="absolute right-36 -top-24 w-48 h-64 rounded-2xl overflow-hidden shadow-2xl rotate-10">
                            <Image src={heroImages[2]} alt="" fill className="object-cover" />
                        </div>
                        <div className="absolute -right-12 -top-18 w-56 h-72 rounded-2xl overflow-hidden shadow-2xl -rotate-2">
                            <Image src={heroImages[3]} alt="" fill className="object-cover" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative z-10 px-6 lg:px-8">
                <div className="mx-auto max-w-5xl py-28 lg:py-36 text-center">
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight drop-shadow-lg">Kappa Theta Pi - New Brunswick</h1>
                    <p className="mt-4 text-lg sm:text-xl text-white/80 max-w-3xl mx-auto">A co-ed professional technology fraternity focused on building community, growing careers, and celebrating technical curiosity. Join us in connecting, learning, and growing together.</p>
                    <div className="mt-8">
                        <Link href="/rush" className="inline-flex items-center rounded-full bg-[#0f3b66]/95 px-8 py-4 text-lg font-bold text-white shadow-2xl hover:bg-[#123f7a] transition">Rush</Link>
                    </div>
                </div>
            </div>
        </section>
    )
}

function Gallery({ galleryImages }) {
    return (
        <section className="w-full bg-white py-12">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
                    <div className="lg:col-span-1">
                        <h2 className="text-2xl font-bold text-gray-900">New Jersey&apos;s Premier Technology Fraternity</h2>
                        <p className="mt-3 text-gray-600">We create a mentor-driven environment that helps members prepare for technical careers, build leadership, and grow a lifelong network.</p>
                        <div className="mt-4">
                            <Link href="/about" className="inline-flex items-center rounded-full bg-[#0f3b66]/95 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-[#123f7a] transition">More about us</Link>
                        </div>
                    </div>

                      <div className="lg:col-span-3">
                                    <div className="overflow-x-auto touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
                                        <div className="flex gap-6 pb-4 snap-x snap-mandatory">
                                            {galleryImages.map((src, i) => (
                                                <div key={i} className="snap-start min-w-[260px] md:min-w-[320px] lg:min-w-[360px] h-56 rounded-xl overflow-hidden shadow-lg flex-shrink-0">
                                                    <Image src={src} alt="KTP photo" width={720} height={480} className="object-cover w-full h-full" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                </div>
            </div>
        </section>
    )
}

export default function Home() {
    const heroImages = [
        '/photos for ktp website/IMG_6856.JPG',
        '/photos for ktp website/IMG_8831.JPG',
        '/photos for ktp website/IMG_6482.JPEG',
        '/photos for ktp website/IMG_6524.JPG',
    ];

    const galleryImages = images; // include hero images in the gallery as well

    return (
        <main className="min-h-screen bg-white text-gray-900">
            <Hero heroImages={heroImages} />
            <Gallery galleryImages={galleryImages} />
        </main>
    );
}