"use client";

import React from 'react';
import { Container, Grid, Typography, Paper, Box } from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import GroupIcon from '@mui/icons-material/Group';
import EmojiPeopleIcon from '@mui/icons-material/EmojiPeople';
import BuildIcon from '@mui/icons-material/Build';
import SchoolIcon from '@mui/icons-material/School';
import Diversity3Icon from '@mui/icons-material/Diversity3';

const pillars = [
    {
        title: "Professional Development",
        description: "KTP provides professional development and support for tech careers, including interview training, resume building, mentorship, and private company recruiting.",
        icon: <WorkIcon fontSize="large" sx={{ color: '#1e88e5' }} />, // Blue
    },
    {
        title: "Alumni Connections",
        description: "Our alumni network connects you to members at top tech companies, including Microsoft, Amazon, Facebook, Apple, Google, consulting firms, financial technology firms, and startups.",
        icon: <GroupIcon fontSize="large" sx={{ color: '#43a047' }} />, // Green
    },
    {
        title: "Social Growth",
        description: "KTP fosters friendships through social events, including tailgates, bowling, apple picking, and KTP formal.",
        icon: <EmojiPeopleIcon fontSize="large" sx={{ color: '#fbc02d' }} />, // Yellow
    },
    {
        title: "Technical Advancement",
        description: "Expand your technical skillset through workshops, projects, and more, preparing you for the industry through new member education and beyond.",
        icon: <BuildIcon fontSize="large" sx={{ color: '#e53935' }} />, // Red
    },
    {
        title: "Academic Support",
        description: "KTP helps foster academic growth by providing a network of the brightest tech minds at Northwestern for support in and out of the classroom.",
        icon: <SchoolIcon fontSize="large" sx={{ color: '#8e24aa' }} />, // Purple
    },
    {
        title: "Diversity, Equity, and Inclusion",
        description: "KTP is an inclusive workplace that recruits the best in tech, encouraging members to bring their authentic selves.",
        icon: <Diversity3Icon fontSize="large" sx={{ color: '#fb8c00' }} />, // Orange
    },
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

                {/* 'From Our President' Section */}
                <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 'bold', marginTop: 5 }}>
                    From Our President
                </Typography>

                {/* Content Section */}
                <Grid container spacing={4} alignItems="center" sx={{ marginTop: 5 }}>
                    <Grid item xs={12} md={6}>
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <img
                                src="/images/shriyapic.jpg"
                                alt="President"
                                style={{
                                    width: '300px',
                                    height: '300px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    boxShadow: '0 6px 12px rgba(0, 0, 0, 0.2)',
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
                    {pillars.map((pillar, index) => (
                        <Grid item xs={12} sm={6} md={4} key={index}>
                            <Paper
                                elevation={3}
                                sx={{
                                    padding: 3,
                                    backgroundColor: 'white',
                                    textAlign: 'center',
                                    height: '250px', // Adjusted height for smaller cards
                                    transition: 'transform 0.3s ease', // Hover effect smooth transition
                                    '&:hover': {
                                        transform: 'scale(1.05)', // Slightly enlarges the card on hover
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

                {/* History Section */}
                <Box sx={{ marginTop: 10 }}>
                    <Grid container spacing={4} alignItems="center">
                        {/* History Text */}
                        <Grid item xs={12} md={6}>
                            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                                KTP's History
                            </Typography>
                            <Typography variant="body1" gutterBottom sx={{ color: 'white', fontSize: '1.25rem' }}>
                                KTP was founded on January 10, 2012, in Ann Arbor, Michigan, and is the University of Michigan's
                                first professional technology fraternity. The goals of the fraternity are to create bonds between students of Informatics,
                                computer science, business, design, computer engineering, Information, and any others who are interested in technology, to
                                develop networks through facilitation of professional and social growth, and to expose members to career options in the
                                vast field of technology.
                            </Typography>
                        </Grid>

                        {/* History Image */}
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                <img
                                    src="/images/Eboard.jpeg"
                                    alt="Eboard"
                                    style={{
                                        width: '100%',
                                        height: 'auto',
                                        borderRadius: '8px',
                                        objectFit: 'cover',
                                        boxShadow: '0 6px 12px rgba(0, 0, 0, 0.2)',
                                    }}
                                />
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
            </Container>

            {/* Bottom Gradient (Optional if needed for design consistency) */}
            <div
                aria-hidden="true"
                className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
            >
                <div
                    style={{
                        clipPath:
                            'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
                    }}
                    className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#3b82f6] to-[#1e40af] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
                />
            </div>
        </div>
    );
};

export default AboutUs;
