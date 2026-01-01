"use client";

import React, { useState, useEffect } from "react";

/* =========================
   DATA
   ========================= */

const events = [
  {
    title: "Informational #1",
    date: "Monday, January 26th • 8:00–10:00 PM",
    location: "TBD",
    image: "/images/homepicture13.png",
    description:
      "Join us for an overview of what it means to be a brother of Kappa Theta Pi. Meet members, learn about rush, and ask questions in an open discussion format.",
  },
  {
    title: "Speed Networking",
    date: "Tuesday, January 27th • 7:00–9:00 PM",
    location: "TBD",
    image: "/images/homepicture12.png",
    description:
      "The same information will be presented as Open House #1. Feel free to attend either or both sessions.",
  },
  {
    title: "Informational 2",
    date: "Wednesday, January 28th • 6:30–8:00 PM",
    location: "TBD",
    image: "/images/homepicture3.jpg",
    description:
      "Hear honest conversations from our members about diversity, equity, and inclusion in KTP, on campus, and in the tech industry.",
  },
  {
    title: "Resume Review",
    date: "Thursday, January 29th • 8:00–9:00 PM",
    location: "TBD",
    image: "/images/homepicture2.jpg",
    description:
      "Get tips on crafting a strong resume and receive 1:1 support for your KTP rush application.",
  },
];

const faqs = [
  {
    question: "Who can rush KTP?",
    answer:
      "Anyone with an interest in technology and a commitment to our values is welcome to rush KTP.",
  },
  {
    question: "What types of social events does KTP host?",
    answer:
      "We host mixers, tech talks, workshops, and social events throughout the semester.",
  },
  {
    question: "How much of a time commitment is the pledge process?",
    answer:
      "The pledge process is designed to be manageable alongside coursework, with weekly meetings and events.",
  },
  {
    question: "What if I have no previous tech experience?",
    answer:
      "No prior tech experience is required. We welcome members from all backgrounds and skill levels.",
  },
  {
    question: "What if I can’t afford dues?",
    answer:
      "KTP offers financial assistance and flexible payment options so dues are not a barrier to membership.",
  },
];

/* =========================
   PAGE
   ========================= */
export default function RushPage() {
  const [offsetY, setOffsetY] = useState(0);
  const dots = useLoadingDots();


  useEffect(() => {
    const handleScroll = () => setOffsetY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen">

      {/* ================= HERO ================= */}
      <section className="relative h-[70vh] min-h-[750px] w-full overflow-hidden pb-30">
        {/* Parallax background */}
        <div
          className="absolute inset-0"
          style={{ transform: `translateY(${offsetY * 0.35}px)` }}
        >
          <img
            src="/images/homepicture9.jpeg"
            alt="Kappa Theta Pi Brothers"
            className="h-full w-full object-cover object-center"
          />
        </div>

        {/* overlay */}
        <div className="absolute inset-0 bg-black/35" />

        {/* content */}
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">

         
          <h1 className="text-4xl md:text-5xl font-semibold text-white">
            Spring 2026 Rush{" "}
            <span className="opacity">
                Loading{dots}
              </span>
          </h1>
         

          <p className="mt-4 max-w-2xl text-base md:text-lg text-gray-200">
            Learn about our rush process, events, and how to get involved with
            Kappa Theta Pi at Rutgers–New Brunswick.
          </p>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        </div>


      </section>

{/* ================= TIMELINE HEADER ================= */}
<section className="bg-gradient-to-b from-[#0f2a44] to-[#153a63] py-16">
  <div className="max-w-4xl mx-auto text-center px-6">
    <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">
      Rush Events Timeline
    </h2>

    <p className="mt-4 text-lg text-blue-100 leading-relaxed">
      Attend our open houses, panels, and information sessions to learn more
      about Kappa Theta Pi, our values, and our community.
    </p>

    <div className="mt-8 flex justify-center gap-4">
      <a
        href="/apply"
        className="rounded-full bg-blue-500 px-8 py-3 text-white font-medium hover:bg-blue-400 transition"
      >
        Apply Now
      </a>

      <a
        href="/apply"
        className="rounded-full border border-blue-300 px-8 py-3 text-blue-100 hover:bg-white/10 transition"

      >
        Interest Form
      </a>


      <a
        href="#faq"
        className="rounded-full border border-blue-300 px-8 py-3 text-blue-100 hover:bg-white/10 transition"
      >
        FAQs
      </a>
    </div>
  </div>
</section>


  
{/* ================= TIMELINE ================= */}
<section className="bg-gradient-to-b from-slate-50 via-white to-slate-100 pt-2 pb-28">
  <div className="max-w-7xl mx-auto px-6">
   
    <div className="relative space-y-24">
      {/* Center line */}
      <div className="absolute left-1/2 top-0 h-full w-[2px] bg-blue-200 -translate-x-1/2" />

      {events.map((event, idx) => {
        const isLeft = idx % 2 === 0;

        return (
          <div key={idx} className="grid grid-cols-[1fr_auto_1fr] items-center gap-12">
            {/* LEFT COLUMN */}
            <div className={`flex justify-${isLeft ? "end" : "start"}`}>
              {isLeft ? (
                <div className="max-w-md bg-white rounded-2xl shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {event.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{event.date}</p>
                  <p className="text-sm text-gray-500">{event.location}</p>
                  <p className="mt-4 text-sm text-gray-700 leading-relaxed">
                    {event.description}
                  </p>
                </div>
              ) : (
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-[360px] h-[240px] object-cover rounded-2xl shadow-lg"
                />
              )}
            </div>

            {/* TIMELINE DOT */}
            <div className="relative z-10">
              <div className="w-4 h-4 bg-blue-600 rounded-full ring-4 ring-blue-100" />
            </div>

            {/* RIGHT COLUMN */}
            <div className={`flex justify-${isLeft ? "start" : "end"}`}>
              {isLeft ? (
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-[360px] h-[240px] object-cover rounded-2xl shadow-lg"
                />
              ) : (
                <div className="max-w-md bg-white rounded-2xl shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {event.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{event.date}</p>
                  <p className="text-sm text-gray-500">{event.location}</p>
                  <p className="mt-4 text-sm text-gray-700 leading-relaxed">
                    {event.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
</section>




      {/* ================= FAQ ================= */}
      <section id="faq" className="bg-slate-50 py-28">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-14">
            Frequently Asked Questions
          </h2>

          <FAQAccordion faqs={faqs} />
        </div>
      </section>
    </div>
  );
}

/* =========================
   FAQ ACCORDION
   ========================= */

function FAQAccordion({ faqs }) {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => {
        const isOpen = openIndex === index;

        return (
          <div
            key={index}
            className={`rounded-xl border border-slate-200 bg-white transition-all ${
              isOpen ? "shadow-md" : "hover:shadow-sm"
            }`}
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between px-6 py-5 text-left"
            >
              <span className="text-base font-medium text-gray-900">
                {faq.question}
              </span>

              <span
                className={`ml-4 text-blue-600 transition-transform duration-300 ${
                  isOpen ? "rotate-180" : ""
                }`}
              >
                ▼
              </span>
            </button>

            <div
              className={`overflow-hidden transition-all duration-300 ${
                isOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <p className="px-6 pb-5 text-sm leading-relaxed text-gray-600">
                {faq.answer}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}


function useLoadingDots() {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return dots;
}

