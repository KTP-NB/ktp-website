'use client';

import { useState, useEffect } from 'react'
import { Dialog, DialogPanel } from '@headlessui/react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import Link from 'next/link'

const MosaicBackground = () => {
    const images = [
        '/images/homepicture1.JPG',
        '/images/homepicture2.JPG',
        '/images/homepicture3.JPG',
        '/images/homepicture4.jpg',
        '/images/homepicture5.jpg',
        '/images/homepicture6.png',
        '/images/homepicture7.png',
        '/images/homepicture8.jpeg',
        '/images/homepicture9.jpeg',
        '/images/homepicture10.jpeg',
        '/images/homepicture11.jpeg',
        '/images/homepicture12.png',
        '/images/homepicture13.png',
        '/images/homepicture14.jpeg',
        '/images/homepicture15.jpeg',
        '/images/homepicture16.jpeg'
    ]

    const [mosaicTiles, setMosaicTiles] = useState([])

    useEffect(() => {
        const generateTiles = () => {
            const tiles = []
            const tileCount = 30

            for (let i = 0; i < tileCount; i++) {
                const randomImage = images[Math.floor(Math.random() * images.length)]
                const size = Math.random() * 250 + 200 // 200-450px

                const x = Math.random() * 90 + 5 // 5-95%
                const y = Math.random() * 90 + 5 // 5-95%

                const rotation = Math.random() * 40 - 20 // -20 to 20 degrees
                const delay = Math.random() * 10

                tiles.push({
                    id: i,
                    image: randomImage,
                    size: size,
                    x: x,
                    y: y,
                    rotation: rotation,
                    delay: delay
                })
            }
            return tiles
        }

        setMosaicTiles(generateTiles())

        const interval = setInterval(() => {
            setMosaicTiles(generateTiles())
        }, 30000)

        return () => clearInterval(interval)
    }, [])

    return (
        // Changed from 'absolute' to 'absolute' but ONLY within this component's container
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: -5 }}>
            {mosaicTiles.map((tile) => (
                <div
                    key={tile.id}
                    className="absolute transition-all duration-[10000ms] ease-in-out"
                    style={{
                        left: `${tile.x}%`,
                        top: `${tile.y}%`,
                        width: `${tile.size}px`,
                        height: `${tile.size}px`,
                        transform: `translate(-50%, -50%) rotate(${tile.rotation}deg)`,
                        animationDelay: `${tile.delay}s`,
                        opacity: 0.6,
                    }}
                >
                    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl">
                        <Image
                            src={tile.image}
                            alt=""
                            fill
                            className="object-cover filter blur-[0.5px]"
                            sizes="450px"
                            onError={(e) => {
                                e.target.parentElement.style.backgroundColor = '#4338ca';
                                e.target.style.display = 'none';
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    )
}

export default function Example() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    return (
        // This container now defines the boundaries for the mosaic background
        <div className="text-white min-h-screen flex flex-col justify-center items-center relative overflow-hidden">
            <MosaicBackground />

            <div className='absolute left-16 top-40 max-w-lg rounded-lg opacity-90 z-10'>
                {/*<Image src="/image1.png" alt="KTP Logo" width={400} height={400} className='rounded-md'/>*/}
            </div>

            <div className='absolute right-16 bottom-16 max-w-lg rounded-lg opacity-90 z-10'>
                {/*<Image src="/image2.png" alt="KTP Logo" width={600} height={600} className='rounded-md'/>*/}
            </div>

            <div className="relative isolate px-6 lg:px-8 w-full z-10">
                <div className="mx-auto py-24 sm:py-32 lg:py-40 flex flex-col items-center">
                    <div className="text-center w-full max-w-none relative z-20">
                        <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl drop-shadow-2xl backdrop-blur-sm bg-black/10 rounded-2xl p-8 border border-white/10">
                            Kappa Theta Pi - New Brunswick
                        </h1>
                        <div className="mt-8 text-lg leading-8 text-gray-100 max-w-2xl mx-auto drop-shadow-lg backdrop-blur-sm bg-black/20 rounded-xl p-6 border border-white/5">
                            New Brunswick&apos;s premier co-ed professional technology fraternity, committed to building a supportive community and helping students grow professionally. We foster diversity and inclusivity, empowering individuals with a shared passion for technology and career development.
                        </div>
                        <div className="mt-10 flex items-center justify-center gap-x-6">
                            <Link href="/rush">
                                <div className="rounded-md bg-indigo-600/90 backdrop-blur-sm px-3.5 py-2.5 text-sm font-semibold text-white shadow-2xl hover:bg-indigo-500/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all duration-300 hover:shadow-xl hover:scale-105 border border-indigo-400/30">
                                    Rush
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}