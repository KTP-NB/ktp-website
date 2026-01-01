import GalleryGridClient from "@/components/GalleryGridClient";
import Image from "next/image";

const headerImage = "/photos for ktp website/IMG_6856.JPG";

// Same list you used on the home page (or whatever subset you want)
const images = [
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
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Hero header: single stationary image */}
      <section className="relative h-64 sm:h-80 md:h-96 lg:h-[420px] w-full bg-gray-200 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={headerImage}
            alt="Gallery header"
            fill
            style={{ objectFit: "cover", objectPosition: "center" }}
          />
          <div className="absolute inset-0 bg-[rgba(3,7,18,0.45)]" />
        </div>

        <div className="relative z-10 flex h-full items-center justify-center">
          <h1 className="text-white text-4xl sm:text-5xl md:text-6xl font-semibold tracking-widest">
            GALLERY
          </h1>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <GalleryGridClient images={images} initialLoad={20} />
      </main>
    </div>
  );
}
