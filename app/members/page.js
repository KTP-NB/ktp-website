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

    return (
        <Container className="w-full bg-gray-900" sx={{ marginTop: 15 }}>
            <Typography variant="h3" align="center" gutterBottom>
                Executive Board
            </Typography>
            <Box display="flex" flexDirection="row" flexWrap="wrap" justifyContent="center" alignItems="center" padding="5px" borderRadius="5px" position="relative" mt={5} py={5} px={3} backgroundColor="#1c398d">
                {executiveMembers.map((member, index) => (
                    <Box
                        key={index}
                        m={3}
                        width="200px"
                        className="transition-transform transform hover:scale-105" // Add transition and scale effect
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
                            <Box style={{ padding: '10px' }} className="w-full bg-gray-900" sx={{color: grey[200]}}>
                                <Typography variant="h6" className="relative group" >
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
            <Box display="flex" flexDirection="row" flexWrap="wrap" justifyContent="center" alignItems="center" padding="5px" borderRadius="5px" position="relative" mt={5} py={5} px={3} backgroundColor="#1c398d">
                {activeMembers.map((member, index) => (
                    <Box
                        key={index}
                        m={3}
                        width="200px"
                        className="transition-transform transform hover:scale-105" // Add transition and scale effect
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
                            <Box style={{ padding: '10px' }} className="w-full bg-gray-900" sx={{color: grey[200]}}>
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
    );
};

export default MembersPage;
