'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const items = [
  { label: 'Profile', href: '/profile', match: 'profile' },
  { label: 'Applications', href: '/applications', match: 'applications' },
  { label: 'Fines', href: '/fines', match: 'fines' },
  { label: 'Resume', href: '/profile?tab=resume', match: 'resume' },
];

export default function ProfileSectionNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = pathname === '/applications'
    ? 'applications'
    : pathname === '/fines'
      ? 'fines'
      : searchParams.get('tab') === 'resume' ? 'resume' : 'profile';

  return (
    <nav aria-label="Member account sections" className="mb-8 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">
      {items.map((item) => (
        <Link
          key={item.match}
          href={item.href}
          className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${
            active === item.match
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : 'text-white/65 hover:bg-white/10 hover:text-white'
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
