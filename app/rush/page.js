import React from 'react';
import { Container, Typography, Box, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
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
        <div className="relative isolate min-h-screen bg-gray-900 text-white">
            {/* Gradient Background */}
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

            <Container className="w-full" sx={{ marginTop: 15 }}>
                <Typography variant="h3" align="center" gutterBottom>
                    Rush Events
                </Typography>

                {/* Tailwind Timeline */}
                <div className="relative py-16">
                    <div className="relative container mx-auto px-4">
                        {events.map((event, index) => (
                            <div key={index} className="mb-8 flex items-start">
                                <div className="flex-1 text-left">
                                    <h3 className="text-lg font-semibold text-white">{event.title}</h3>
                                    <p className="text-gray-400">{event.date}</p>
                                    <p className="text-gray-300">{event.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <Typography variant="h4" align="center" gutterBottom mt={5}>
                    FAQ
                </Typography>
                <Box display="flex" flexDirection="column" alignItems="center" padding="5px" mt={3} py={5} px={3} style={{ width: '100%' }}>
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

export default RushPage;
