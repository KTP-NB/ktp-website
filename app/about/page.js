"use client";

import React, { useEffect } from 'react';
import { Container, Typography, Box, Card, CardContent, CardMedia, Grid } from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import GroupIcon from '@mui/icons-material/Group';
import EmojiPeopleIcon from '@mui/icons-material/EmojiPeople';
import BuildIcon from '@mui/icons-material/Build';
import SchoolIcon from '@mui/icons-material/School';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import 'tailwindcss/tailwind.css';

const styles = `
:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
  }
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
  overflow-x: hidden; /* Prevent horizontal overflow */
}

section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  overflow-y: auto;
  width: 100%;
  box-sizing: border-box; /* Ensure padding does not add to width */
}

.section-dei {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 40px 0 20px 0; /* Removed right padding */
  width: 100%;
  box-sizing: border-box; /* Ensure padding does not add to width */
}


.card-icon {
  width: 50px;
  height: 50px;
  position: absolute;
  top: 5px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #0b1941;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-icon svg {
  color: white;
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}

`;

const AboutUs = () => {
  // Inject the styles into the head of the document
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  const pillars = [
    {
      title: "Professional Development",
      description: "KTP provides professional development and support for tech careers, including interview training, resume building, mentorship, and private company recruiting.",
      image: "/static/images/cards/professional-development.jpg",
      alt: "Professional Development",
      icon: <WorkIcon />
    },
    {
      title: "Alumni Connections",
      description: "Our alumni network connects you to members at top tech companies, including Microsoft, Amazon, Facebook, Apple, Google, consulting firms, financial technology firms, and startups.",
      image: "/static/images/cards/alumni-connections.jpg",
      alt: "Alumni Connections",
      icon: <GroupIcon />
    },
    {
      title: "Social Growth",
      description: "KTP fosters friendships through social events, including tailgates, bowling, apple picking, and KTP formal.",
      image: "/static/images/cards/social-growth.jpg",
      alt: "Social Growth",
      icon: <EmojiPeopleIcon />
    },
    {
      title: "Technical Advancement",
      description: "Expand your technical skillset through workshops, projects, and more, preparing you for the industry through new member education and beyond.",
      image: "/static/images/cards/technical-advancement.jpg",
      alt: "Technical Advancement",
      icon: <BuildIcon />
    },
    {
      title: "Academic Support",
      description: "KTP helps foster academic growth by providing a network of the brightest tech minds at Northwestern for support in and out of the classroom.",
      image: "/static/images/cards/academic-support.jpg",
      alt: "Academic Support",
      icon: <SchoolIcon />
    },
    {
      title: "Diversity, Equity, and Inclusion",
      description: "KTP is an inclusive workplace that recruits the best in tech, encouraging members to bring their authentic selves.",
      image: "/static/images/cards/dei.jpg",
      alt: "Diversity, Equity, and Inclusion",
      icon: <Diversity3Icon />
    }
  ];

  return (
    <div className="container">
      <section>
        <Container className="text-white py-10">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h3" gutterBottom className="text-white">
                About Us
              </Typography>
              <Box className="p-5 text-lg">
                <Typography variant="body1" gutterBottom>
                  <strong>Who are we?</strong>
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Welcome to Kappa Theta Pi! We are a co-ed professional technology fraternity 
                  focused on fostering growth in professional, academic, and social aspects for students 
                  passionate about technology.
                  <br />
                  Here at the New Brunswick Chapter, we hope to bring a community of like-minded individuals 
                  who are dedicated to pushing the boundaries of technology and innovation. We strive to 
                  create an environment where members can collaborate, learn, and grow together, both 
                  personally and professionally.
                  <br />
                  Our chapter offers numerous opportunities for members to develop their skills and network with industry professionals. 
                  From technical workshops and hackathons to social events and mentorship programs, we aim to provide a well-rounded 
                  experience that prepares our members for success in the tech industry.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              {/* Collage Container */}
              <Box
                sx={{
                  position: 'relative',
                  width: 300,
                  height: 300,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginLeft: 'auto',
                }}
              >
                <Box
                  component="img"
                  src="/app/about/ktp1.gif"
                  alt="KTP 1"
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 20,
                    width: 150,
                    borderRadius: 2,
                    boxShadow: 2,
                  }}
                />
                <Box
                  component="img"
                  src="/app/about/ktp2.gif"
                  alt="KTP 2"
                  sx={{
                    position: 'absolute',
                    top: 40,
                    left: 80,
                    width: 150,
                    borderRadius: 2,
                    boxShadow: 2,
                  }}
                />
                <Box
                  component="img"
                  src="/app/about/ktp3.gif"
                  alt="KTP 3"
                  sx={{
                    position: 'absolute',
                    top: 80,
                    left: 140,
                    width: 150,
                    borderRadius: 2,
                    boxShadow: 2,
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </section>

      <section>
        <Container className="text-white py-10">
          <Box className="p-5 text-lg">
            <Typography variant="body1" gutterBottom>
              <strong>KTP&apos;s History</strong>
            </Typography>
            <Typography variant="body1" gutterBottom>
              KTP was founded on January 10, 2012, in Ann Arbor, Michigan, and is the University of Michigan&apos;s 
              first professional technology fraternity. The goals of the fraternity are to create bonds between students of Informatics, 
              computer science, business, design, computer engineering, Information, and any others who are interested in technology, to 
              develop networks through facilitation of professional and social growth, and to expose members to career options in the 
              vast field of technology.
            </Typography>
          </Box>
        </Container>
      </section>

      <section className="section-dei">
        <Container className="text-white py-10">
          <Box className="p-5 text-lg">
            <Typography variant="body1" gutterBottom>
              <strong>DEI Commitment</strong>
            </Typography>
            <Typography variant="body1" gutterBottom>
              At Kappa Theta Pi, we prioritize diversity, equity, and inclusion, ensuring a welcoming environment for all members. We believe 
              in the power of technology to bring positive change and strive to provide resources and opportunities to help our members succeed.
            </Typography>
            <Grid container spacing={4}>
              {pillars.map((pillar, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                    <Box className="card-icon">
                      {pillar.icon}
                    </Box>
                    <Card sx={{ maxWidth: 345, mt: 4, borderRadius: 2 }}>
                      <CardMedia
                        sx={{ height: 140, borderTopLeftRadius: 8, borderTopRightRadius: 8 }}
                        image={pillar.image}
                        title={pillar.title}
                        alt={pillar.alt}
                      />
                      <CardContent>
                        <Typography gutterBottom variant="h5" component="div">
                          {pillar.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {pillar.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Container>
      </section>
    </div>
  );
};

export default AboutUs;
