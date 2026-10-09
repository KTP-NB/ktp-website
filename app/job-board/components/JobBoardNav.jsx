'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isJobBoardNavActive, JOB_BOARD_NAV_LINKS } from '@/lib/job-board/navigation';

export default function JobBoardNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Job Board"
      className="flex max-w-full gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.06] p-2 backdrop-blur"
    >
      {JOB_BOARD_NAV_LINKS.map((link) => {
        const isActive = isJobBoardNavActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? 'page' : undefined}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition ${
              isActive
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                : 'text-blue-50/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
