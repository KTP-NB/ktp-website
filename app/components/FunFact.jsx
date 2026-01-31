'use client';

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

/**
 * Fun fact section for the About page, shown after "Who Are We".
 */
export default function FunFact() {
  return (
    <Box sx={{ my: 4, display: 'flex', justifyContent: 'center' }}>
      <Paper
        elevation={2}
        sx={{
          p: 2.5,
          maxWidth: 640,
          textAlign: 'center',
          bgcolor: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 2,
        }}
      >
        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5 }}>
          Did you know?
        </Typography>
        <Typography variant="body1" sx={{ color: 'white', mt: 0.5, fontSize: '1.1rem', lineHeight: 1.6 }}>
          Kappa Theta Pi was founded on January 10, 2012 at the University of Michigan as the first professional technology fraternity.
        </Typography>
      </Paper>
    </Box>
  );
}
