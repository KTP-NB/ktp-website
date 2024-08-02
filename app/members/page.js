import React from 'react';
import { Container, Paper, Typography, Box } from '@mui/material';
import 'tailwindcss/tailwind.css';
import Image from 'next/image';

const members = [
    {
        name: "Shriya",
        position: "Co - President",
        image: "/images/Shriya.jpg",
    },
    {
        name: "Manan",
        position: "Co - President",
        image: "/images/Manan.jpg",
    },

    {
        name: "Srimathi",
        position: "VP of External Affairs",
        image: "/images/Srimathi.jpg",
    },
    {
        name: "Akash",
        position: "VP of Tech",
        image: "/images/Akash.jpg",
    },
    {
        name: "Ciera",
        position: "VP of Engagement",
        image: "/images/Ciera.jpg",
    },
    {
        name: "Priyangshu",
        position: "VP of Finance",
        image: "/images/Shriya.jpg",
    },
    {
        name: "Aishwarya",
        position: "VP of Finance",
        image: "/images/Manan.jpg",
    },

    {
        name: "Suhani",
        position: "VP of Membership",
        image: "/images/Srimathi.jpg",
    },
    {
        name: "Anika",
        position: "VP of Marketing",
        image: "/images/Akash.jpg",
    },
    {
        name: "Anushka",
        position: "VP of Development",
        image: "/images/Ciera.jpg",
    },
    {
        name: "Sameer",
        position: "VP of Internal",
        image: "/images/Ciera.jpg",
    },
    {
        name: "Ananya",
        position: "VP of Marketing",
        image: "/images/Ciera.jpg",
    },
    // Remove duplicate entries if needed
];

const MembersPage = () => {
    return (
        <Container className="w-full bg-gray-900" sx={{marginTop: 15}}>
            <Typography variant="h3" align="center" gutterBottom>
                Executive Board
            </Typography>
            <Box display="flex" flexDirection="row" flexWrap="wrap" justifyContent="center" alignItems="center" padding="5px" borderRadius="5px" position="relative" mt={5} py={5} px={3} backgroundColor="#1c398d">
                {members.map((member, index) => (
                    <Box key={index} m={3} width="200px"> {/* Adjust width here */}
                        <Paper elevation={3} style={{ padding: '10px', backgroundColor: 'white', color: 'black', textAlign: 'center' }}>
                                <Image
                                src={member.image}
                                alt={member.name}
                                width={400} // Adjusted width to 80% of the original size
                                height={400} // Adjusted height proportionally to maintain aspect ratio
                                style={{ borderRadius: '50%', marginBottom: '10px' }} // Maintain styles from <img> tag
                                />
                            <Typography variant="h6">{member.name}</Typography>
                            <Typography variant="subtitle1">{member.position}</Typography>
                        </Paper>
                    </Box>
                ))}
            </Box>
        </Container>
    );
};

export default MembersPage;
