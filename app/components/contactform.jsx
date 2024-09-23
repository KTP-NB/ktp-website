"use client";

import React, { useState } from 'react';
import { FaEnvelope, FaUser, FaEdit } from "react-icons/fa";
import emailjs from 'emailjs-com';

export function ContactForm() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    });

    const [responseMessage, setResponseMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(null);  // To track if the message was successfully sent or not

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Send email via EmailJS
        emailjs.send(
            process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
            process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
            formData,
            process.env.NEXT_PUBLIC_EMAILJS_USER_ID
        )
            .then((result) => {
                setIsSuccess(true); // Success state
                setResponseMessage('Message sent successfully!');
                setFormData({
                    name: '',
                    email: '',
                    subject: '',
                    message: '',
                });
            }, (error) => {
                setIsSuccess(false); // Failure state
                setResponseMessage('Failed to send message. Please try again later.');
                console.error(error.text);
                console.error("EmailJS Error:", error);
            });
    };

    return (
        <div className="relative isolate overflow-hidden  py-8 sm:py-24 lg:py-16">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row gap-12 justify-center">
                    {/* Left column: Contact Us title and description */}
                    <div className="lg:w-1/2 max-w-xl">
                        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Contact Us.</h2>
                        <p className="mt-4 text-lg leading-8 text-gray-300">
                            Have questions or suggestions? Let us know and we will be back with you right away.
                        </p>
                    </div>

                    {/* Right column: Form */}
                    <div className="lg:w-1/2">
                        <form onSubmit={handleSubmit} className="grid gap-x-4 gap-y-6 sm:grid-cols-2">
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
                                        value={formData.name}
                                        onChange={handleChange}
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
                                        value={formData.email}
                                        onChange={handleChange}
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
                                        value={formData.subject}
                                        onChange={handleChange}
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
                                        value={formData.message}
                                        onChange={handleChange}
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
                        </form>
                        {responseMessage && (
                            <p
                                className={`mt-4 text-lg ${
                                    isSuccess ? 'text-green-500' : 'text-red-500'
                                }`}
                            >
                                {responseMessage}
                            </p>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}