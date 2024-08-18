"use client";

import React from 'react';
import { FaEnvelope } from "react-icons/fa";
import { FaUserTie } from "react-icons/fa";


export function Newsletter() {
    return (
        <div className="relative isolate overflow-hidden py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-2">
                <div className="max-w-xl lg:max-w-lg">
                    <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Subscribe to our newsletter.</h2>
                    <p className="mt-4 text-lg leading-8 text-gray-300">
                        Get the latest news and updates from Kappa Theta Pi - New Brunswick. We promise no spam.
                    </p>
                    <div className="mt-6 flex max-w-md gap-x-4">
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
                <dl className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:pt-2">
                    <div className="flex flex-col items-start">
                        <div className="rounded-md bg-white/5 p-2 ring-1 ring-white/10">
                        <FaEnvelope className="w-6 h-6 text-white" />
                        </div>
                        <dt className="mt-4 font-semibold text-white">Events and News</dt>
                        <dd className="mt-2 leading-7 text-gray-400">
                            Get emails notifying you of our upcoming events and stay up to date with organization news.
                        </dd>
                    </div>
                    <div className="flex flex-col items-start">
                        <div className="rounded-md bg-white/5 p-2 ring-1 ring-white/10">
                        <FaUserTie className="w-6 h-6 text-white" />
                        </div>
                        <dt className="mt-4 font-semibold text-white">Professional News</dt>
                        <dd className="mt-2 leading-7 text-gray-400">
                            Get up to date industry news and job openings in the technology industry.
                        </dd>
                    </div>
                </dl>
            </div>
        </div>
      
    </div>
    );
}
