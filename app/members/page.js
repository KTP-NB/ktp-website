'use client';

import React from 'react';
import { Container, Paper, Typography, Box } from '@mui/material';
import { grey } from "@mui/material/colors";
import { motion } from 'framer-motion';
import 'tailwindcss/tailwind.css';

const executiveMembers = [
    {
        name: "Shriya",
        position: "Co - President",
        image: "/images/Shriya.jpg",
        year: "Senior",
        major: "Computer Science",
        linkedin: "https://www.linkedin.com/in/shriya",
    },
    {
        name: "Manan",
        position: "Vice President",
        image: "/images/Manan.jpg",
        year: "Senior",
        major: "Electrical Engineering",
        linkedin: "https://www.linkedin.com/in/manan",
    },
    {
        name: "Srimathi",
        position: "VP of External Affairs",
        image: "/images/Srimathi.jpg",
        year: "Junior",
        major: "Business Administration",
        linkedin: "https://www.linkedin.com/in/srimathi",
    },
    {
        name: "Akash",
        position: "VP of Tech",
        image: "/images/Akash.jpg",
        year: "Senior",
        major: "Computer Science",
        linkedin: "https://www.linkedin.com/in/akash-puzhakkal/",
    },
    {
        name: "Ciera",
        position: "VP of Engagement",
        image: "/images/Ciera.jpg",
        year: "Junior",
        major: "Marketing",
        linkedin: "https://www.linkedin.com/in/ciera",
    },
    {
        name: "Priyangshu",
        position: "VP of Finance",
        image: "/images/Priyangshu.jpg",
        year: "Senior",
        major: "Finance",
        linkedin: "https://www.linkedin.com/in/priyangshu",
    },
    {
        name: "Aishwarya",
        position: "VP of Finance",
        image: "/images/Aishwarya.jpg",
        year: "Senior",
        major: "Accounting",
        linkedin: "https://www.linkedin.com/in/aishwarya",
    },
    {
        name: "Suhani",
        position: "VP of Membership",
        image: "/images/Suhani.jpg",
        year: "Junior",
        major: "Psychology",
        linkedin: "https://www.linkedin.com/in/suhani",
    },
    {
        name: "Anika",
        position: "VP of Marketing",
        image: "/images/Anika.jpg",
        year: "Senior",
        major: "Marketing",
        linkedin: "https://www.linkedin.com/in/anika",
    },
    {
        name: "Anushka",
        position: "VP of Development",
        image: "/images/Anushka.jpg",
        year: "Junior",
        major: "Human Resources",
        linkedin: "https://www.linkedin.com/in/anushka",
    },
    {
        name: "Sameer",
        position: "VP of Internal",
        image: "/images/Sameer.jpg",
        year: "Senior",
        major: "Sociology",
        linkedin: "https://www.linkedin.com/in/sameer",
    },
    {
        name: "Ananya",
        position: "VP of Marketing",
        image: "/images/Ananya.jpg",
        year: "Junior",
        major: "Communications",
        linkedin: "https://www.linkedin.com/in/ananya",
    },
];

const activeMembers = [
    {
        name: "John Doe",
        position: "Member",
        image: "/images/JohnDoe.jpg",
        year: "Sophomore",
        major: "Computer Science",
        linkedin: "https://www.linkedin.com/in/johndoe",
    },
    {
        name: "Jane Smith",
        position: "Member",
        image: "/images/JaneSmith.jpg",
        year: "Junior",
        major: "Biology",
        linkedin: "https://www.linkedin.com/in/janesmith",
    },
    // Add more active members as needed
];

const MembersPage = () => {
    const handleImageClick = (linkedin) => {
        window.open(linkedin, '_blank');
    };

    // Animation variants for cards to fade in and move upwards
    const cardVariants = {
        hidden: { opacity: 0, y: 0 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
    };

    return (
        <div className="relative isolate min-h-screen bg-gray-900 text-white">
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
                    className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#3b82f6] to-[#1e40af] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
                />
            </div>

            {/* Bottom-Right Gradient Background */}
            <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 -z-10 transform-gpu overflow-hidden blur-3xl"
            >
                <div
                    style={{
                        clipPath:
                            'polygon(0% 0%, 27.5% 0%, 45.2% 65.5%, 47.5% 41.7%, 52.4% 31.9%, 60.2% 37.6%, 72.5% 67.5%, 80.7% 98%, 85.5% 99.9%, 97.5% 73.1%, 100% 38.4%, 74.1% 55.9%, 76.1% 2.3%, 27.6% 23.2%, 17.9% 0%, 0.1% 35.1%)',
                    }}
                    className="relative right-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#3b82f6] to-[#1e40af] opacity-30 sm:right-[calc(50%-30rem)] sm:w-[72.1875rem]"
                />
            </div>

            <Container className="w-full" sx={{ marginTop: 15 }}>
                <Typography variant="h3" align="center" gutterBottom>
                    Executive Board
                </Typography>
                <Box display="flex" flexDirection="row" flexWrap="wrap" justifyContent="center" alignItems="center" padding="5px" position="relative" mt={5} py={5} px={3}>
                    {executiveMembers.map((member, index) => (
                        <motion.div
                            key={index}
                            initial="hidden"
                            animate="visible"
                            variants={cardVariants}
                        >
                            <Box
                                m={3}
                                width="200px"
                                className="transition-transform transform hover:scale-105"
                            >
                                <Paper elevation={3} style={{ backgroundColor: 'white', color: 'black', textAlign: 'center', position: 'relative' }}>
                                    <Box style={{ width: '100%', height: '150px', overflow: 'hidden' }}>
                                        <img
                                            src={member.image}
                                            alt={member.name}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                cursor: 'pointer',
                                                borderTopLeftRadius: '3px',
                                                borderTopRightRadius: '3px',
                                            }}
                                            onClick={() => handleImageClick(member.linkedin)}
                                        />
                                    </Box>
                                    <Box style={{ padding: '10px' }} className="w-full bg-gray-900" sx={{ color: grey[200] }}>
                                        <Typography variant="h6" className="relative group">
                                            {member.name}
                                            <Box className="absolute left-0 w-full bg-white text-black text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-2">
                                                {member.year} - {member.major}
                                            </Box>
                                        </Typography>
                                        <Typography variant="subtitle1">{member.position}</Typography>
                                    </Box>
                                </Paper>
                            </Box>
                        </motion.div>
                    ))}
                </Box>

                <Typography variant="h3" align="center" gutterBottom>
                    Active Members
                </Typography>
                <Box display="flex" flexDirection="row" flexWrap="wrap" justifyContent="center" alignItems="center" padding="5px" position="relative" mt={5} py={5} px={3}>
                    {activeMembers.map((member, index) => (
                        <motion.div
                            key={index}
                            initial="hidden"
                            animate="visible"
                            variants={cardVariants}
                        >
                            <Box
                                m={3}
                                width="200px"
                                className="transition-transform transform hover:scale-105"
                            >
                                <Paper elevation={3} style={{ backgroundColor: 'white', color: 'black', textAlign: 'center', position: 'relative' }}>
                                    <Box style={{ width: '100%', height: '150px', overflow: 'hidden' }}>
                                        <img
                                            src={member.image}
                                            alt={member.name}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                cursor: 'pointer',
                                                borderTopLeftRadius: '10px',
                                                borderTopRightRadius: '10px',
                                            }}
                                            onClick={() => handleImageClick(member.linkedin)}
                                        />
                                    </Box>
                                    <Box style={{ padding: '10px' }} className="w-full bg-gray-900" sx={{ color: grey[200] }}>
                                        <Typography variant="h6" className="relative group">
                                            {member.name}
                                            <Box className="absolute left-0 w-full bg-white text-black text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-2">
                                                {member.year} - {member.major}
                                            </Box>
                                        </Typography>
                                        <Typography variant="subtitle1">{member.position}</Typography>
                                    </Box>
                                </Paper>
                            </Box>
                        </motion.div>
                    ))}
                </Box>
            </Container>
        </div>
    );
};

export default MembersPage;
