export const JOB_BOARD_NAV_LINKS = [
  { href: '/job-board', label: 'Dashboard' },
  { href: '/job-board/saved', label: 'Saved' },
  { href: '/job-board/applications', label: 'Applications' },
  { href: '/job-board/notifications', label: 'Notifications' },
  { href: '/job-board/settings', label: 'Settings' },
];

export function isJobBoardRoute(pathname) {
  return pathname === '/job-board' || pathname?.startsWith('/job-board/') || false;
}

export function isJobBoardNavActive(pathname, href) {
  const normalizedPath = pathname?.replace(/\/+$/, '') || '/';
  return normalizedPath === href;
}
