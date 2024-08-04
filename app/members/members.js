// components/MembersPage.js

'use client';

import React from 'react';
import { Container, Paper, Typography, Box } from '@mui/material';
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
        position: "Co - President",
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

        position: "VP of Tech",
        image: "/images/Akash.png",
        year: "Senior",
        major: "Computer Science",
        linkedin: "https://www.linkedin.com/in/akash",
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
        image: "/images/Shriya.jpg",
        year: "Senior",
        major: "Finance",
        linkedin: "https://www.linkedin.com/in/priyangshu",
    },
    {
        name: "Aishwarya",
        position: "VP of Finance",
        image: "/images/Manan.jpg",
        year: "Senior",
        major: "Accounting",
        linkedin: "https://www.linkedin.com/in/aishwarya",
    },
    {
        name: "Suhani",
        position: "VP of Membership",
        image: "/images/Srimathi.jpg",
        year: "Junior",
        major: "Psychology",
        linkedin: "https://www.linkedin.com/in/suhani",
    },
    {
        name: "Anika",
        position: "VP of Marketing",
        image: "/images/Akash.jpg",
        year: "Senior",
        major: "Marketing",
        linkedin: "https://www.linkedin.com/in/anika",
    },
    {
        name: "Anushka",
        position: "VP of Development",
        image: "/images/Ciera.jpg",
        year: "Junior",
        major: "Human Resources",
        linkedin: "https://www.linkedin.com/in/anushka",
    },
    {
        name: "Sameer",
        position: "VP of Internal",
        image: "/images/Ciera.jpg",
        year: "Senior",
        major: "Sociology",
        linkedin: "https://www.linkedin.com/in/sameer",
    },
    {
        name: "Ananya",
        position: "VP of Marketing",
        image: "/images/Ciera.jpg",
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
                    <Box key={index} m={3} width="200px"> {/* Adjust width here */}
                        <Paper elevation={3} style={{ padding: '10px', backgroundColor: 'white', color: 'black', textAlign: 'center' }}>
                            <img
                                src={member.image}
                                alt={member.name}
                                style={{ width: '80%', borderRadius: '50%', marginBottom: '10px', transition: 'transform 0.3s, filter 0.3s' }}
                                onClick={() => handleImageClick(member.linkedin)}
                                className="hover:filter-blue hover:scale-105 cursor-pointer"
                            />
                            <Typography variant="h6" className="relative group">
                                {member.name}
                                <Box className="absolute left-0 w-full bg-white text-black text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-2">
                                    {member.year} - {member.major}
                                </Box>
                            </Typography>
                            <Typography variant="subtitle1">{member.position}</Typography>
                        </Paper>
                    </Box>
                ))}
            </Box>

            <Typography variant="h3" align="center" gutterBottom>
                Active Members
            </Typography>
            <Box display="flex" flexDirection="row" flexWrap="wrap" justifyContent="center" alignItems="center" padding="5px" borderRadius="5px" position="relative" mt={5} py={5} px={3} backgroundColor="#1c398d">
                {activeMembers.map((member, index) => (
                    <Box key={index} m={3} width="200px"> {/* Adjust width here */}
                        <Paper elevation={3} style={{ padding: '10px', backgroundColor: 'white', color: 'black', textAlign: 'center' }}>
                            <img
                                src={member.image}
                                alt={member.name}
                                style={{ width: '80%', borderRadius: '50%', marginBottom: '10px', transition: 'transform 0.3s, filter 0.3s' }}
                                onClick={() => handleImageClick(member.linkedin)}
                                className="hover:filter-blue hover:scale-105 cursor-pointer"
                            />
                            <Typography variant="h6" className="relative group">
                                {member.name}
                                <Box className="absolute left-0 w-full bg-white text-black text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-2">
                                    {member.year} - {member.major}
                                </Box>
                            </Typography>
                            <Typography variant="subtitle1">{member.position}</Typography>
                        </Paper>
                    </Box>
                ))}
            </Box>
        </Container>
    );
};

export default MembersPage;
