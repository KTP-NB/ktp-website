'use client';

import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import {grey} from "@mui/material/colors";
import {LinkedinIcon} from "lucide-react";
import fallbackMembers from './allMembers.json';
import Tabs from '../components/Tabs';
import { useEffect, useState } from 'react';
import FadeIn from '@/components/FadeIn';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';
import { readCachedData, writeCachedData } from '@/lib/publicDataCache';
import { MEMBERS_CACHE_KEY } from '@/lib/cacheKeys';
import { greekLetters, memberProfileToCardMember } from './memberProfileMapper';

const MEMBERS_CACHE_TTL_MS = 5 * 60 * 1000;


const MemberCard = ({ member, onLinkedInClick }) => (
  <Box
    m={2.5}
    width="220px"
    className="group transition-all duration-300 hover:-translate-y-2"
  >
    <Box
      sx={{
        bgcolor: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(12px)',
        color: 'white',
        textAlign: 'center',
        borderRadius: '14px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
      }}
      className="hover:shadow-2xl hover:border-white/20 transition-all duration-300"
    >
      {/* IMAGE */}
        <Box
        sx={{ height: 180, position: 'relative', overflow: 'hidden' }}
        onClick={() => onLinkedInClick(member.linkedin)}
        className="cursor-pointer"
        >
        <img
            src={member.image}
            alt={member.name}
            style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: member.cropPosition || 'center',
                transform: member.cropScale ? `scale(${member.cropScale})` : undefined,
                transformOrigin: member.cropOrigin || 'center',
            }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-full">
                <LinkedinIcon color="white" size={36} />
            </div>
            <div className="absolute bottom-2 right-2 z-20 w-4 h-4 flex items-center justify-center rounded-full group-hover:scale-110 transition-transform duration-300">
                <span className="text-xs font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,10)] drop-shadow-[0_0_8px_rgba(0,0,0,1)]">
                    {greekLetters[member.class] || 'Α'}
                </span>
            </div>
        </div>
        </Box>



      {/* TEXT */}
      <Box sx={{ p: 2, position: 'relative', zIndex: 1 }}>
        <Typography fontWeight={600} fontSize={16}>
          {member.name}
        </Typography>

        <Box
          mt={0.8}
          display="inline-block"
          px={1.5}
          py={0.4}
          borderRadius="999px"
          sx={{
            bgcolor: 'rgba(59,130,246,0.15)',
            color: '#93c5fd',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {member.status === 'Alumni' ? member.class : member.position}
        </Box>
      </Box>
    </Box>
  </Box>
);


export default function MembersPage() {
  const [activeTab, setActiveTab] = useState('Executive Board');
  const [allMembers, setAllMembers] = useState(fallbackMembers);
  const [loadingMembers, setLoadingMembers] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadMembers() {
      const cachedMembers = readCachedData(MEMBERS_CACHE_KEY, MEMBERS_CACHE_TTL_MS);

      if (cachedMembers) {
        setAllMembers(cachedMembers);
        setLoadingMembers(false);
      }

      if (!hasSupabaseConfig) {
        setLoadingMembers(false);
        return;
      }

      // Explicit list: anonymous visitors are granted only the directory
      // columns, so `select('*')` would be denied for signed-out users.
      const { data, error } = await supabase
        .from('member_profiles')
        .select(
          'id, name, position, image_path, photo_url, graduation_year, major, minors, linkedin_url, pledge_class, member_status, executive_board, committees, sort_order'
        )
        .order('sort_order', { ascending: true });

      if (!isMounted) return;

      if (error) {
        console.error('Failed to load member profiles from Supabase:', error);
        setAllMembers(fallbackMembers);
      } else {
        const mappedMembers = (data || []).map(memberProfileToCardMember);
        writeCachedData(MEMBERS_CACHE_KEY, mappedMembers);
        setAllMembers(mappedMembers);
      }

      setLoadingMembers(false);
    }

    loadMembers();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLinkedInClick = (url) => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen text-white py-24">
      <FadeIn>
      <Container>
        <h1 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] drop-shadow-2xl text-center text-white">
          Our Members
        </h1>

        <Typography align="center" sx={{ color: grey[400], mb: 3, mt: 1, fontSize: '1.1rem' }}>
          Meet the people building our community
        </Typography>

        <Tabs
          tabs={['Executive Board', 'Active Members', 'Committees', 'Alumni']}
          active={activeTab}
          setActive={setActiveTab}
        />

        <Box
          display="flex"
          flexWrap="wrap"
          justifyContent="center"
          mt={5}
          className="animate-fade-in"
        >
        {loadingMembers && (
          <Typography width="100%" align="center" sx={{ color: grey[300], mb: 3 }}>
            Loading members...
          </Typography>
        )}
        {activeTab !== 'Committees' ? (
          activeTab === 'Alumni' ? (
            (() => {
              const filtered = allMembers.filter(m => m.status === 'Alumni');

              const grouped = filtered.reduce((acc, m) => {
                const cls = m.class || 'Unknown';
                if (!acc[cls]) acc[cls] = [];
                acc[cls].push(m);
                return acc;
              }, {});

              const baseOrder = Object.keys(greekLetters).filter(k => k !== 'Founding');
              const orderedClasses = ['Founding', ...baseOrder];
              const remaining = Object.keys(grouped).filter(k => !orderedClasses.includes(k)).sort();
              const renderOrder = [...orderedClasses].reverse().concat(remaining.reverse());

              return renderOrder.map((cls) => {
                const list = grouped[cls];
                if (!list || list.length === 0) return null;

                return (
                  <Box key={cls} width="100%" mb={8}>
                    <Typography
                      variant="h5"
                      align="center"
                      sx={{
                        fontWeight: 700,
                        mb: 3,
                        letterSpacing: '0.02em',
                      }}
                    >
                      {cls}
                    </Typography>

                    <Box display="flex" flexWrap="wrap" justifyContent="center">
                      {list.map((member, idx) => (
                        <MemberCard key={idx} member={member} onLinkedInClick={handleLinkedInClick} />
                      ))}
                    </Box>
                  </Box>
                );
              });
            })()
          ) : activeTab === 'Active Members' ? (
            (() => {
              const filtered = allMembers.filter(m => m.status === 'Active');

              const grouped = filtered.reduce((acc, m) => {
                const cls = m.class || 'Unknown';
                if (!acc[cls]) acc[cls] = [];
                acc[cls].push(m);
                return acc;
              }, {});

              const baseOrder = Object.keys(greekLetters).filter(k => k !== 'Founding');
              const orderedClasses = ['Founding', ...baseOrder];
              const remaining = Object.keys(grouped).filter(k => !orderedClasses.includes(k)).sort();
              const renderOrder = [...orderedClasses].reverse().concat(remaining.reverse());

              // Flatten members by class order (most recent class first) without class headings
              const flattened = [];
              renderOrder.forEach((cls) => {
                const list = grouped[cls];
                if (list && list.length) flattened.push(...list);
              });

              return flattened.map((member, idx) => (
                <MemberCard key={idx} member={member} onLinkedInClick={handleLinkedInClick} />
              ));
            })()
          ) : (
            // Executive Board: ordered by position hierarchy
            (() => {
              const eboardOrder = [
                'President', 'Vice President',
                'VP of Prof Development', 'VP of Tech Development',
                'VP of Membership', 'VP of Engagement',
                'VP of Finance', 'VP of External Affairs',
                'VP of Internal Ops', 'VP of Marketing',
              ];
              return allMembers
                .filter(m => m.executive_board)
                .sort((a, b) => {
                  const ai = eboardOrder.indexOf(a.position);
                  const bi = eboardOrder.indexOf(b.position);
                  return (ai === -1 ? eboardOrder.length : ai) - (bi === -1 ? eboardOrder.length : bi);
                })
                .map((member, idx) => (
                  <MemberCard key={idx} member={member} onLinkedInClick={handleLinkedInClick} />
                ));
            })()
          )
        ) : (
          ["Tech", "Finance", "Pledge", "Outreach", "Marketing"].map((committeeName) => {
            const committeeMembersList = allMembers
              .filter(m => m.committees.includes(committeeName))
              .sort((a, b) => {
                // Eboard position holders first, then regular members
                if (a.executive_board && !b.executive_board) return -1;
                if (!a.executive_board && b.executive_board) return 1;
                return 0;
              });
            if (committeeMembersList.length === 0) return null;
            
            return (
                <Box key={committeeName} width="100%" mb={8}>
                    {/* COMMITTEE TITLE */}
                    <Typography
                        variant="h5"
                        align="center"
                        sx={{
                            fontWeight: 700,
                            mb: 3,
                            letterSpacing: '0.02em',
                        }}
                    >
                        {committeeName} Committee
                    </Typography>

                    {/* MEMBERS */}
                    <Box
                        display="flex"
                        flexWrap="wrap"
                        justifyContent="center"
                    >
                        {committeeMembersList.map((member, idx) => (
                            <MemberCard
                                key={idx}
                                member={member}
                                onLinkedInClick={handleLinkedInClick}
                            />
                        ))}
                    </Box>
                </Box>
            );
          })
        )}

        </Box>
      </Container>
      </FadeIn>
    </div>
  );
}
