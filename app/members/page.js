'use client';

import React from 'react';
import { Container, Paper, Typography, Box } from '@mui/material';
import {grey} from "@mui/material/colors";
import NextImage from 'next/image';
import {LinkedinIcon} from "lucide-react";

const executiveMembers = [
    {
        name: "Shriya Srinivasan",
        position: "National President",
        image: "/images/Shriya.jpg",
        year: "Senior",
        major: "Computer Science",
        linkedin: "https://www.linkedin.com/in/shriyasrinivasans/",
    },
    {
        name: "Srimathi Vadivel",
        position: "President",
        image: "/images/Srimathi.JPEG",
        year: "Senior",
        major: "Computer Science",
        linkedin: "https://www.linkedin.com/in/srimathivadivel/",
    },
    {
        name: "Yugal Shah",
        position: "Vice President",
        image: "/images/Yugal.png",
        year: "Junior",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/yugalnshah/",
    },
    {
        name: "Shiven Patel",
        position: "VP of Prof Development",
        image: "/images/Shiven.jpg",
        year: "Junior",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/shiven-patel123/",
    },
     {
        name: "Krish Kharbanda",
        position: "VP of Tech",
        image: "/images/Krish.png",
        year: "Junior",
        major: "Computer Science and Mathematics",
        linkedin: "https://www.linkedin.com/in/krishkharbanda/",
    },
    {
        name: "Abirami Jayakumar",
        position: "VP of Engagement",
        image: "/images/Abirami.jpg",
        year: "Junior",
        major: "Computer Science and Mathematics",
        linkedin: "https://www.linkedin.com/in/abiramijayakumar/",
    },
    {
        name: "Umair Siddiqui",
        position: "VP of Finance",
        image: "/images/Umair.jpg",
        year: "Junior",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/umairsiddiqui05/",
    },
    {
        name: "Saatvik Kabra",
        position: "VP of Membership",
        image: "/images/Saatvik.jpg",
        year: "Junior",
        major: "Computer Science",
        linkedin: "https://www.linkedin.com/in/saatvik-kabra",
    },
    {
        name: "Yash Singh",
        position: "VP of External Affairs",
        image: "/images/Yash.jpg",
        year: "Junior",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/yash-singh-b06a56295/",
    },
     {
        name: "Aditi Sreeganesh",
        position: "VP of Marketing",
        image: "/images/Aditi.jpg",
        year: "Junior",
        major: "Mathematics and Data Science",
        linkedin: "https://www.linkedin.com/in/aditi-sreeganesh",
    },
     {
        name: "Akhil Thuremella",
        position: "VP of Internal Ops",
        image: "/images/Akhil.jpg",
        year: "Senior",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/akhil-thuremella",
    },
   
];

const activeMembers = [
     {
        name: "Manan Shah",
        position: "Member",
        image: "/images/Manan.jpg",
        year: "Senior",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/manan-shah12/",
    },
    
    {
        name: "Akash Puzhakkal",
        position: "Member",
        image: "/images/Akash.jpg",
        year: "Senior",
        major: "Computer Science",
        linkedin: "https://www.linkedin.com/in/akash-puzhakkal/",
    },
    {
        name: "Ciera Simon",
        position: "Member",
        image: "/images/Ciera.jpg",
        year: "Senior",
        major: "Computer Science and Cognitive Science",
        linkedin: "https://www.linkedin.com/in/ciera-simon-65473b24b/",
    },
    {
        name: "Priyangshu Bhowmik",
        position: "Member",
        image: "/images/Priyangshu.jpg",
        year: "Senior",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/priyangshu-bhowmik-4a6270262/",
    },
    {
        name: "Aishwarya Velagapudi",
        position: "Member",
        image: "/images/Aishwarya.jpg",
        year: "Senior",
        major: "BAIT",
        linkedin: "https://www.linkedin.com/in/aishwarya-velagapudi/",
    },
    {
        name: "Suhani Mehra",
        position: "Member",
        image: "/images/Suhani.jpg",
        year: "Junior",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/suhani-mehra/",
    },
    {
        name: "Sameer Jiandani",
        position: "Member",
        image: "/images/Sameer.jpg",
        year: "Junior",
        major: "Computer Science and Cognitive Science",
        linkedin: "https://www.linkedin.com/in/sameerjiandani/",
    },
    {
        name: "Esha Pai",
        position: "Member",
        image: "/images/Esha.jpg",
        year: "Sophomore",
        major: "Computer Science and Biomathematics",
        linkedin: "https://www.linkedin.com/in/eshapai/",
    },
    {
        name: "Priya Rana",
        position: "Member",
        image: "/images/Priya.jpg",
        year: "Sophomore",
        major: "Computer Science and Mathematics",
        linkedin: "https://www.linkedin.com/in/prana24/",
    },
    {
        name: "Jayden Shah",
        position: "Member",
        image: "/images/Jayden.jpg",
        year: "Sophomore",
        major: "Computer Science and Economics",
        linkedin: "https://www.linkedin.com/in/jaydenshah/",
    },
    {
        name: "Raghul Srinivasan",
        position: "Member",
        image: "/images/Raghul.jpg",
        year: "Sophomore",
        major: "Data Science",
        linkedin: "https://www.linkedin.com/in/raghulkrishnasrinivasan/",
    },
    {
        name: "Gourika Dhiman",
        position: "Member",
        image: "/images/Gourika.jpg",
        year: "Sophomore",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/gourikadhiman/",
    },
    {
        name: "Radha Ghate",
        position: "Member",
        image: "/images/Radha.jpg",
        year: "Sophomore",
        major: "Computer Science and Mathematics",
        linkedin: "https://www.linkedin.com/in/radhaghate/",
    },
    {
        name: "Krisha Bhagat",
        position: "Member",
        image: "/images/Krisha.jpg",
        year: "Sophomore",
        major: "BAIT and Finance",
        linkedin: "https://www.linkedin.com/in/krisha-bhagat-07b61127a/",
    },
    {
        name: "Jignasu Shah",
        position: "Member",
        image: "/images/Jignasu.jpg",
        year: "Sophomore",
        major: "Computer Engineering",
        linkedin: "https://www.linkedin.com/in/jignasu-shah/",
    },
    {
        name: "Sujay Faldu",
        position: "Member",
        image: "/images/Sujay.jpg",
        year: "Sophomore",
        major: "Computer Science and Economics",
        linkedin: "https://www.linkedin.com/in/sujay-faldu/",
    },
    {
        name: "Heet Shah",
        position: "Member",
        image: "/images/Heet.jpg",
        year: "Sophomore",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/heetshah15/",
    },
    {
        name: "Krish Maske",
        position: "Member",
        image: "/images/KrishM.jpg",
        year: "Sophomore",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/krishmaske/",
    },
    {
        name: "Gravit Bali",
        position: "Member",
        image: "/images/Gravit.jpg",
        year: "Sophomore",
        major: "Computer Science and Cognitive Science",
        linkedin: "https://www.linkedin.com/in/gravitbali/",
    },
    {
        name: "Ethan Bingemann",
        position: "Member",
        image: "/images/Ethan.jpg",
        year: "Sophomore",
        major: "Computer Science",
        linkedin: "https://www.linkedin.com/in/ethan-bingemann/",
    },
    {
        name: "Abhiram Sajjala",
        position: "Member",
        image: "/images/Abhiram.jpg",
        year: "Sophomore",
        major: "Mechanical Engineering",
        linkedin: "https://www.linkedin.com/in/abhiramsajjala/",
    },
    {
        name: "Kesha Patel",
        position: "Member",
        image: "/images/Kesha.jpg",
        year: "Sophomore",
        major: "BAIT and Finance",
        linkedin: "https://www.linkedin.com/in/kesha-patel-12r/",
    },
    {
        name: "Kshiraj Gupta",
        position: "Member",
        image: "/images/Kshiraj.jpg",
        year: "Sophomore",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/kshiraj-gupta/",
    },
    {
        name: "Darsh Sundar",
        position: "Member",
        image: "/images/Darsh.jpg",
        year: "Sophomore",
        major: "Computer Science",
        linkedin: "https://www.linkedin.com/in/darshsundar/",
    },
    {
        name: "Anusha Iyer",
        position: "Member",
        image: "/images/Anusha.jpg",
        year: "Sophomore",
        major: "Computer Science and Math",
        linkedin: "https://www.linkedin.com/in/anusha--iyer",
    },
    {
        name: "Aaron Bansal",
        position: "Member",
        image: "/images/Aaron.jpg",
        year: "Sophomore",
        major: "Computer Science and Math",
        linkedin: "https://www.linkedin.com/in/aaron-bansal",
    },
    {
        name: "Anant Gupta",
        position: "Member",
        image: "/images/Anant.jpg",
        year: "Sophomore",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/anantgupta123/",
    },
    {
        name: "Atul Marichetty",
        position: "Member",
        image: "/images/Atul.jpg",
        year: "Sophomore",
        major: "Computer Science and Math",
        linkedin: "https://www.linkedin.com/in/atul-marichetty-0a6636320/",
    },
    {
        name: "Arnav Venkata",
        position: "Member",
        image: "/images/Arnav.jpg",
        year: "Sophomore",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/arnav-venkata/",
    },
    {
        name: "Krish Bansal",
        position: "Member",
        image: "/images/KrishB.jpg",
        year: "Sophomore",
        major: "Computer Engineering",
        linkedin: "https://www.linkedin.com/in/krish-bansal-44725b328/",
    },
    {
        name: "Gokulraj Kumarassamy",
        position: "Member",
        image: "/images/Gokulraj.jpg",
        year: "Sophomore",
        major: "Computer Science and Math",
        linkedin: "https://www.linkedin.com/in/gokulrajk1/",
    },
    {
        name: "Aditya Velagapudi",
        position: "Member",
        image: "/images/Aditya.jpg",
        year: "Sophomore",
        major: "Computer Science and Business Analytics",
        linkedin: "https://www.linkedin.com/in/adityavelagapudi/",
    },
    
    
];

const alumniMembers = [
    {
        name: "Anushka Kondur",
        position: "Investment Systems Engineer at Vanguard",
        image: "/images/Anushka.jpg",
        year: "Grad 2025",
        major: "Former VP of Prof Development",
        linkedin: "https://www.linkedin.com/in/anushka-kondur/",
    },
    {
        name: "Ananya Ahlawat",
        position: "Contract Obligation & Strategy Analyst at SHI",
        image: "/images/Ananya.jpg",
        year: "Grad 2025",
        major: "Former VP of Marketing",
        linkedin: "https://www.linkedin.com/in/ananya-ahlawat/",
    },
]

const MemberCard = ({ member, index, onLinkedInClick }) => (
    <Box
        key={index}
        m={3}
        width="200px"
        className="transition-transform transform hover:scale-105"
    >
        <Paper elevation={3} style={{ backgroundColor: 'white', color: 'black', textAlign: 'center', position: 'relative' }}>
            <Box
                style={{ width: '100%', height: '150px', overflow: 'hidden', position: 'relative' }}
                onClick={() => onLinkedInClick(member.linkedin)}
                className="cursor-pointer"
            >
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <NextImage
                        src={member.image}
                        alt={member.name}
                        fill
                        sizes="200px"
                        style={{
                            objectFit: 'cover',
                            borderTopLeftRadius: '3px',
                            borderTopRightRadius: '3px',
                        }}
                    />
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <LinkedinIcon style={{ fontSize: 40, color: 'white' }} />
                </div>
            </Box>
            <Box style={{ padding: '10px' }} className="w-full bg-gray-900" sx={{ color: grey[200] }}>
                <Typography variant="subtitle1" className="relative group font-medium">
                    {member.name}
                    <Box className="absolute left-0 w-full bg-white text-black text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-2">
                        {member.company && member.role ? (
                            `${member.company} - ${member.role}`
                        ) : (
                            `${member.year} - ${member.major}`
                        )}
                    </Box>
                </Typography>
                <Typography variant="subtitle1">{member.position}</Typography>
            </Box>
        </Paper>
    </Box>
);

const MembersPage = () => {
    const handleLinkedInClick = (linkedin) => {
        if (linkedin) {
            window.open(linkedin, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div className="relative isolate min-h-screen bg-gray-900 text-white">
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
                <Box display="flex" flexDirection="row" flexWrap="wrap" justifyContent="center" alignItems="center" padding="5px" position="relative" mt={5} py={5} px={3}>
                    {executiveMembers.map((member, index) => (
                        <MemberCard
                            key={index}
                            member={member}
                            index={index}
                            onLinkedInClick={handleLinkedInClick}
                        />
                    ))}
                </Box>

                <Typography variant="h3" align="center" gutterBottom>
                    Active Members
                </Typography>
                <Box display="flex" flexDirection="row" flexWrap="wrap" justifyContent="center" alignItems="center" padding="5px" position="relative" mt={5} py={5} px={3}>
                    {activeMembers.map((member, index) => (
                        <MemberCard
                            key={index}
                            member={member}
                            index={index}
                            onLinkedInClick={handleLinkedInClick}
                        />
                    ))}
                </Box>
                <Typography variant="h3" align="center" gutterBottom>
                    Alumni
                </Typography>
                <Box display="flex" flexDirection="row" flexWrap="wrap" justifyContent="center" alignItems="center" padding="5px" position="relative" mt={5} py={5} px={3}>
                    {alumniMembers.map((member, index) => (
                        <MemberCard
                            key={index}
                            member={member}
                            index={index}
                            onLinkedInClick={handleLinkedInClick}
                        />
                    ))}
                </Box>
            </Container>

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
