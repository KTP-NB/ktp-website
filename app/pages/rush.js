// pages/rush.js
import React from 'react';
import { Container, Paper, Typography, Box, Divider } from '@mui/material';
import { grey } from "@mui/material/colors";
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

const RushPage = () => {
    return (
        <Container>
            <Typography variant="h3" align="center" gutterBottom>
                Rush Events
            </Typography>
            <Box display="flex" flexDirection="column" alignItems="center"  padding='5px' borderRadius={'5px'} position="relative" mt={5} py={5} px={3} className="bg-gray-800 ">
                <Divider orientation="vertical" flexItem style={{ height: '90%', position: 'absolute', left: '50%', borderRightWidth: 5, backgroundColor: 'white'  }} />
                {events.map((event, index) => (
                    <Box key={index} width="100%" display="flex" alignItems="center" my={3}>
                        {index % 2 === 0 ? (
                            <>
                                <Box flexGrow={1} display="flex" justifyContent="flex-end">
                                    <Paper elevation={3} style={{ padding: '20px', width: '300px' }}>
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
                                    <Paper elevation={4} style={{ padding: '20px', width: '300px' }}>
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
        </Container>
    );
};

export default RushPage;
