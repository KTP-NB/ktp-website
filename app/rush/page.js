"use client";

import React, { useState, useEffect } from "react";
import FadeIn from "@/components/FadeIn";

/* =========================
   DATA
   ========================= */

const events = [
  {
    title: "Informational #1",
    date: "Monday, January 26th • 9:00–10:00 PM",
    location: "TBD",
    image: "/images/homepicture13.png",
    description:
      "Join us for an overview of what it means to be a brother of Kappa Theta Pi. Meet members, learn about rush, and ask questions in an open discussion format.",
  },
  {
    title: "Meet the Artists",
    date: "Tuesday, January 27th • 9:00–10:00 PM",
    location: "TBD",
    image: "/images/homepicture12.png",
    description:
      "Meet the brothers through short, rapid-fire conversations in a speed-dating style setup.",
  },
  {
    title: "Informational #2",
    date: "Wednesday, January 28th • 9:00-10:00 PM",
    location: "TBD",
    image: "/images/homepicture3.jpg",
    description:
      "Join us again for an overview of what it means to be a brother of Kappa Theta Pi. Meet members, learn about rush, and ask questions in an open discussion format.",
  },
  {
    title: "Paint the Set",
    date: "Thursday, January 29th • 9:00–10:00 PM",
    location: "TBD",
    image: "/images/homepicture2.jpg",
    description:
      "A fun, low-pressure paint-and-sip event to create art and get to know the brothers.",
  },
   {
    title: "Application Deadline",
    date: "Thursday, January 29th • 11:59  PM",
    location: "Online",
    image: "/photos for ktp website/DSC09511.jpg",
    description: "",  ctas: [
    { label: "Apply Now", href: "http://forms.gle/knCAtjQDVHZ6KkRCA", variant: "primary" },
   
  ],

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
      <FadeIn>

      {/* ================= HERO ================= */}
      <section className="relative h-[70vh] min-h-[950px] w-full overflow-hidden pb-30">
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

         
          <h1 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] drop-shadow-2xl mb-4 text-center text-white">
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
    <h2 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-center">
      Rush Events Timeline
    </h2>

    <p className="mt-4 text-lg text-blue-100 leading-relaxed">
      Attend our open houses, panels, and information sessions to learn more
      about Kappa Theta Pi, our values, and our community.
    </p>

    <div className="mt-8 flex justify-center gap-4">
      <a
        href="http://forms.gle/knCAtjQDVHZ6KkRCA"
        className="rounded-full bg-blue-500 px-8 py-3 text-white font-medium hover:bg-blue-400 transition"
      >
        Apply Now
      </a>

      <a
        href="http://forms.gle/frWXJ9Ga6AZphLNu7"
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
                                
                <div className="w-[420px]  rounded-2xl bg-white/90 backdrop-blur-md border border-white/40 shadow-[0_18px_50px_rgba(0,0,0,0.18)] p-6">
                  <div className="text-[11px] tracking-[0.18em] uppercase text-slate-500">
                    Event Details
                  </div>

                  <h3 className="mt-2 text-lg font-semibold text-slate-900">
                    {event.title}
                  </h3>

                  <p className="text-sm text-slate-600 mt-1">{event.date}</p>
                  <p className="text-sm text-slate-500">{event.location}</p>

                  {event.description && (
                    <p className="mt-4 text-sm text-slate-700 leading-relaxed">
                      {event.description}
                    </p>
                  )}

                  {/* optional CTAs if you added them */}
                  {event.ctas?.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-3">
                      {event.ctas.map((cta) => (
                        <a
                          key={cta.href}
                          href={cta.href}
                          className={
                            cta.variant === "primary"
                              ? "rounded-full bg-slate-900 px-5 py-2.5 text-white text-sm font-medium hover:bg-slate-800 transition"
                              : "rounded-full border border-slate-300 px-5 py-2.5 text-slate-800 text-sm font-medium hover:bg-slate-50 transition"
                          }
                        >
                          {cta.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>




              ) : (
              <div className="relative w-[420px]">
                {/* subtle spotlight */}

                {/* outer frame */}
                <div className="rounded-[18px] bg-[#0b0f1c] p-[10px] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
                  {/* inner metallic lip */}
                  <div className="rounded-[14px] p-[2px] bg-gradient-to-r from-white/30 via-white/10 to-white/30">
                    {/* mat board */}
                    <div className="rounded-[12px] bg-[#f8fafc] p-4">
                      {/* photo */}
                      <div className="overflow-hidden rounded-[10px] bg-black">
                        <img
                          src={event.image}
                          alt={event.title}
                          className="w-[380px] h-[240px] object-cover"
                        />
                      </div>

                      {/* exhibit label */}
                      <div className="mt-3">
                        <div className="text-[10px] tracking-[0.22em] uppercase text-slate-400">
                          Night Palooza Exhibition
                        </div>
                        <div className="text-sm font-medium text-slate-700">
                          {event.title}
                        </div>
                        
                      </div>
                    </div>
                  </div>
                </div>
              </div>




              )}
            </div>

            {/* TIMELINE DOT */}
            <div className="relative z-10">
              <div className="w-4 h-4 bg-blue-600 rounded-full ring-4 ring-blue-100" />
            </div>

            {/* RIGHT COLUMN */}
            <div className={`flex justify-${isLeft ? "start" : "end"}`}>
              {isLeft ? (

              <div className="relative w-[420px]">
                {/* subtle spotlight */}

                {/* outer frame */}
                <div className="rounded-[18px] bg-[#0b0f1c] p-[10px] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
                  {/* inner metallic lip */}
                  <div className="rounded-[14px] p-[2px] bg-gradient-to-r from-white/30 via-white/10 to-white/30">
                    {/* mat board */}
                    <div className="rounded-[12px] bg-[#f8fafc] p-4">
                      {/* photo */}
                      <div className="overflow-hidden rounded-[10px] bg-black">
                        <img
                          src={event.image}
                          alt={event.title}
                          className="w-[380px] h-[240px] object-cover"
                        />
                      </div>

                      {/* exhibit label */}
                      <div className="mt-3">
                        <div className="text-[10px] tracking-[0.22em] uppercase text-slate-400">
                          Night Palooza Exhibition
                        </div>
                        <div className="text-sm font-medium text-slate-700">
                          {event.title}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
                                ) : (
                           
                                
                <div className="w-[420px]  rounded-2xl bg-white/90 backdrop-blur-md border border-white/40 shadow-[0_18px_50px_rgba(0,0,0,0.18)] p-6">
                  <div className="text-[11px] tracking-[0.18em] uppercase text-slate-500">
                    Event Details
                  </div>

                  <h3 className="mt-2 text-lg font-semibold text-slate-900">
                    {event.title}
                  </h3>

                  <p className="text-sm text-slate-600 mt-1">{event.date}</p>
                  <p className="text-sm text-slate-500">{event.location}</p>

                  {event.description && (
                    <p className="mt-4 text-sm text-slate-700 leading-relaxed">
                      {event.description}
                    </p>
                  )}

                  {/* optional CTAs if you added them */}
                  {event.ctas?.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-3">
                      {event.ctas.map((cta) => (
                        <a
                          key={cta.href}
                          href={cta.href}
                          className={
                            cta.variant === "primary"
                              ? "rounded-full bg-slate-900 px-5 py-2.5 text-white text-sm font-medium hover:bg-slate-800 transition"
                              : "rounded-full border border-slate-300 px-5 py-2.5 text-slate-800 text-sm font-medium hover:bg-slate-50 transition"
                          }
                        >
                          {cta.label}
                        </a>
                      ))}
                    </div>
                  )}
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
      </FadeIn>
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

