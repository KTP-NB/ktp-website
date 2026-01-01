'use client';

import { Box } from '@mui/material';

export default function Tabs({ tabs, active, setActive }) {
  return (
    <Box
      display="flex"
      justifyContent="center"
      gap={2}
      mb={6}
      flexWrap="wrap"
    >
      {tabs.map((tab) => {
        const isActive = active === tab;

        return (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`
              px-5 py-2.5 rounded-full text-sm font-medium
              transition-all duration-300
              ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
              }
            `}
          >
            {tab}
          </button>
        );
      })}
    </Box>
  );
}
