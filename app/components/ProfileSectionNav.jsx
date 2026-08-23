'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { label: 'Profile', href: '/profile' },
  { label: 'Applications', href: '/applications' },
  { label: 'Fines', href: '/fines' },
  { label: 'Resume', href: '/resume' },
  { label: 'API & Integrations', href: '/integrations' },
];

export default function ProfileSectionNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Member account sections" className="mb-8 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">
      {items.map((item) => {
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${
              active
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                : 'text-white/65 hover:bg-white/10 hover:text-white'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
