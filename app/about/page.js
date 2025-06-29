'use client';

import React from 'react';
import { Container, Grid, Typography, Paper, Box } from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import GroupIcon from '@mui/icons-material/Group';
import EmojiPeopleIcon from '@mui/icons-material/EmojiPeople';
import BuildIcon from '@mui/icons-material/Build';
import SchoolIcon from '@mui/icons-material/School';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import Image from 'next/image';

const pillars = [
    {
        title: "Professional Development",
        description: "KTP provides professional development and support for tech careers, including interview training, resume building, mentorship, and private company recruiting.",
        icon: <WorkIcon fontSize="large" sx={{ color: '#1e88e5' }} />,
    },
    {
        title: "Alumni Connections",
        description: "While we are new, we have brothers who have interned / worked at various companies such as Amazon, Vanguard, Fidelity, Nokia, and more, and we plan on building our Alumni Network as time goes by.",
        icon: <GroupIcon fontSize="large" sx={{ color: '#43a047' }} />,
    },
    {
        title: "Social Growth",
        description: "KTP fosters friendships through social events, including tailgates, bowling, apple picking, and KTP formal.",
        icon: <EmojiPeopleIcon fontSize="large" sx={{ color: '#fbc02d' }} />,
    },
    {
        title: "Technical Advancement",
        description: "Expand your technical skillset through workshops, projects, and more, preparing you for the industry through new member education and beyond.",
        icon: <BuildIcon fontSize="large" sx={{ color: '#e53935' }} />,
    },
    {
        title: "Academic Support",
        description: "KTP helps foster academic growth by providing a network of the brightest tech minds for support in and out of the classroom.",
        icon: <SchoolIcon fontSize="large" sx={{ color: '#8e24aa' }} />,
    }
];

const AboutUs = () => {
    return (
        <div className="relative isolate min-h-screen bg-gray-900 text-white">
            {/* Gradient Background */}
            <div
                aria-hidden="true"
                className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
            >
                <div
                    style={{
                        clipPath:
                            'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
                    }}
                    className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#3b82f6] to-[#1e40af] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
                />
            </div>

            <Container sx={{ marginTop: 15 }}>
                {/* Title Section */}
                <Typography variant="h3" align="center" gutterBottom>
                    Who Are We
                </Typography>

                {/* From Our President Section */}
                <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 'bold', marginTop: 5 }}>
                    From Our President
                </Typography>

                {/* Content Section */}
                <Grid container spacing={4} alignItems="center" sx={{ marginTop: 5 }}>
                    <Grid item xs={12} md={6}>
                        <Box sx={{ display: 'flex', justifyContent: 'center', position: 'relative', width: 700, height: 700, margin: 'auto' }}>
                            <Image
                                src="/images/srimathipic.jpg"
                                alt="President"
                                fill
                                style={{
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                }}
                            />
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h5" gutterBottom sx={{ color: 'white', fontSize: '1.5rem', fontWeight: 'bold' }}>
                            Welcome to Kappa Theta Pi
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'white', mb: 3, fontSize: '1.25rem' }}>
                            As President, I am honored to lead a community of passionate individuals dedicated to pushing the boundaries of technology and innovation. Our chapter is committed to providing a supportive environment where members can collaborate, learn, and grow together, both personally and professionally.
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'white', mb: 3, fontSize: '1.25rem' }}>
                            We offer numerous opportunities for our members to develop their technical skills, network with industry professionals, and build lifelong friendships. Whether through technical workshops, social events, or mentorship programs, Kappa Theta Pi is here to help you succeed in the fast-paced world of technology.
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'white', fontSize: '1.25rem' }}>
                            We invite you to explore our fraternity and see how you can benefit from being part of this dynamic and forward-thinking community.
                        </Typography>
                    </Grid>
                </Grid>

                {/* Our Pillars Section */}
                <Typography variant="h4" align="center" gutterBottom mt={10} sx={{ fontWeight: 'bold' }}>
                    Our Pillars
                </Typography>

                <Grid container spacing={3} mt={3}>
                    {pillars.slice(0, 3).map((pillar, index) => (
                        <Grid item xs={12} sm={6} md={4} key={index}>
                            <Paper
                                elevation={3}
                                sx={{
                                    padding: 3,
                                    backgroundColor: 'white',
                                    textAlign: 'center',
                                    height: '250px',
                                    transition: 'transform 0.3s ease',
                                    '&:hover': {
                                        transform: 'scale(1.05)',
                                    },
                                }}
                            >
                                <Box display="flex" justifyContent="center" mb={1}>
                                    {pillar.icon}
                                </Box>
                                <Typography variant="h6" color="black" sx={{ fontWeight: 'bold' }}>
                                    {pillar.title}
                                </Typography>
                                <Typography variant="body2" color="black" mt={2}>
                                    {pillar.description}
                                </Typography>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>

                <Grid container spacing={3} mt={1} justifyContent="center">
                    {pillars.slice(3, 5).map((pillar, index) => (
                        <Grid item xs={12} sm={6} md={4} key={index}>
                            <Paper
                                elevation={3}
                                sx={{
                                    padding: 3,
                                    backgroundColor: 'white',
                                    textAlign: 'center',
                                    height: '250px',
                                    transition: 'transform 0.3s ease',
                                    '&:hover': {
                                        transform: 'scale(1.05)',
                                    },
                                }}
                            >
                                <Box display="flex" justifyContent="center" mb={1}>
                                    {pillar.icon}
                                </Box>
                                <Typography variant="h6" color="black" sx={{ fontWeight: 'bold' }}>
                                    {pillar.title}
                                </Typography>
                                <Typography variant="body2" color="black" mt={2}>
                                    {pillar.description}
                                </Typography>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>

                {/* KTP&apos;s History Section */}
                <Box sx={{ marginTop: 10 }}>
                    <Grid container spacing={4} alignItems="center">
                        {/* History Text */}
                        <Grid item xs={12} md={6}>
                            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                                KTP&apos;s History
                            </Typography>
                            <Typography variant="body1" gutterBottom sx={{ color: 'white', fontSize: '1.25rem', mb: 2 }}>
                                KTP was founded on January 10, 2012, in Ann Arbor, Michigan, as the University of Michigan&apos;s first professional technology fraternity.
                            </Typography>
                            <Typography variant="body1" gutterBottom sx={{ color: 'white', fontSize: '1.25rem', mb: 2 }}>
                                The fraternity aims to create bonds between students from various fields such as Informatics, computer science, business, design, and computer engineering.
                            </Typography>
                            <Typography variant="body1" gutterBottom sx={{ color: 'white', fontSize: '1.25rem', mb: 2 }}>
                                Our goal is to develop networks through professional and social growth while exposing members to career opportunities in the tech industry.
                            </Typography>
                            <Typography variant="body1" gutterBottom sx={{ color: 'white', fontSize: '1.25rem', mb: 2 }}>
                                We, the founders of the Alpha Beta chapter in New Brunswick, started this effort to build a stronger community for students interested in technology.
                            </Typography>
                        </Grid>

                        {/* History Image */}
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', justifyContent: 'center', position: 'relative', width: '100%', height: 400 }}>
                                <Image
                                    src="/images/Eboard.jpeg"
                                    alt="Executive Board"
                                    fill
                                    style={{
                                        borderRadius: '8px',
                                        objectFit: 'cover',
                                    }}
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                />
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
            </Container>

            {/* Bottom Gradient */}
            <div
                aria-hidden="true"
                className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
            >
                <div
                    style={{
                        clipPath:
                            'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
                    }}
                    className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#3b82f6] to-[#1e40af] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
                />
            </div>
        </div>
    );
};

export default AboutUs;