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
import { styled } from '@mui/material/styles';
import { keyframes } from '@mui/system';

const ContainerStyled = styled('div')`
  padding: 0 300px; /* default padding */

  @media only screen and (max-width: 1440px) { /* MacBook screen size */
    padding: 0 20px; /* adjust padding to 20px on MacBook size */
  }

  @media only screen and (max-width: 1024px) { /* smaller screen size */
    padding: 0 10px; /* adjust padding to 10px on smaller screen size */
  }
`;

const slideIn = keyframes`
  0% {
    transform: translateY(100%);
  }
  1% {
    transform: translateY(99%);
  }
  2% {
    transform: translateY(98%);
  }
  3% {
    transform: translateY(97%);
  }
  4% {
    transform: translateY(96%);
  }
  5% {
    transform: translateY(95%);
  }
  6% {
    transform: translateY(94%);
  }
  7% {
    transform: translateY(93%);
  }
  8% {
    transform: translateY(92%);
  }
  9% {
    transform: translateY(91%);
  }
  10% {
    transform: translateY(90%);
  }
  11% {
    transform: translateY(89%);
  }
  12% {
    transform: translateY(88%);
  }
  13% {
    transform: translateY(87%);
  }
  14% {
    transform: translateY(86%);
  }
  15% {
    transform: translateY(85%);
  }
  16% {
    transform: translateY(84%);
  }
  17% {
    transform: translateY(83%);
  }
  18% {
    transform: translateY(82%);
  }
  19% {
    transform: translateY(81%);
  }
  20% {
    transform: translateY(80%);
  }
  21% {
    transform: translateY(79%);
  }
  22% {
    transform: translateY(78%);
  }
  23% {
    transform: translateY(77%);
  }
  24% {
    transform: translateY(76%);
  }
  25% {
    transform: translateY(75%);
  }
  26% {
    transform: translateY(74%);
  }
  27% {
    transform: translateY(73%);
  }
  28% {
    transform: translateY(72%);
  }
  29% {
    transform: translateY(71%);
  }
  30% {
    transform: translateY(70%);
  }
  31% {
    transform: translateY(69%);
  }
  32% {
    transform: translateY(68%);
  }
  33% {
    transform: translateY(67%);
  }
  34% {
    transform: translateY(66%);
  }
  35% {
    transform: translateY(65%);
  }
  36% {
    transform: translateY(64%);
  }
  37% {
    transform: translateY(63%);
  }
  38% {
    transform: translateY(62%);
  }
  39% {
    transform: translateY(61%);
  }
  40% {
    transform: translateY(60%);
  }
  41% {
    transform: translateY(59%);
  }
  42% {
    transform: translateY(58%);
  }
  43% {
    transform: translateY(57%);
  }
  44% {
    transform: translateY(56%);
  }
  45% {
    transform: translateY(55%);
  }
  46% {
    transform: translateY(54%);
  }
  47% {
    transform: translateY(53%);
  }
  48% {
    transform: translateY(52%);
  }
  49% {
    transform: translateY(51%);
  }
  50% {
    transform: translateY(50%);
  }
  51% {
    transform: translateY(49%);
  }
  52% {
    transform: translateY(48%);
  }
  53% {
    transform: translateY(47%);
  }
  54% {
    transform: translateY(46%);
  }
  55% {
    transform: translateY(45%);
  }
  56% {
    transform: translateY(44%);
  }
  57% {
    transform: translateY(43%);
  }
  58% {
    transform: translateY(42%);
  }
  59% {
    transform: translateY(41%);
  }
  60% {
    transform: translateY(40%);
  }
  61% {
    transform: translateY(39%);
  }
  62% {
    transform: translateY(38%);
  }
  63% {
    transform: translateY(37%);
  }
  64% {
    transform: translateY(36%);
  }
  65% {
    transform: translateY(35%);
  }
  66% {
    transform: translateY(34%);
  }
  67% {
    transform: translateY(33%);
  }
  68% {
    transform: translateY(32%);
  }
  69% {
    transform: translateY(31%);
  }
  70% {
    transform: translateY(30%);
  }
  71% {
    transform: translateY(29%);
  }
  72% {
    transform: translateY(28%);
  }
  73% {
    transform: translateY(27%);
  }
  74% {
    transform: translateY(26%);
  }
  75% {
    transform: translateY(25%);
  }
  76% {
    transform: translateY(24%);
  }
  77% {
    transform: translateY(23%);
  }
  78% {
    transform: translateY(22%);
  }
  79% {
    transform: translateY(21%);
  }
  80% {
    transform: translateY(20%);
  }
  81% {
    transform: translateY(19%);
  }
  82% {
    transform: translateY(18%);
  }
  83% {
    transform: translateY(17%);
  }
  84% {
    transform: translateY(16%);
  }
  85% {
    transform: translateY(15%);
  }
  86% {
    transform: translateY(14%);
  }
  87% {
    transform: translateY(13%);
  }
  88% {
    transform: translateY(12%);
  }
  89% {
    transform: translateY(11%);
  }
  90% {
    transform: translateY(10%);
  }
  91% {
    transform: translateY(9%);
  }
  92% {
    transform: translateY(8%);
  }
  93% {
    transform: translateY(7%);
  }
  94% {
    transform: translateY(6%);
  }
  95% {
    transform: translateY(5%);
  }
  96% {
    transform: translateY(4%);
  }
  97% {
    transform: translateY(3%);
  }
  98% {
    transform: translateY(2%);
  }
  99% {
    transform: translateY(1%);
  }
  100% {
    transform: translateY(0);
  }
`;

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

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  max-width: 100%; /* Ensure no element exceeds 100% of its container */
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
  overflow-x: hidden;
}

.container {
  width: 100%;
  max-width: 100%; /* Ensure container doesn't exceed 100% */
  overflow-x: hidden; /* Prevent horizontal overflow */
}

section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  width: 100%; /* Ensure section width is 100% */
  overflow-x: hidden; /* Prevent horizontal overflow */
}

.section-dei {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  width: 100%;
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
      <ContainerStyled className="py-10">

      <Box sx={{ marginTop: '140px', zIndex: 10 }}>
        <Typography variant="h2" gutterBottom className="text-white" sx={{ textAlign: 'left', marginLeft: -30 }}>
          a letter from our president to you: 
        </Typography>
      </Box>

      <Grid container spacing={4} alignItems="center">
        <Grid item xs={10} md={8}>
          <Box
            className="p-5 text-lg"
            sx={{
              marginTop: '0px',
              backgroundColor: 'white',
              color: 'black',
              padding: 12,
              boxShadow: 2,
              transition: 'transform 0.1s ease',
              transform: 'scale(0.9) translateZ(0)',
              '&:hover': {
                transform: 'scale(0.91)',
              },
              position: 'relative',
              overflow: 'hidden',
              animation: `${slideIn} 2.5s cubic-bezier(0.1, 0, 0.05, 1)`,
              animationFillMode: 'backwards',
            }}
          >
              <Box
                sx={{
                  position: 'absolute',
                  top: 10,
                  right: 0,
                  width: 100,
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent 70%, white 25%)',
                  transform: 'skewX(-10deg)',
                  zIndex: 1,
                }}
              />
              <Box
                sx={{
                  position: 'relative',
                  zIndex: 2,
                }}
              >                
                <Typography variant="body1" gutterBottom>
                  <strong>Dear Members and Visitors,</strong>
                </Typography>

                <Typography variant="body1" gutterBottom>
                  Welcome to the Alpha Beta Chapter of Kappa Theta Pi in New Brunswick! As the president of our newly founded chapter, I am thrilled to 
                  invite everyone to explore our fraternity&apos;s website and learn about the vibrant community we are building.
                </Typography>
                <Typography variant="body1" gutterBottom>
                  As an out-of-state student at Rutgers, I was quite surprised upon arrival to find no strong technology community. While there were
                  many large organizations for students within engineering, finance, and marketing, there wasn&apos;t a dedicated space for students in tech, 
                  despite its growing significance. After visiting the University of Michigan and meeting so many amazing individuals in Kappa Theta Pi, I 
                  felt inspired to collaborate with my classmates to create a similar community here, and here we are!
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Kappa Theta Pi aims to provide an enriching environment that enables students passionate about technology to thrive. Our fraternity was 
                  founded on five core principles: professional development, alumni connection, social relations, technological advancement, and academic 
                  excellence. We want to help our members pursue personal and professional growth in innumerable ways through collaborative projects, study 
                  sessions, career workshops, and much more.
                </Typography>
                <Typography variant="body1" gutterBottom>
                  The strength of our chapter lies in its diversity, with people from different backgrounds and perspectives. In our recruitment process, 
                  we are open to people of all majors, genders, ethnicities, sexual orientations, and backgrounds—anyone united by a passion for technology.
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Starting this chapter has already been a transformative experience for me. I feel privileged to have participated in and been a part of 
                  the growth of some of the most talented and focused minds as a member of KTP. I get to see firsthand how amazing things can be when 
                  passionate minds work together. More importantly, I have made friends and connections that continue to inspire and support me.
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Feel free to explore our website for more information regarding our recruitment process and details of our brotherhood. I am 
                  humbly privileged to serve as the first president of the Alpha Beta Chapter, and I look forward with great excitement to the future 
                  we are building together. If you have any questions or would like to know more, don&apos;t hesitate to contact our E-Board. 
                  Thank you for your interest in Kappa Theta Pi!
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <br />
                  Sincerely,
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Shriya Shrinivasan
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>President, Alpha Beta Chapter of Kappa Theta Pi</strong>
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {/* Background Box 1 */}
              <Box
                sx={{
                  position: 'absolute',
                  top: '20%',
                  left: '50%',
                  width: '100%',
                  height: '50%',
                  backgroundColor: '#1c398d', 
                  borderRadius: 2,
                  zIndex: 1,
                  boxShadow: 2,
                }}
              />
              {/* Background Box 2 */}
              <Box
                sx={{
                  position: 'absolute',
                  top: '-20%',
                  left: '30%',
                  width: '70%',
                  height: '50%',
                  backgroundColor: '#ffffff', 
                  borderRadius: 2,
                  zIndex: 2,
                  boxShadow: 2,
                }}
              />

              {/* Background Box 3 */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: '10%',
                  left: '35%',
                  width: '70%',
                  height: '50%',
                  backgroundColor: '#1c398d', 
                  borderRadius: 2,
                  zIndex: 2,
                  boxShadow: 2,
                }}
              />

              {/* Background Box 4 */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: '15%',
                  right: '-45%',
                  width: '60%',
                  height: '0%',
                  backgroundColor: '#ffffff', 
                  borderRadius: 2,
                  zIndex: 2,
                  boxShadow: 2,
                }}
              />

              {/* Background Box 4 small blue*/}
              <Box
                sx={{
                  position: 'absolute',
                  top: '-7%',
                  right: '35%',
                  width: '25%',
                  height: '15%',
                  backgroundColor: '#1c398d', 
                  borderRadius: 2,
                  zIndex: 2,
                  boxShadow: 2,
                }}
              />

              {/* Additional random boxes */}
              <Box
                sx={{
                  position: 'absolute',
                  top: '5%',
                  right: '-60%',
                  width: '30%',
                  height: '20%',
                  backgroundColor: '#ffffff', 
                  borderRadius: 2,
                  zIndex: 2,
                  boxShadow: 2,
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: '30%',
                  right: '30%',
                  width: '30%',
                  height: '25%',
                  backgroundColor: '#1c398d', 
                  borderRadius: 2,
                  zIndex: 2,
                  boxShadow: 2,
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: '25%',
                  left: '60%',
                  width: '50%',
                  height: '30%',
                  backgroundColor: '#ffffff', 
                  borderRadius: 2,
                  zIndex: 2,
                  boxShadow: 2,
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: '-5%',
                  left: '130%',
                  width: '20%',
                  height: '15%',
                  backgroundColor: '#1c398d', 
                  borderRadius: 2,
                  zIndex: 2,
                  boxShadow: 2,
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: '20%',
                  right: '-50%',
                  width: '35%',
                  height: '20%',
                  backgroundColor: '#ffffff', 
                  borderRadius: 2,
                  zIndex: 2,
                  boxShadow: 2,
                }}
              />

              {/* Image Box */}
              <Box
                component="img"
                src="/images/shriyapic.jpg"
                alt="President"
                sx={{
                  width: '90%',
                  borderRadius: 2,
                  marginLeft: '300px',  // Adding the same padding as the written letter
                  marginBottom: 20,
                  boxShadow: 2,
                  zIndex: 3, // Ensure image is above background boxes
                }}
              />
            </Box>
          </Grid>
        </Grid>
      </ContainerStyled>
    </section>

    <section>
    <ContainerStyled className="text-white py-10">    
    <Grid container spacing={3}>
      <Grid item xs={12} md={6} className="px-5">
        {/* Collage Container */}
        <Box
          sx={{
            position: 'relative',
            width: 600,
            height: 600,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Box
            component="img"
            src="/images/ktp4.gif"
            alt="KTP 4"
            sx={{
              position: 'absolute',
              top: 10,
              left: -60,
              width: 900,
              borderRadius: 2,
              boxShadow: 2,
            }}
          />
        </Box>
      </Grid>
      <Grid item xs={12} md={6} className="px-5">
        <Box className="text-lg">
          <Typography variant="body1" gutterBottom>
            <strong>KTP&apos;s History</strong>
          </Typography>
          <Typography variant="body1" gutterBottom>
            KTP was founded on January 10, 2012, in Ann Arbor, Michigan, and is the University of Michigan&apos;s 
            first professional technology fraternity. The goals of the fraternity are to create bonds between students of Informatics, 
            computer science, business, design, computer engineering, Information, and any others who are interested in technology, to 
            develop networks through facilitation of professional and social growth, and to expose members to career options in the 
            vast field of technology.
            <br />
            <br />

            We, the founders of the Alpha Beta colony in New Brunswick, started this effort to build a stronger community for students interested 
            in Technology. We saw a need for students to be in a community that would push their technology skills, industry knowledge, and connections 
            to new heights. Recognizing the rapidly evolving landscape of tech, we aimed to create an environment where members could collaborate, 
            innovate, and grow together. This community was envisioned not only as a space for learning but also as a network that could open doors to 
            internships, mentorships, and career opportunities, bridging the gap between academic learning and real-world application. By fostering a 
            culture of support, ambition, and continuous improvement, we have a long-term vision of being the cornerstone for tech enthusiasts for students, 
            empowering our members to achieve their fullest potential.
          </Typography>
        </Box>
      </Grid>
    </Grid>
  </ContainerStyled>
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
              <br />
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