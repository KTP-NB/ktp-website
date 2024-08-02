import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import 'tailwindcss/tailwind.css';

const AboutUs = () => {
    return (
        <Container className="bg-gray-900 text-white py-10">
            <Typography variant="h3" align="center" gutterBottom className="text-white">
                About Us
            </Typography>
            <Box className="p-5 text-lg">

                <Typography variant="body1" gutterBottom>
                    Welcome to Kappa Theta Pi! We are a co-ed professional technology fraternity 
                    focused on fostering growth in professional, academic, and social aspects for students 
                    passionate about technology.
                </Typography>

                <Typography variant="body1" gutterBottom>
                    Kappa Theta Pi (ΚΘΠ, also known as KTP) is a co-ed professional fraternity specializing in the field of 
                    technology. KTP was founded on January 10, 2012, in Ann Arbor, Michigan, and is the University of Michigan`&apos;s 
                    first professional technology fraternity. The goals of the fraternity are to create bonds between students of Informatics, 
                    computer science, business, design, computer engineering, Information, and any others who are interested in technology, to 
                    develop networks through facilitation of professional and social growth, and to expose members to career options in the 
                    vast field of technology.
                </Typography>

                <Typography variant="body1" gutterBottom>
                    At Kappa Theta Pi, we prioritize diversity, equity, and inclusion, ensuring a welcoming environment for all members. We believe 
                    in the power of technology to bring positive change and strive to provide resources and opportunities to help our members succeed.
                </Typography>

                <Typography variant="body1" gutterBottom>
                    Join us and become part of a vibrant community that supports your growth in the tech industry.
                </Typography>
                
            </Box>
        </Container>
    );
};

export default AboutUs;
