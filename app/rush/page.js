// pages/rush.js
import React from 'react';
import {green} from "@mui/material/colors";
import { Container, Paper, Typography, Box, Divider, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import 'tailwindcss/tailwind.css';

const events = [
    {
        title: "Applications Due",
        date: "September 10, 2024",
        description: "All applications for rushing Kappa Theta Pi are due by this date.",
    },
    {
        title: "Rush Kickoff Event",
        date: "September 12, 2024",
        description: "Join us for the kickoff event to learn more about Kappa Theta Pi and meet the members.",
    },
    {
        title: "Tech Talk and Networking",
        date: "September 14, 2024",
        description: "An opportunity to hear from industry professionals and network with other tech enthusiasts.",
    },
    {
        title: "Coding Workshop",
        date: "September 18, 2024",
        description: "Participate in a hands-on coding workshop led by experienced members of Kappa Theta Pi.",
    },
    {
        title: "Social Mixer",
        date: "September 20, 2024",
        description: "Join us for a fun social mixer to get to know the current members and fellow rushes.",
    },
    {
        title: "Final Interviews",
        date: "September 25, 2024",
        description: "Final interviews for prospective members who have made it through the initial rounds.",
    },
];

const faqs = [
    {
        question: "Who can rush KTP?",
        answer: "Anyone with an interest in technology and a commitment to our values is welcome to rush KTP.",
    },
    {
        question: "What types of social events does KTP plan on having?",
        answer: "KTP plans a variety of social events including mixers, tech talks, coding workshops, and more.",
    },
    {
        question: "How much of a time commitment is KTP's Pledge process?",
        answer: "The pledge process is designed to be manageable alongside your studies, with weekly meetings and events.",
    },
    {
        question: "How would KTP benefit me?",
        answer: "KTP offers networking opportunities, professional development, and a supportive community of tech enthusiasts.",
    },
    {
        question: "What if I have no previous tech experience?",
        answer: "No previous tech experience is required. We welcome members from all backgrounds and skill levels.",
    },
    {
        question: "What if I can't afford dues?",
        answer: "KTP offers financial assistance and flexible payment options to ensure that dues are not a barrier to membership.",
    },
];

const RushPage = () => {
    return (
        <Container className={'bg-gray-900 '} sx={{marginTop: 15}}>
            <Typography variant="h3" align="center" gutterBottom>
                Rush Events
            </Typography>
            <Box display="flex" flexDirection="column" alignItems="center" padding="5px" borderRadius="5px" position="relative" mt={5} py={5} px={3} backgroundColor="#1c398d"  >
                <Divider orientation="vertical" flexItem style={{ height: '90%', position: 'absolute', left: '50%', borderRightWidth: 5, backgroundColor: 'white' }} />
                {events.map((event, index) => (
                    <Box key={index} width="100%" display="flex" alignItems="center" my={3}>
                        {index % 2 === 0 ? (
                            <>
                                <Box flexGrow={1} display="flex" justifyContent="flex-end">
                                    <Paper elevation={3} style={{ padding: '20px', width: '300px', backgroundColor: 'white', color: 'black' }}>
                                        <Typography variant="h6">{event.title}</Typography>
                                        <Typography variant="subtitle1">{event.date}</Typography>
                                        <Typography variant="body1">{event.description}</Typography>
                                    </Paper>
                                </Box>
                                <Box mx={2} />
                                <Box flexGrow={3} />
                            </>
                        ) : (
                            <>
                                <Box flexGrow={3} />
                                <Box mx={2} />
                                <Box flexGrow={1} display="flex" justifyContent="flex-start">
                                    <Paper elevation={4} style={{ padding: '20px', width: '300px', backgroundColor: 'white', color: 'black' }}>
                                        <Typography variant="h6">{event.title}</Typography>
                                        <Typography variant="subtitle1">{event.date}</Typography>
                                        <Typography variant="body1">{event.description}</Typography>
                                    </Paper>
                                </Box>
                            </>
                        )}
                    </Box>
                ))}
            </Box>

            <Typography variant="h4" align="center" gutterBottom mt={5}>
                FAQ
            </Typography>
            <Box display="flex" flexDirection="column" alignItems="center" padding="5px" borderRadius="5px" mt={3} py={5} px={3} backgroundColor="#1c398d" style={{ width: '100%' }}>
                {faqs.map((faq, index) => (
                    <Accordion key={index} style={{ width: '100%', backgroundColor: 'white', color: 'black', margin: 0 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon style={{ color: 'black' }} />} style={{ margin: 0 }}>
                            <Typography variant={'h6'}>{faq.question}</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography>
                                {faq.answer}
                            </Typography>
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Box>
        </Container>
    );
};

export default RushPage;
