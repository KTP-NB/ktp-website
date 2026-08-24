'use client';

import FadeIn from '@/components/FadeIn';
import ProfileSectionNav from '@/components/ProfileSectionNav';

/**
 * Shared frame for the member account section (/profile, /applications, /fines,
 * /resume, /integrations). Keeps the heading and section nav identical across
 * every tab so switching routes does not shift the layout.
 */
export default function AccountShell({
  subtitle = 'Manage your profile, applications, and resume.',
  children,
  // Rendered inside <main> but outside FadeIn. Fixed-position overlays belong
  // here: FadeIn animates a transform, and a transformed ancestor makes
  // `position: fixed` resolve against it instead of the viewport.
  after = null,
}) {
  return (
    <main className="min-h-screen px-4 pb-20 pt-28 text-white md:pt-36">
      <FadeIn className="mx-auto w-full max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Member Account</h1>
          <p className="mt-2 text-white/60">{subtitle}</p>
        </div>
        <ProfileSectionNav />
        {children}
      </FadeIn>
      {after}
    </main>
  );
}
