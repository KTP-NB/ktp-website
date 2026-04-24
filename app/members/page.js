'use client';

import React from 'react';
import { Container, Paper, Typography, Box } from '@mui/material';
import {grey} from "@mui/material/colors";
import NextImage from 'next/image';
import {LinkedinIcon} from "lucide-react";
import Tabs from '../components/Tabs';
import { useState } from 'react';
import FadeIn from '@/components/FadeIn';


const greekLetters = {
    Alpha: "Α",
    Beta: "Β",
    Gamma: "Γ",
    Delta: "Δ",
    Epsilon: "Ε",
    Zeta: "Ζ",
    Eta: "Η",
    Theta: "Θ",
    Iota: "Ι",
    Kappa: "Κ",
    Lambda: "Λ",
    Mu: "Μ",
    Nu: "Ν",
    Xi: "Ξ",
    Omicron: "Ο",
    Pi: "Π",
    Rho: "Ρ",
    Sigma: "Σ",
    Tau: "Τ",
    Upsilon: "Υ",
    Phi: "Φ",
    Chi: "Χ",
    Psi: "Ψ",
    Omega: "Ω",
    Founding: "★"
};

const allMembers = [
    {
        name: "Shriya Srinivasan",
        position: "National President",
        image: "/images/Shriya.jpg",
        year: "Senior",
        major: "Computer Science",
        linkedin: "https://www.linkedin.com/in/shriyasrinivasans/",
        class: "Founding",
        status: "Active",
        executive_board: true,
        committees: []
    },
    {
        name: "Srimathi Vadivel",
        position: "President",
        image: "/images/Srimathi.JPEG",
        year: "Senior",
        major: "Computer Science",
        linkedin: "https://www.linkedin.com/in/srimathivadivel/",
        class: "Founding",
        status: "Active",
        executive_board: true,
        committees: []
    },
    {
        name: "Yugal Shah",
        position: "Vice President",
        image: "/images/Yugal.png",
        year: "Junior",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/yugalnshah/",
        class: "Alpha",
        status: "Active",
        executive_board: true,
        committees: []
    },
    {
        name: "Shiven Patel",
        position: "VP of Prof Development",
        image: "/images/Shiven.jpg",
        year: "Junior",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/shiven-patel123/",
        class: "Alpha",
        status: "Active",
        executive_board: true,
        committees: [
            "Tech"
        ]
    },
    {
        name: "Krish Kharbanda",
        position: "VP of Tech",
        image: "/images/Krish.png",
        year: "Junior",
        major: "Computer Science and Mathematics",
        linkedin: "https://www.linkedin.com/in/krishkharbanda/",
        class: "Alpha",
        status: "Active",
        executive_board: true,
        committees: [
            "Tech"
        ]
    },
    {
        name: "Abirami Jayakumar",
        position: "VP of Engagement",
        image: "/images/Abirami.jpg",
        year: "Junior",
        major: "Computer Science and Mathematics",
        linkedin: "https://www.linkedin.com/in/abiramijayakumar/",
        class: "Alpha",
        status: "Active",
        executive_board: true,
        committees: [
            "Pledge"
        ]
    },
    {
        name: "Umair Siddiqui",
        position: "VP of Finance",
        image: "/images/Umair.jpg",
        year: "Junior",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/umairsiddiqui05/",
        class: "Alpha",
        status: "Active",
        executive_board: true,
        committees: [
            "Finance"
        ]
    },
    {
        name: "Saatvik Kabra",
        position: "VP of Membership",
        image: "/images/Saatvik.jpg",
        year: "Junior",
        major: "Computer Science",
        linkedin: "https://www.linkedin.com/in/saatvik-kabra",
        class: "Alpha",
        status: "Active",
        executive_board: true,
        committees: [
            "Pledge"
        ]
    },
    {
        name: "Yash Singh",
        position: "VP of External Affairs",
        image: "/images/Yash.jpg",
        year: "Junior",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/yash-singh-b06a56295/",
        class: "Alpha",
        status: "Active",
        executive_board: true,
        committees: [
            "Outreach"
        ]
    },
    {
        name: "Aditi Sreeganesh",
        position: "VP of Marketing",
        image: "/images/Aditi.jpg",
        year: "Junior",
        major: "Mathematics and Data Science",
        linkedin: "https://www.linkedin.com/in/aditi-sreeganesh",
        class: "Alpha",
        status: "Active",
        executive_board: true,
        committees: [
            "Marketing"
        ]
    },
    {
        name: "Akhil Thuremella",
        position: "VP of Internal Ops",
        image: "/images/Akhil.jpg",
        year: "Senior",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/akhil-thuremella",
        class: "Alpha",
        status: "Active",
        executive_board: true,
        committees: []
    },
    {
        name: "Suhani Mehra",
        position: "Member",
        image: "/images/Suhani.jpg",
        year: "Junior",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/suhani-mehra/",
        class: "Founding",
        status: "Active",
        executive_board: false,
        committees: []
    },
    {
        name: "Sameer Jiandani",
        position: "Member",
        image: "/images/Sameer.jpg",
        year: "Junior",
        major: "Computer Science and Cognitive Science",
        linkedin: "https://www.linkedin.com/in/sameerjiandani/",
        class: "Founding",
        status: "Active",
        executive_board: false,
        committees: []
    },
    {
        name: "Esha Pai",
        position: "Member",
        image: "/images/Esha.jpg",
        year: "Sophomore",
        major: "Computer Science and Biomathematics",
        linkedin: "https://www.linkedin.com/in/eshapai/",
        class: "Beta",
        status: "Active",
        executive_board: false,
        committees: [
            "Pledge"
        ]
    },
    {
        name: "Priya Rana",
        position: "Member",
        image: "/images/Priya.jpg",
        year: "Sophomore",
        major: "Computer Science and Mathematics",
        linkedin: "https://www.linkedin.com/in/prana24/",
        class: "Beta",
        status: "Active",
        executive_board: false,
        committees: [
            "Pledge"
        ]
    },
    {
        name: "Jayden Shah",
        position: "Member",
        image: "/images/Jayden.jpg",
        year: "Sophomore",
        major: "Computer Science and Economics",
        linkedin: "https://www.linkedin.com/in/jaydenshah/",
        class: "Beta",
        status: "Active",
        executive_board: false,
        committees: [
            "Outreach"
        ]
    },
    {
        name: "Raghul Srinivasan",
        position: "Member",
        image: "/images/Raghul.jpg",
        year: "Sophomore",
        major: "Data Science",
        linkedin: "https://www.linkedin.com/in/raghulkrishnasrinivasan/",
        class: "Beta",
        status: "Active",
        executive_board: false,
        committees: [
            "Finance"
        ]
    },
    {
        name: "Gourika Dhiman",
        position: "Member",
        image: "/images/Gourika.jpg",
        year: "Sophomore",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/gourikadhiman/",
        class: "Beta",
        status: "Active",
        executive_board: false,
        committees: [
            "Outreach"
        ]
    },
    {
        name: "Radha Ghate",
        position: "Member",
        image: "/images/Radha.jpg",
        year: "Sophomore",
        major: "Computer Science and Mathematics",
        linkedin: "https://www.linkedin.com/in/radhaghate/",
        class: "Beta",
        status: "Active",
        executive_board: false,
        committees: [
            "Outreach"
        ]
    },
    {
        name: "Krisha Bhagat",
        position: "Member",
        image: "/images/Krisha.jpg",
        year: "Sophomore",
        major: "BAIT and Finance",
        linkedin: "https://www.linkedin.com/in/krisha-bhagat-07b61127a/",
        class: "Beta",
        status: "Active",
        executive_board: false,
        committees: []
    },
    {
        name: "Jignasu Shah",
        position: "Member",
        image: "/images/Jignasu.jpg",
        year: "Sophomore",
        major: "Computer Engineering",
        linkedin: "https://www.linkedin.com/in/jignasu-shah/",
        class: "Beta",
        status: "Active",
        executive_board: false,
        committees: []
    },
    {
        name: "Sujay Faldu",
        position: "Member",
        image: "/images/Sujay.jpg",
        year: "Sophomore",
        major: "Computer Science and Economics",
        linkedin: "https://www.linkedin.com/in/sujay-faldu/",
        class: "Beta",
        status: "Active",
        executive_board: false,
        committees: [
            "Finance"
        ]
    },
    {
        name: "Heet Shah",
        position: "Member",
        image: "/images/Heet.jpg",
        year: "Sophomore",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/heetshah15/",
        class: "Beta",
        status: "Active",
        executive_board: false,
        committees: [
            "Finance"
        ]
    },
    {
        name: "Krish Maske",
        position: "Member",
        image: "/images/KrishM.jpg",
        year: "Sophomore",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/krishmaske/",
        class: "Beta",
        status: "Active",
        executive_board: false,
        committees: [
            "Tech"
        ]
    },
    {
        name: "Gravit Bali",
        position: "Member",
        image: "/images/Gravit.jpg",
        year: "Sophomore",
        major: "Computer Science and Cognitive Science",
        linkedin: "https://www.linkedin.com/in/gravitbali/",
        class: "Beta",
        status: "Active",
        executive_board: false,
        committees: [
            "Tech"
        ]
    },
    {
        name: "Ethan Bingemann",
        position: "Member",
        image: "/images/Ethan.jpg",
        year: "Sophomore",
        major: "Computer Science",
        linkedin: "https://www.linkedin.com/in/ethan-bingemann/",
        class: "Beta",
        status: "Active",
        executive_board: false,
        committees: []
    },
    {
        name: "Abhiram Sajjala",
        position: "Member",
        image: "/images/Abhiram.jpg",
        year: "Sophomore",
        major: "Mechanical Engineering",
        linkedin: "https://www.linkedin.com/in/abhiramsajjala/",
        class: "Beta",
        status: "Active",
        executive_board: false,
        committees: [
            "Pledge"
        ]
    },
    {
        name: "Kesha Patel",
        position: "Member",
        image: "/images/Kesha.jpg",
        year: "Sophomore",
        major: "BAIT and Finance",
        linkedin: "https://www.linkedin.com/in/kesha-patel-12r/",
        class: "Beta",
        status: "Active",
        executive_board: false,
        committees: [
            "Marketing"
        ]
    },
    {
        name: "Kshiraj Gupta",
        position: "Member",
        image: "/images/Kshiraj.jpg",
        year: "Sophomore",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/kshiraj-gupta/",
        class: "Beta",
        status: "Active",
        executive_board: false,
        committees: [
            "Tech"
        ]
    },
    {
        name: "Darsh Sundar",
        position: "Member",
        image: "/images/Darsh.jpg",
        year: "Sophomore",
        major: "Computer Science",
        linkedin: "https://www.linkedin.com/in/darshsundar/",
        class: "Beta",
        status: "Active",
        executive_board: false,
        committees: []
    },
    {
        name: "Anusha Iyer",
        position: "Member",
        image: "/images/Anusha.jpg",
        year: "Sophomore",
        major: "Computer Science and Math",
        linkedin: "https://www.linkedin.com/in/anusha--iyer",
        class: "Gamma",
        status: "Active",
        executive_board: false,
        committees: []
    },
    {
        name: "Aaron Bansal",
        position: "Member",
        image: "/images/Aaron.jpg",
        year: "Sophomore",
        major: "Computer Science and Math",
        linkedin: "https://www.linkedin.com/in/aaron-bansal",
        class: "Gamma",
        status: "Active",
        executive_board: false,
        committees: [
            "Tech"
        ]
    },
    {
        name: "Anant Gupta",
        position: "Member",
        image: "/images/Anant.jpg",
        year: "Sophomore",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/anantgupta123/",
        class: "Gamma",
        status: "Active",
        executive_board: false,
        committees: []
    },
    {
        name: "Atul Marichetty",
        position: "Member",
        image: "/images/Atul.jpg",
        year: "Sophomore",
        major: "Computer Science and Math",
        linkedin: "https://www.linkedin.com/in/atul-marichetty-0a6636320/",
        class: "Gamma",
        status: "Active",
        executive_board: false,
        committees: []
    },
    {
        name: "Arnav Venkata",
        position: "Member",
        image: "/images/Arnav.jpg",
        year: "Sophomore",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/arnav-venkata/",
        class: "Gamma",
        status: "Active",
        executive_board: false,
        committees: [
            "Finance"
        ]
    },
    {
        name: "Krish Bansal",
        position: "Member",
        image: "/images/KrishB.jpg",
        year: "Sophomore",
        major: "Computer Engineering",
        linkedin: "https://www.linkedin.com/in/krish-bansal-44725b328/",
        class: "Gamma",
        status: "Active",
        executive_board: false,
        committees: [
            "Marketing"
        ]
    },
    {
        name: "Gokulraj Kumarassamy",
        position: "Member",
        image: "/images/Gokulraj.jpg",
        year: "Sophomore",
        major: "Computer Science and Math",
        linkedin: "https://www.linkedin.com/in/gokulrajk1/",
        class: "Gamma",
        status: "Active",
        executive_board: false,
        committees: [
            "Pledge"
        ]
    },
    {
        name: "Aditya Velagapudi",
        position: "Member",
        image: "/images/Aditya.jpg",
        year: "Sophomore",
        major: "Computer Science and Business Analytics",
        linkedin: "https://www.linkedin.com/in/adityavelagapudi/",
        class: "Gamma",
        status: "Active",
        executive_board: false,
        committees: []
    },
    {
        name: "Anushka Kondur",
        position: "Founding Class ",
        image: "/images/Anushka.jpg",
        year: "Grad 2025",
        major: "Former VP of Prof Development",
        linkedin: "https://www.linkedin.com/in/anushka-kondur/",
        class: "Founding",
        status: "Alumni",
        executive_board: false,
        committees: []
    },
    {
        name: "Ananya Ahlawat",
        position: "Founding Class",
        image: "/images/Ananya.jpg",
        year: "Grad 2025",
        major: "Former VP of Marketing",
        linkedin: "https://www.linkedin.com/in/ananya-ahlawat/",
        class: "Founding",
        status: "Alumni",
        executive_board: false,
        committees: []
    },
    {
        name: "Priyangshu Bhowmik",
        position: "Founding Class",
        image: "/images/Priyangshu.jpg",
        year: "Grad 2025",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/priyangshu-bhowmik-4a6270262/",
        class: "Founding",
        status: "Alumni",
        executive_board: false,
        committees: []
    },
    {
        name: "Manan Shah",
        position: "Founding Class",
        image: "/images/Manan.jpg",
        year: "Grad 2025",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/manan-shah12/",
        class: "Founding",
        status: "Alumni",
        executive_board: false,
        committees: []
    },
    {
        name: "Akash Puzhakkal",
        position: "Founding Class",
        image: "/images/Akash.jpg",
        year: "Grad 2025",
        major: "Computer Science",
        linkedin: "https://www.linkedin.com/in/akash-puzhakkal/",
        class: "Founding",
        status: "Alumni",
        executive_board: false,
        committees: []
    },
    {
        name: "Ciera Simon",
        position: "Founding Class",
        image: "/images/Ciera.jpg",
        year: "Grad 2025",
        major: "Computer Science and Cognitive Science",
        linkedin: "https://www.linkedin.com/in/ciera-simon-65473b24b/",
        class: "Founding",
        status: "Alumni",
        executive_board: false,
        committees: []
    },
    {
        name: "Aishwarya Velagapudi",
        position: "Founding Class",
        image: "/images/Aishwarya.jpg",
        year: "Grad 2025",
        major: "BAIT",
        linkedin: "https://www.linkedin.com/in/aishwarya-velagapudi/",
        class: "Founding",
        status: "Alumni",
        executive_board: false,
        committees: []
    }
];




const MemberCard = ({ member, onLinkedInClick }) => (
  <Box
    m={2.5}
    width="220px"
    className="group transition-all duration-300 hover:-translate-y-2"
  >
    <Box
      sx={{
        bgcolor: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(12px)',
        color: 'white',
        textAlign: 'center',
        borderRadius: '14px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
      }}
      className="hover:shadow-2xl hover:border-white/20 transition-all duration-300"
    >
      {/* IMAGE */}
        <Box
        sx={{ height: 180, position: 'relative' }}
        onClick={() => onLinkedInClick(member.linkedin)}
        className="cursor-pointer"
        >
        <NextImage
            src={member.image}
            alt={member.name}
            fill
            sizes="220px"
            style={{ objectFit: 'cover' }}
            priority={false}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-full">
                <LinkedinIcon color="white" size={36} />
            </div>
            <div className="absolute bottom-2 right-2 z-20 w-4 h-4 flex items-center justify-center rounded-full group-hover:scale-110 transition-transform duration-300">
                <span className="text-xs font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,10)] drop-shadow-[0_0_8px_rgba(0,0,0,1)]">
                    {greekLetters[member.class] || 'Α'}
                </span>
            </div>
        </div>
        </Box>



      {/* TEXT */}
      <Box sx={{ p: 2 }}>
        <Typography fontWeight={600} fontSize={16}>
          {member.name}
        </Typography>

        <Box
          mt={0.8}
          display="inline-block"
          px={1.5}
          py={0.4}
          borderRadius="999px"
          sx={{
            bgcolor: 'rgba(59,130,246,0.15)',
            color: '#93c5fd',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {member.position}
        </Box>
      </Box>
    </Box>
  </Box>
);


export default function MembersPage() {
  const [activeTab, setActiveTab] = useState('Executive Board');

  const handleLinkedInClick = (url) => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen text-white py-24">
      <FadeIn>
      <Container>
        <h1 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] drop-shadow-2xl text-center text-white">
          Our Members
        </h1>

        <Typography align="center" sx={{ color: grey[400], mb: 3, mt: 1, fontSize: '1.1rem' }}>
          Meet the people building our community
        </Typography>

        <Tabs
          tabs={['Executive Board', 'Active Members', 'Committees', 'Alumni']}
          active={activeTab}
          setActive={setActiveTab}
        />

        <Box
          display="flex"
          flexWrap="wrap"
          justifyContent="center"
          mt={5}
          className="animate-fade-in"
        >
        {activeTab !== 'Committees' ? (
        allMembers
            .filter(m => {
                if (activeTab === 'Executive Board') return m.executive_board;
                if (activeTab === 'Active Members') return m.status === 'Active';
                if (activeTab === 'Alumni') return m.status === 'Alumni';
                return false;
            })
            .map((member, idx) => (
                <MemberCard
                    key={idx}
                    member={member}
                    onLinkedInClick={handleLinkedInClick}
                />
            ))
        ) : (
        ["Tech", "Finance", "Pledge", "Outreach", "Marketing"].map((committeeName) => {
            const committeeMembersList = allMembers.filter(m => m.committees.includes(committeeName));
            if (committeeMembersList.length === 0) return null;
            
            return (
                <Box key={committeeName} width="100%" mb={8}>
                    {/* COMMITTEE TITLE */}
                    <Typography
                        variant="h5"
                        align="center"
                        sx={{
                            fontWeight: 700,
                            mb: 3,
                            letterSpacing: '0.02em',
                        }}
                    >
                        {committeeName} Committee
                    </Typography>

                    {/* MEMBERS */}
                    <Box
                        display="flex"
                        flexWrap="wrap"
                        justifyContent="center"
                    >
                        {committeeMembersList.map((member, idx) => (
                            <MemberCard
                                key={idx}
                                member={member}
                                onLinkedInClick={handleLinkedInClick}
                            />
                        ))}
                    </Box>
                </Box>
            );
        })
        )}

        </Box>
      </Container>
      </FadeIn>
    </div>
  );
}