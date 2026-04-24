'use client';

import React from 'react';
import { Container, Grid, Typography, Paper, Box, Card, CardContent } from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import GroupIcon from '@mui/icons-material/Group';
import EmojiPeopleIcon from '@mui/icons-material/EmojiPeople';
import BuildIcon from '@mui/icons-material/Build';
import SchoolIcon from '@mui/icons-material/School';
import Image from 'next/image';
import FadeIn from '@/components/FadeIn';

const pillars = [
  {
    title: 'Professional Development',
    description:
        'Kappa Theta Pi provides professional development and support for tech careers, including interview training, resume building, mentorship, and private company recruiting.',
    icon: <WorkIcon fontSize="large" sx={{ color: '#1e88e5' }} />,
  },
  {
    title: 'Alumni Connections',
    description:
        'While we are new, we have brothers who have interned / worked at various companies such as Amazon, Vanguard, Fidelity, Nokia, and more, and we plan on building our Alumni Network as time goes by.',
    icon: <GroupIcon fontSize="large" sx={{ color: '#43a047' }} />,
  },
  {
    title: 'Social Growth',
    description:
        'Kappa Theta Pi fosters friendships through social events, including tailgates, bowling, apple picking, and KTP formal.',
    icon: <EmojiPeopleIcon fontSize="large" sx={{ color: '#fbc02d' }} />,
  },
  {
    title: 'Technical Advancement',
    description:
        'Kappa Theta Pi provides members numerous opportunities to enhance their current technical skills, as well as learn new ones. Whether it be participation in one of our various project teams or attending a technical workshop, we make it easy for our members to expand their expertise.',
    icon: <BuildIcon fontSize="large" sx={{ color: '#e53935' }} />,
  },
  {
    title: 'Academic Support',
    description:
        'Kappa Theta Pi helps foster academic growth by providing a network of the brightest tech minds for support in and out of the classroom.',
    icon: <SchoolIcon fontSize="large" sx={{ color: '#8e24aa' }} />,
  },
];

const AboutUs = () => {
  return (
  <div className="relative isolate min-h-screen text-white pb-16">
        {/* Top Gradient */}
        <div
            aria-hidden="true"
            className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        >
          <div
              style={{
                clipPath:
                    'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
              }}
              className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#4a6ca7] to-[#25417a] opacity-35 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          />
        </div>

        <FadeIn>
          <Container sx={{ marginTop: 15 }}>
          <h1 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] drop-shadow-2xl mb-8 text-center text-white">
              About Us
          </h1>

          <Grid container spacing={4} alignItems="center" sx={{ mt: 3 }}>
            {/* Left: Image */}
            <Grid item xs={12} md={6}>
              <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    position: 'relative',
                    width: 500,
                    height: 500,
                    margin: 'auto',
                    maxWidth: '90vw',
                    maxHeight: 500,
                  }}
              >
                <Image
                    src="/images/srimathipic.jpg"
                    alt="President"
                    fill
                    style={{ borderRadius: '50%', objectFit: 'cover' }}
                    sizes="(max-width: 900px) 90vw, 500px"
                    priority
                />
              </Box>
            </Grid>

            {/* Right: Scrollable card with elegant scrollbar */}
            <Grid item xs={12} md={6}>
              <Card
                  elevation={0}
                  sx={{
                    maxHeight: 490,
                    overflow: 'auto',
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: 3,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',

                    /* Firefox */
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(255,255,255,0.2) transparent',

                    /* WebKit */
                    '&::-webkit-scrollbar': { width: 8 },
                    '&::-webkit-scrollbar-track': { background: 'transparent' },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: 8,
                      backgroundClip: 'padding-box',
                      border: '2px solid transparent',
                    },
                    '&:hover::-webkit-scrollbar-thumb': {
                      backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    },
                  }}
              >
                <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                  <Typography
                      variant="h4"
                      gutterBottom
                      sx={{ color: '#bfdbfe', fontSize: '1.75rem', fontWeight: 'bold' }}
                  >
                    President's Welcome
                  </Typography>

                  <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.85)', mb: 3, fontSize: '1.05rem', lineHeight: 1.7 }}>
                    Welcome to the Alpha Beta chapter of Kappa Theta Pi in New Brunswick! As we enter our second
                    year, we&apos;re excited to continue building something special, not just growing our numbers, but
                    strengthening the network, social connections, mentorship opportunities, and lifelong
                    friendships that define our fraternity.
                  </Typography>

                  <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.85)', mb: 3, fontSize: '1.05rem', lineHeight: 1.7 }}>
                    As one of the founding members of this chapter, it&apos;s been an incredible journey watching our
                    vision come to life. We established a solid foundation in our inaugural year, and now we&apos;re
                    ready to reach new heights.
                  </Typography>

                  <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.85)', mb: 3, fontSize: '1.05rem', lineHeight: 1.7 }}>
                    The opportunities within Kappa Theta Pi are truly limitless. This past year has exceeded every
                    expectation I had when we first started this chapter. It pushed me beyond my comfort zone,
                    connected me with an incredible network of tech-minded individuals, expanded my technical
                    skills, and introduced me to friends I know I&apos;ll have for life. What continues to amaze me is
                    the caliber of companies where our brothers are making their mark. From innovative startups to
                    Fortune 500 tech giants, our members are contributing to some of the most exciting
                    organizations in the industry.
                  </Typography>

                  <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.85)', mb: 0, fontSize: '1.05rem', lineHeight: 1.7 }}>
                    I&apos;ve had the privilege of watching some of Alpha Beta&apos;s most talented and driven members
                    flourish, and I&apos;m thrilled to see what we&apos;ll accomplish together in 2025-2026. The trajectory
                    of our chapter&apos;s growth, both in the achievements of our individual members and our collective
                    impact, has been remarkable to witness from the very beginning.
                    <br /><br />
                    I hope this website gives you a taste of what makes our chapter exceptional. Come experience it
                    for yourself at Rush Week and our open events, where you can meet our brothers, see our
                    brotherhood in action, and explore the possibility of joining. :)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Our Pillars */}
          <Typography variant="h4" align="center" gutterBottom mt={10} sx={{ color: '#bfdbfe', fontSize: '1.75rem', fontWeight: 'bold' }}>
            Our Pillars
          </Typography>

          <Grid container spacing={3} mt={3}>
            {pillars.slice(0, 3).map((pillar, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Paper
                      elevation={0}
                      sx={{
                        padding: 3,
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        textAlign: 'center',
                        height: '250px',
                        borderRadius: 3,
                        transition: 'transform 0.3s ease',
                        '&:hover': { transform: 'scale(1.05)', backgroundColor: 'rgba(255, 255, 255, 0.08)' },
                      }}
                  >
                    <Box display="flex" justifyContent="center" mb={1}>
                      {pillar.icon}
                    </Box>
                    <Typography variant="h5" sx={{ color: '#ffffffff', fontWeight: 'bold', fontSize: '1.5rem' }}>
                      {pillar.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }} mt={2}>
                      {pillar.description}
                    </Typography>
                  </Paper>
                </Grid>
            ))}
          </Grid>

          <Grid container spacing={3} mt={1} justifyContent="center">
            {pillars.slice(3, 5).map((pillar, index) => (
                <Grid item xs={12} sm={6} md={6} key={index}>
                  <Paper
                      elevation={0}
                      sx={{
                        padding: 3,
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        textAlign: 'center',
                        height: '250px',
                        borderRadius: 3,
                        transition: 'transform 0.3s ease',
                        '&:hover': { transform: 'scale(1.05)', backgroundColor: 'rgba(255, 255, 255, 0.08)' },
                      }}
                  >
                    <Box display="flex" justifyContent="center" mb={1}>
                      {pillar.icon}
                    </Box>
                    <Typography variant="h5" sx={{ color: '#ffffffff', fontWeight: 'bold', fontSize: '1.5rem' }}>
                      {pillar.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }} mt={2}>
                      {pillar.description}
                    </Typography>
                  </Paper>
                </Grid>
            ))}
          </Grid>

          {/* KTP History */}
          <Box sx={{ marginTop: 10 }}>
            <Grid container spacing={4} alignItems="center">
              <Grid item xs={12} md={6}>
                <Typography variant="h4" gutterBottom sx={{ color: '#bfdbfe', fontSize: '1.75rem', fontWeight: 'bold' }}>
                  KTP&apos;s History
                </Typography>
                <Typography variant="body1" gutterBottom sx={{ color: '#dbe8ff', fontSize: '1.25rem', mb: 2 }}>
                  KTP was founded on January 10, 2012, in Ann Arbor, Michigan, as the University of Michigan&apos;s first professional technology fraternity.
                </Typography>
                <Typography variant="body1" gutterBottom sx={{ color: '#dbe8ff', fontSize: '1.25rem', mb: 2 }}>
                  The fraternity aims to create bonds between students from various fields such as Informatics, computer science, business, design, and computer engineering.
                </Typography>
                <Typography variant="body1" gutterBottom sx={{ color: '#dbe8ff', fontSize: '1.25rem', mb: 2 }}>
                  Our goal is to develop networks through professional and social growth while exposing members to career opportunities in the tech industry.
                </Typography>
                <Typography variant="body1" gutterBottom sx={{ color: '#dbe8ff', fontSize: '1.25rem', mb: 2 }}>
                  We, the founders of the Alpha Beta chapter in New Brunswick, started this effort to build a stronger community for students interested in technology.
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', justifyContent: 'center', position: 'relative', width: '100%', height: 400 }}>
                  <Image
                      src="/images/Eboard.jpeg"
                      alt="Executive Board"
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      style={{ borderRadius: '8px', objectFit: 'cover' }}
                  />
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Container>
      </FadeIn>
    </div>
  );
};

export default AboutUs;