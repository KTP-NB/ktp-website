"use client";

import React from 'react';
import { FaEnvelope } from "react-icons/fa";

export function Newsletter() {
    return (
        <div className="relative isolate overflow-hidden py-16 sm:py-24 lg:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-2">
                    {/* Left section: Subscribe and description */}
                    <div className="max-w-xl lg:max-w-lg lg:flex lg:flex-col lg:justify-center">
                        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl text-center lg:text-left">
                            Subscribe to our newsletter.
                        </h2>
                        <p className="mt-4 text-lg leading-8 text-gray-300 text-center lg:text-left">
                            Get the latest news and updates from Kappa Theta Pi - New Brunswick. We promise no spam.
                        </p>
                    </div>

                    {/* Right section: Event news and input form */}
                    <div className="lg:flex lg:flex-col lg:justify-center lg:w-full">
                        <div className="flex flex-col items-start">
                            <div className="rounded-md bg-white/5 p-2 ring-1 ring-white/10 mb-4">
                                <FaEnvelope className="w-6 h-6 text-white" />
                            </div>
                            <dt className="mt-2 font-bold text-2xl text-white">Events and News</dt>
                            <dd className="mt-2 leading-7 text-gray-400">
                                Get emails notifying you of our upcoming events and stay up to date with organization news.
                            </dd>

                            {/* Input form below the event/news section */}
                            <div className="mt-6 flex max-w-md gap-x-4 w-full">
                                <label htmlFor="email-address" className="sr-only">Email address</label>
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="Enter your email"
                                    autoComplete="email"
                                    className="min-w-0 flex-auto rounded-md border-0 bg-white/5 px-3.5 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                                />
                                <button
                                    type="submit"
                                    className="flex-none rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                                >
                                    Subscribe
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}