// pages/rush.js
import React from 'react';
import { Container, Paper, Typography, Box, Divider, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import 'tailwindcss/tailwind.css';

const events = [
    {
        title: "Applications Due",
        date: "Date 1",
        description: "Description for applications due.",
    },
    {
        title: "Rush Event 1",
        date: "Date 2",
        description: "Description for rush event 1.",
    },
    {
        title: "Rush Event 2",
        date: "Date 3",
        description: "Description for rush event 2.",
    },
    {
        title: "Rush Event 3",
        date: "Date 4",
        description: "Description for rush event 3.",
    },
    {
        title: "Final Event",
        date: "Date 5",
        description: "Description for the final event.",
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
        <Container>
            <Typography variant="h3" align="center" gutterBottom>
                Rush Events
            </Typography>
            <Box display="flex" flexDirection="column" alignItems="center" padding="5px" borderRadius="5px" position="relative" mt={5} py={5} px={3} className="bg-gray-800">
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
            <Box display="flex" flexDirection="column" alignItems="center" padding="5px" borderRadius="5px" mt={3} py={5} px={3} className="bg-gray-800" style={{ width: '100%' }}>
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
