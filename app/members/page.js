'use client';

import React from 'react';
import { Container, Paper, Typography, Box } from '@mui/material';
import {grey} from "@mui/material/colors";
import NextImage from 'next/image';
import {LinkedinIcon} from "lucide-react";
import Tabs from '../components/Tabs';
import { useState } from 'react';
import FadeIn from '@/components/FadeIn';


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
        position: "Founding Class ",
        image: "/images/Anushka.jpg",
        year: "Grad 2025",
        major: "Former VP of Prof Development",
        linkedin: "https://www.linkedin.com/in/anushka-kondur/",
    },
    {
        name: "Ananya Ahlawat",
        position: "Founding Class",
        image: "/images/Ananya.jpg",
        year: "Grad 2025",
        major: "Former VP of Marketing",
        linkedin: "https://www.linkedin.com/in/ananya-ahlawat/",
    },
     {
        name: "Priyangshu Bhowmik",
        position: "Founding Class",
        image: "/images/Priyangshu.jpg",
        year: "Grad 2025",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/priyangshu-bhowmik-4a6270262/",
    },
    {
        name: "Manan Shah",
        position: "Founding Class",
        image: "/images/Manan.jpg",
        year: "Grad 2025",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/manan-shah12/",
    },
    
    {
        name: "Akash Puzhakkal",
        position: "Founding Class",
        image: "/images/Akash.jpg",
        year: "Grad 2025",
        major: "Computer Science",
        linkedin: "https://www.linkedin.com/in/akash-puzhakkal/",
    },
    {
        name: "Ciera Simon",
        position: "Founding Class",
        image: "/images/Ciera.jpg",
        year: "Grad 2025",
        major: "Computer Science and Cognitive Science",
        linkedin: "https://www.linkedin.com/in/ciera-simon-65473b24b/",
    },
    {
        name: "Aishwarya Velagapudi",
        position: "Founding Class",
        image: "/images/Aishwarya.jpg",
        year: "Grad 2025",
        major: "BAIT",
        linkedin: "https://www.linkedin.com/in/aishwarya-velagapudi/",
    }
]

const techCommittee = [
    {
        name: "Krish Kharbanda",
        position: "VP of Tech",
        image: "/images/Krish.png",
        year: "Junior",
        major: "Computer Science and Mathematics",
        linkedin: "https://www.linkedin.com/in/krishkharbanda/",
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
        name: "Krish Maske",
        position: "Member",
        image: "/images/KrishM.jpg",
        year: "Sophomore",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/krishmaske/",
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
        name: "Gravit Bali",
        position: "Member",
        image: "/images/Gravit.jpg",
        year: "Sophomore",
        major: "Computer Science and Cognitive Science",
        linkedin: "https://www.linkedin.com/in/gravitbali/",
    },
    {
        name: "Kshiraj Gupta",
        position: "Member",
        image: "/images/Kshiraj.jpg",
        year: "Sophomore",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/kshiraj-gupta/"
    }
];

const marketingCommittee  = [
    {
        name: "Aditi Sreeganesh",
        position: "VP of Marketing",
        image: "/images/Aditi.jpg",
        year: "Junior",
        major: "Mathematics and Data Science",
        linkedin: "https://www.linkedin.com/in/aditi-sreeganesh",
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
        name: "Krish Bansal",
        position: "Member",
        image: "/images/KrishB.jpg",
        year: "Sophomore",
        major: "Computer Engineering",
        linkedin: "https://www.linkedin.com/in/krish-bansal-44725b328/",
    },
];

const financeCommittee = [
     {
        name: "Umair Siddiqui",
        position: "VP of Finance",
        image: "/images/Umair.jpg",
        year: "Junior",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/umairsiddiqui05/",
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
        name: "Raghul Srinivasan",
        position: "Member",
        image: "/images/Raghul.jpg",
        year: "Sophomore",
        major: "Data Science",
        linkedin: "https://www.linkedin.com/in/raghulkrishnasrinivasan/",
    },
     {
        name: "Arnav Venkata",
        position: "Member",
        image: "/images/Arnav.jpg",
        year: "Sophomore",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/arnav-venkata/",
    },
];

const pledgeCommittee = [
    {
        name: "Saatvik Kabra",
        position: "VP of Membership",
        image: "/images/Saatvik.jpg",
        year: "Junior",
        major: "Computer Science",
        linkedin: "https://www.linkedin.com/in/saatvik-kabra"
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
        name: "Abhiram Sajjala",
        position: "Member",
        image: "/images/Abhiram.jpg",
        year: "Sophomore",
        major: "Mechanical Engineering",
        linkedin: "https://www.linkedin.com/in/abhiramsajjala/",
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
        name: "Gokulraj Kumarassamy",
        position: "Member",
        image: "/images/Gokulraj.jpg",
        year: "Sophomore",
        major: "Computer Science and Math",
        linkedin: "https://www.linkedin.com/in/gokulrajk1/",
    }
];

const outreachCommittee = [
     {
        name: "Yash Singh",
        position: "VP of External Affairs",
        image: "/images/Yash.jpg",
        year: "Junior",
        major: "Computer Science and Data Science",
        linkedin: "https://www.linkedin.com/in/yash-singh-b06a56295/",
        
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
    }
];

const committeeMembers = {
    Tech: techCommittee,
    Finance: financeCommittee,
    Pledge: pledgeCommittee,
    Outreach: outreachCommittee,
    Marketing: marketingCommittee
};




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

  const tabMap = {
    'Executive Board': executiveMembers,
    'Active Members': activeMembers,
    Committees: committeeMembers,
    Alumni: alumniMembers,
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
        tabMap[activeTab].map((member, idx) => (
            <MemberCard
            key={idx}
            member={member}
            onLinkedInClick={handleLinkedInClick}
            />
        ))
        ) : (
        Object.entries(committeeMembers).map(([committeeName, members]) => (
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
                {members.map((member, idx) => (
                <MemberCard
                    key={idx}
                    member={member}
                    onLinkedInClick={handleLinkedInClick}
                />
                ))}
            </Box>
            </Box>
        ))
        )}

        </Box>
      </Container>
      </FadeIn>
    </div>
  );
}