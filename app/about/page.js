'use client';

import React from 'react';
import { Container, Grid, Typography, Paper, Box, Card, CardContent } from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import GroupIcon from '@mui/icons-material/Group';
import EmojiPeopleIcon from '@mui/icons-material/EmojiPeople';
import BuildIcon from '@mui/icons-material/Build';
import SchoolIcon from '@mui/icons-material/School';
import Image from 'next/image';

/** ---------- Static Our Network (simple responsive grid) ---------- */
const logos = [
  { src: '/images/amazon.png', alt: 'Amazon' },
  { src: '/images/verizon.png', alt: 'Verizon' },
  { src: '/images/vanguard.png', alt: 'Vanguard' },
  { src: '/images/jnj.png', alt: 'JNJ' },
  { src: '/images/panasonic.png', alt: 'Panasonic' },
  { src: '/images/fidelity.png', alt: 'Fidelty' },
  { src: '/images/nokia.png', alt: 'Nokia' },
  { src: '/images/ADP.png', alt: 'ADP' },
  { src: '/images/s&p.png', alt: 'S&P' },
  { src: '/images/pfizer.png', alt: 'Pfizer' },
  { src: '/images/firstcitizens.png', alt: 'FirstCitizens' },
  { src: '/images/church.png', alt: 'Chruch' },
  { src: '/images/cvs.png', alt: 'CVS' },
  { src: '/images/dow.png', alt: 'DOW' },
  { src: '/images/regeneron.png', alt: 'Regeneron' },
  { src: '/images/shi.png', alt: 'shi' },
  { src: '/images/parsons.png', alt: 'Parsons' },
  { src: '/images/allstate.png', alt: 'Allstate' },
];

function NetworkSection() {
  return (
    <Box sx={{ py: 6 }}>
      <Container>
        <Typography
          variant="h4"
          align="center"
          sx={{ fontWeight: 'bold', mb: 4, color: 'white' }}
        >
          Our Network
        </Typography>

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: { xs: 3, sm: 4, md: 5 },
          }}
        >
          {logos.map((l, i) => (
            <Box
              key={i}
              sx={{
                position: 'relative',
                height: 70,
                flex: '0 0 auto',
                width: 'auto',
                minWidth: 140,
                maxWidth: 220,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Image
                src={l.src}
                alt={l.alt}
                fill
                sizes="(max-width:600px) 40vw, (max-width:900px) 25vw, 160px" // ✅ added sizes
                style={{ objectFit: 'contain' }}
              />
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

const pillars = [
  {
    title: 'Professional Development',
    description:
      'KTP provides professional development and support for tech careers, including interview training, resume building, mentorship, and private company recruiting.',
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
      'KTP fosters friendships through social events, including tailgates, bowling, apple picking, and KTP formal.',
    icon: <EmojiPeopleIcon fontSize="large" sx={{ color: '#fbc02d' }} />,
  },
  {
    title: 'Technical Advancement',
    description:
      'Expand your technical skillset through workshops, projects, and more, preparing you for the industry through new member education and beyond.',
    icon: <BuildIcon fontSize="large" sx={{ color: '#e53935' }} />,
  },
  {
    title: 'Academic Support',
    description:
      'KTP helps foster academic growth by providing a network of the brightest tech minds for support in and out of the classroom.',
    icon: <SchoolIcon fontSize="large" sx={{ color: '#8e24aa' }} />,
  },
];

const AboutUs = () => {
  return (
    <div className="relative isolate min-h-screen bg-gray-900 text-white">
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
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#3b82f6] to-[#1e40af] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
        />
      </div>

      <Container sx={{ marginTop: 15 }}>
        {/* Title */}
        <Typography variant="h3" align="center" gutterBottom>
          Who Are We
        </Typography>

        {/* From Our President (section header outside the card) */}
        <Typography
          id="from-our-president"
          variant="h4"
          align="center"
          gutterBottom
          sx={{ fontWeight: 'bold', mt: 8, letterSpacing: 0.3 }}
        >
          From Our President
        </Typography>

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
              elevation={4}
              sx={{
                maxHeight: 360,
                overflow: 'auto',
                bgcolor: 'rgba(255,255,255,0.06)',
                borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.25)',

                /* Firefox */
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255,255,255,0.35) transparent',

                /* WebKit */
                '&::-webkit-scrollbar': { width: 8 },
                '&::-webkit-scrollbar-track': { background: 'transparent' },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'rgba(255,255,255,0.35)',
                  borderRadius: 8,
                  backgroundClip: 'padding-box',
                  border: '2px solid transparent',
                },
                '&:hover::-webkit-scrollbar-thumb': {
                  backgroundColor: 'rgba(255,255,255,0.5)',
                },
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                <Typography
                  variant="h5"
                  gutterBottom
                  sx={{ color: 'white', fontSize: '1.35rem', fontWeight: 'bold' }}
                >
                  Welcome to Kappa Theta Pi
                </Typography>

                <Typography variant="body1" sx={{ color: 'white', mb: 3, fontSize: '1.05rem', lineHeight: 1.7 }}>
                  Welcome to the Alpha Beta chapter of Kappa Theta Pi in New Brunswick! As we enter our second
                  year, we&apos;re excited to continue building something special, not just growing our numbers, but
                  strengthening the network, social connections, mentorship opportunities, and lifelong
                  friendships that define our fraternity.
                </Typography>

                <Typography variant="body1" sx={{ color: 'white', mb: 3, fontSize: '1.05rem', lineHeight: 1.7 }}>
                  As one of the founding members of this chapter, it&apos;s been an incredible journey watching our
                  vision come to life. We established a solid foundation in our inaugural year, and now we&apos;re
                  ready to reach new heights.
                </Typography>

                <Typography variant="body1" sx={{ color: 'white', mb: 3, fontSize: '1.05rem', lineHeight: 1.7 }}>
                  The opportunities within Kappa Theta Pi are truly limitless. This past year has exceeded every
                  expectation I had when we first started this chapter. It pushed me beyond my comfort zone,
                  connected me with an incredible network of tech-minded individuals, expanded my technical
                  skills, and introduced me to friends I know I&apos;ll have for life. What continues to amaze me is
                  the caliber of companies where our brothers are making their mark. From innovative startups to
                  Fortune 500 tech giants, our members are contributing to some of the most exciting
                  organizations in the industry.
                </Typography>

                <Typography variant="body1" sx={{ color: 'white', mb: 0, fontSize: '1.05rem', lineHeight: 1.7 }}>
                  I&apos;ve had the privilege of watching some of Alpha Beta&apos;s most talented and driven members
                  flourish, and I&apos;m thrilled to see what we&apos;ll accomplish together in 2025-2026. The trajectory
                  of our chapter&apos;s growth, both in the achievements of our individual members and our collective
                  impact, has been remarkable to witness from the very beginning.
                  <br /><br />
                  I hope this website gives you a taste of what makes our chapter exceptional. Come experience it
                  for yourself at Rush Week and our open events, where you can meet our brothers, see our
                  brotherhood in action, and explore the possibility of joining. {":)"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Our Pillars */}
        <Typography variant="h4" align="center" gutterBottom mt={10} sx={{ fontWeight: 'bold' }}>
          Our Pillars
        </Typography>

        <Grid container spacing={3} mt={3}>
          {pillars.slice(0, 3).map((pillar, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Paper
                elevation={3}
                sx={{
                  padding: 3,
                  backgroundColor: 'white',
                  textAlign: 'center',
                  height: '250px',
                  transition: 'transform 0.3s ease',
                  '&:hover': { transform: 'scale(1.05)' },
                }}
              >
                <Box display="flex" justifyContent="center" mb={1}>
                  {pillar.icon}
                </Box>
                <Typography variant="h6" color="black" sx={{ fontWeight: 'bold' }}>
                  {pillar.title}
                </Typography>
                <Typography variant="body2" color="black" mt={2}>
                  {pillar.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3} mt={1} justifyContent="center">
          {pillars.slice(3, 5).map((pillar, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Paper
                elevation={3}
                sx={{
                  padding: 3,
                  backgroundColor: 'white',
                  textAlign: 'center',
                  height: '250px',
                  transition: 'transform 0.3s ease',
                  '&:hover': { transform: 'scale(1.05)' },
                }}
              >
                <Box display="flex" justifyContent="center" mb={1}>
                  {pillar.icon}
                </Box>
                <Typography variant="h6" color="black" sx={{ fontWeight: 'bold' }}>
                  {pillar.title}
                </Typography>
                <Typography variant="body2" color="black" mt={2}>
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
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                KTP&apos;s History
              </Typography>
              <Typography variant="body1" gutterBottom sx={{ color: 'white', fontSize: '1.25rem', mb: 2 }}>
                KTP was founded on January 10, 2012, in Ann Arbor, Michigan, as the University of Michigan&apos;s first professional technology fraternity.
              </Typography>
              <Typography variant="body1" gutterBottom sx={{ color: 'white', fontSize: '1.25rem', mb: 2 }}>
                The fraternity aims to create bonds between students from various fields such as Informatics, computer science, business, design, and computer engineering.
              </Typography>
              <Typography variant="body1" gutterBottom sx={{ color: 'white', fontSize: '1.25rem', mb: 2 }}>
                Our goal is to develop networks through professional and social growth while exposing members to career opportunities in the tech industry.
              </Typography>
              <Typography variant="body1" gutterBottom sx={{ color: 'white', fontSize: '1.25rem', mb: 2 }}>
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

        {/* Our Network (static grid) */}
        <NetworkSection />
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

export default AboutUs;
