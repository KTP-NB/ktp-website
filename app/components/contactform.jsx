"use client";

import React from 'react';
import { FaEnvelope, FaUser, FaEdit } from "react-icons/fa";

export function ContactForm() {
    return (
        <div className="relative isolate overflow-hidden py-8 sm:py-24 lg:py-16">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                {/* Create a flex container to align the contact section and form side by side */}
                <div className="flex flex-col lg:flex-row gap-12 justify-center">
                    {/* Left column: Contact Us title and description */}
                    <div className="lg:w-1/2 max-w-xl">
                        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Contact Us.</h2>
                        <p className="mt-4 text-lg leading-8 text-gray-300 text-wrap">
                            Have questions or suggestions? Let us know and we will be back with you right away.
                        </p>
                    </div>

                    {/* Right column: Form */}
                    <div className="lg:w-1/2">
                        <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2">
                            <div>
                                <label htmlFor="name" className="sr-only">Name</label>
                                <div className="relative">
                                    <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white" />
                                    <input
                                        id="name"
                                        name="name"
                                        type="text"
                                        required
                                        placeholder="Your Name"
                                        className="block w-full rounded-md border-0 bg-white/5 px-3.5 py-2 pl-10 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="email-address" className="sr-only">Email address</label>
                                <div className="relative">
                                    <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white" />
                                    <input
                                        id="email-address"
                                        name="email"
                                        type="email"
                                        required
                                        placeholder="Your Email"
                                        autoComplete="email"
                                        className="block w-full rounded-md border-0 bg-white/5 px-3.5 py-2 pl-10 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                                    />
                                </div>
                            </div>
                            <div className="sm:col-span-2">
                                <label htmlFor="subject" className="sr-only">Subject</label>
                                <div className="relative">
                                    <FaEdit className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white" />
                                    <input
                                        id="subject"
                                        name="subject"
                                        type="text"
                                        required
                                        placeholder="Subject"
                                        className="block w-full rounded-md border-0 bg-white/5 px-3.5 py-2 pl-10 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                                    />
                                </div>
                            </div>
                            <div className="sm:col-span-2">
                                <label htmlFor="message" className="sr-only">Message</label>
                                <div className="relative">
                                    <textarea
                                        id="message"
                                        name="message"
                                        rows={4}
                                        required
                                        placeholder="Your Message"
                                        className="block w-full rounded-md border-0 bg-white/5 px-3.5 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                                    />
                                </div>
                            </div>
                            <div className="sm:col-span-2">
                                <button
                                    type="submit"
                                    className="flex w-full justify-center rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                                >
                                    Send Message
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
