import React from 'react';
import { Container, Typography, Box, Card, CardContent, CardMedia,Grid } from '@mui/material';
import 'tailwindcss/tailwind.css';

const AboutUs = () => {
    const pillars = [
        {
            title: "Professional Development",
            description: "KTP provides professional development and support for tech careers, including interview training, resume building, mentorship, and private company recruiting.",
            image: "/static/images/cards/professional-development.jpg"
        },
        {
            title: "Alumni Connections",
            description: "Our alumni network connects you to members at top tech companies, including Microsoft, Amazon, Facebook, Apple, Google, consulting firms, financial technology firms, and startups.",
            image: "/static/images/cards/alumni-connections.jpg"
        },
        {
            title: "Social Growth",
            description: "KTP fosters friendships through social events, including tailgates, bowling, apple picking, and KTP formal.",
            image: "/static/images/cards/social-growth.jpg"
        },
        {
            title: "Technical Advancement",
            description: "Expand your technical skillset through workshops, projects, and more, preparing you for the industry through new member education and beyond.",
            image: "/static/images/cards/technical-advancement.jpg"
        },
        {
            title: "Academic Support",
            description: "KTP helps foster academic growth by providing a network of the brightest tech minds at Northwestern for support in and out of the classroom.",
            image: "/static/images/cards/academic-support.jpg"
        },
        {
            title: "Diversity, Equity, and Inclusion",
            description: "KTP is an inclusive workplace that recruits the best in tech, encouraging members to bring their authentic selves.",
            image: "/static/images/cards/dei.jpg"
        }
    ];

    return (
        <Container className="bg-gray-900 text-white py-10">
            <Typography variant="h3" align="center" gutterBottom className="text-white">
                About Us
            </Typography>
            <Box className="p-5 text-lg">
                <Typography variant="body1" gutterBottom>
                    Who are we?

                    Welcome to Kappa Theta Pi! We are a co-ed professional technology fraternity 
                    focused on fostering growth in professional, academic, and social aspects for students 
                    passionate about technology.
                </Typography>

                <Typography variant="body1" gutterBottom>
                    KTP&apos;s History
                    KTP was founded on January 10, 2012, in Ann Arbor, Michigan, and is the University of Michigan&apos;s 
                    first professional technology fraternity. The goals of the fraternity are to create bonds between students of Informatics, 
                    computer science, business, design, computer engineering, Information, and any others who are interested in technology, to 
                    develop networks through facilitation of professional and social growth, and to expose members to career options in the 
                    vast field of technology.
                </Typography>

                <Typography variant="body1" gutterBottom>
                    DEI Commitment 
                    At Kappa Theta Pi, we prioritize diversity, equity, and inclusion, ensuring a welcoming environment for all members. We believe 
                    in the power of technology to bring positive change and strive to provide resources and opportunities to help our members succeed.
                </Typography>

                <Grid container spacing={4}>
                    {pillars.map((pillar, index) => (
                        <Grid item xs={12} sm={6} md={4} key={index}>
                            <Card sx={{ maxWidth: 345 }}>
                                <CardMedia
                                    sx={{ height: 140 }}
                                    image={pillar.image}
                                    title={pillar.title}
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
                        </Grid>
                    ))}
                </Grid>
            </Box>
        </Container>
    );
};

export default AboutUs;
