"use client";
import React from 'react';
import { Mail, Instagram, Linkedin, Send } from 'lucide-react';
import { Container, Typography, Box } from '@mui/material';
import { motion } from 'framer-motion';

const ContactPage = () => {
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: {
            opacity: 1,
            x: 0,
            transition: { duration: 0.5 }
        }
    };

    return (
        <div className="relative isolate min-h-screen bg-[#0B1425]">
            {/* Top Gradient Background */}
            <div
                aria-hidden="true"
                className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
            >
                <div
                    style={{
                        clipPath:
                            'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
                    }}
                    className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#1c315f] to-[#112347] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
                />
            </div>

            {/* Contact Section */}
            <Container className="w-full" sx={{ marginTop: 15 }}>
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                >
                    <Typography variant="h3" align="center" gutterBottom className="text-white">
                        Let&apos;s Connect!
                    </Typography>

                    <Box className="text-center mt-6 mb-12">
                        <Typography variant="h6" className="text-gray-400 font-light">
                            Have questions about joining KTP or want to learn more?
                        </Typography>
                        <Typography variant="h6" className="text-gray-400 font-light mt-2">
                            Reach out to us through any of these platforms!
                        </Typography>
                        <Send className="h-6 w-6 text-blue-400 mx-auto mt-4 animate-bounce" />
                    </Box>

                    <div className="flex flex-col gap-8 items-center mt-12">
                        <motion.div variants={itemVariants} className="w-full max-w-md">
                            <a
                                href="mailto:ktpnewbrunswick@gmail.com"
                                className="flex items-center gap-4 text-white hover:text-blue-400 transition-all transform hover:scale-105 text-xl bg-white/5 p-4 rounded-lg hover:bg-white/10"
                            >
                                <Mail className="h-8 w-8" />
                                ktpnewbrunswick@gmail.com
                            </a>
                        </motion.div>

                        <motion.div variants={itemVariants} className="w-full max-w-md">
                            <a
                                href="https://www.instagram.com/ktpnewbrunswick/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-4 text-white hover:text-blue-400 transition-all transform hover:scale-105 text-xl bg-white/5 p-4 rounded-lg hover:bg-white/10"
                            >
                                <Instagram className="h-8 w-8" />
                                @ktpnewbrunswick
                            </a>
                        </motion.div>

                        <motion.div variants={itemVariants} className="w-full max-w-md">
                            <a
                                href="https://www.linkedin.com/company/kappa-theta-pi-new-brunswick/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-4 text-white hover:text-blue-400 transition-all transform hover:scale-105 text-xl bg-white/5 p-4 rounded-lg hover:bg-white/10"
                            >
                                <Linkedin className="h-8 w-8" />
                                Kappa Theta Pi - New Brunswick
                            </a>
                        </motion.div>
                    </div>

                    <Box className="text-center mt-16">
                        <Typography variant="body1" className="text-gray-400 italic">
                            &quot;Join us in shaping the future of technology and business!&quot;
                        </Typography>
                    </Box>
                </motion.div>
            </Container>

            {/* Bottom Gradient Background */}
            <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 -z-10 transform-gpu overflow-hidden blur-3xl"
            >
                <div
                    style={{
                        clipPath:
                            'polygon(0% 0%, 27.5% 0%, 45.2% 65.5%, 47.5% 41.7%, 52.4% 31.9%, 60.2% 37.6%, 72.5% 67.5%, 80.7% 98%, 85.5% 99.9%, 97.5% 73.1%, 100% 38.4%, 74.1% 55.9%, 76.1% 2.3%, 27.6% 23.2%, 17.9% 0%, 0.1% 35.1%)',
                    }}
                    className="relative right-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#1c315f] to-[#112347] opacity-30 sm:right-[calc(50%-30rem)] sm:w-[72.1875rem]"
                />
            </div>
        </div>
    );
};

export default ContactPage;