'use client';

import React from 'react';
import { Container, Paper, Typography, Box } from '@mui/material';
import {grey} from "@mui/material/colors";
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
        image: "/images/Akash.jpeg",
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
        name: "Saatvik Kabra",
        position: "Member",
        image: "/images/Saatvik.jpg",
        year: "Sophomore",
        major: "Computer Science",
        linkedin: "https://www.linkedin.com/in/saatvik-kabra",
    },
    {
        name: "Krish Kharbanda",
        position: "Member",
        image: "/images/Krish.jpg",
        year: "Sophomore",
        major: "Computer Science",
        linkedin: "https://www.linkedin.com/in/krish-kharbanda",
    },
    {
        name: "Umair Siddiqui",
        position: "Member",
        image: "/images/Umair.jpg",
        year: "Sophomore",
        major: "Computer Science",
        linkedin: "https://www.linkedin.com/in/umair-siddiqui",
    },
    {
        name: "Shiven Patel",
        position: "Member",
        image: "/images/Shiven.jpg",
        year: "Sophomore",
        major: "Computer Science",
        linkedin: "https://www.linkedin.com/in/shiven-patel",
    },
    {
        name: "Yash Singh",
        position: "Member",
        image: "/images/Yash.jpg",
        year: "Sophomore",
        major: "Computer Science",
        linkedin: "https://www.linkedin.com/in/yash-singh",
    },
    {
        name: "Abirami Jayakumar",
        position: "Member",
        image: "/images/Abirami.jpg",
        year: "Sophomore",
        major: "Computer Science",
        linkedin: "https://www.linkedin.com/in/abirami-jayakumar",
    },
    {
        name: "Aditi Sreeganesh",
        position: "Member",
        image: "/images/Aditi.jpg",
        year: "Sophomore",
        major: "Computer Science",
        linkedin: "https://www.linkedin.com/in/aditi-sreeganesh",
    },
    {
        name: "Akhil Thuremella",
        position: "Member",
        image: "/images/Akhil.jpg",
        year: "Junior",
        major: "Computer Science",
        linkedin: "https://www.linkedin.com/in/akhil-thuremella",
    },
    {
        name: "Yugal Shah",
        position: "Member",
        image: "/images/Yugal.jpg",
        year: "Sophomore",
        major: "Computer Science",
        linkedin: "https://www.linkedin.com/in/yugal-shah",
    },
];

const MembersPage = () => {
    const handleImageClick = (linkedin) => {
        window.open(linkedin, '_blank');
    };

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

            <Container className="w-full" sx={{ marginTop: 15 }}>
                <Typography variant="h3" align="center" gutterBottom>
                    Executive Board
                </Typography>
                <Box display="flex" flexDirection="row" flexWrap="wrap" justifyContent="center" alignItems="center" padding="5px"  position="relative" mt={5} py={5} px={3}>
                    {executiveMembers.map((member, index) => (
                        <Box
                            key={index}
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
                    ))}
                </Box>

                <Typography variant="h3" align="center" gutterBottom>
                    Active Members
                </Typography>
                <Box display="flex" flexDirection="row" flexWrap="wrap" justifyContent="center" alignItems="center" padding="5px"  position="relative" mt={5} py={5} px={3} >
                    {activeMembers.map((member, index) => (
                        <Box
                            key={index}
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
                    ))}
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

export default MembersPage;