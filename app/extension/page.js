'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import AuthGate from '@/components/authgate';
import FadeIn from '@/components/FadeIn';

const INSTALL_STEPS = [
  {
    title: 'Download the zip',
    body: 'Use the Download Extension button on this page. You must be logged into ktpnewbrunswick.org.',
  },
  {
    title: 'Unzip the file',
    body: 'You should get a folder named ktp-referral-extension (with manifest.json inside). Keep that folder — Chrome loads the folder, not the .zip.',
  },
  {
    title: 'Open Chrome extensions',
    body: 'In Chrome, go to chrome://extensions (paste that into the address bar).',
  },
  {
    title: 'Turn on Developer Mode',
    body: 'Toggle Developer Mode in the top-right. Chrome may warn that this is for developers — that is expected for chapter-distributed extensions.',
  },
  {
    title: 'Load Unpacked',
    body: 'Click Load Unpacked and select the unzipped ktp-referral-extension folder.',
  },
  {
    title: 'Stay logged into this site',
    body: 'Keep a ktpnewbrunswick.org tab open (or log in again) so the extension can use your brother session. Then open a job posting on LinkedIn, Greenhouse, Lever, Workday, or a company careers page and click the extension icon.',
  },
];

const HOW_IT_WORKS = [
  'The extension only sends the company name from the job page — not your browsing history.',
  'It uses your existing KTP website login. You do not need a separate Supabase account.',
  'Lookups go to secure Supabase Edge Functions (match + telemetry) already deployed for the chapter.',
  'Referrals stay locked while you have unpaid fines.',
];

const TROUBLESHOOTING = [
  {
    problem: '“Please log in at ktpnewbrunswick.org”',
    fix: 'Open https://www.ktpnewbrunswick.org/login in the same Chrome profile that has the extension, sign in, leave that tab open, then click the extension again.',
  },
  {
    problem: '“HTTP 401: Invalid session” (stale login cache)',
    fix: 'Click Clear cached login in the popup, log in again on ktpnewbrunswick.org, reload the extension on chrome://extensions, keep the KTP tab open, and retry on a job page. This usually means the extension was holding an expired token.',
  },
  {
    problem: 'Unpaid fines / “Pay them on …/fines to unlock referrals”',
    fix: 'The extension is blocked until your fine balance is $0. Open https://www.ktpnewbrunswick.org/fines, settle with the VP of Finance, then try again — no reinstall needed.',
  },
  {
    problem: 'Extension shows nothing / wrong company',
    fix: 'Open a specific job posting URL (not a Google search results page or shopping page). Supported boards: LinkedIn, Greenhouse, Lever, Workday, and many company career sites.',
  },
  {
    problem: '“No KTP referral contacts found”',
    fix: 'You are authenticated and in good standing, but no alumni marked open-to-refer are linked to that company in the database yet. Try another company or ask leadership to update alumni profiles.',
  },
  {
    problem: 'After an update, old behavior returns',
    fix: 'Download the latest zip from this page, replace your old folder (or Load Unpacked again on the new folder), then click Reload on chrome://extensions.',
  },
  {
    problem: 'Chrome disabled the extension after restart',
    fix: 'Unpacked extensions can be disabled when Developer Mode is off. Re-enable Developer Mode and turn the extension back on.',
  },
];

function TroubleshootingAccordion({ items }) {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isOpen = openIndex === index;

        return (
          <div
            key={item.problem}
            className={`overflow-hidden rounded-xl border transition-all ${
              isOpen
                ? 'border-white/20 bg-white/[0.06]'
                : 'border-white/10 bg-white/[0.03] hover:border-white/20'
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
            >
              <span className="font-semibold text-white">{item.problem}</span>
              <span
                className={`shrink-0 text-sm text-blue-300 transition-transform duration-300 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              >
                ▼
              </span>
            </button>

            <div
              className={`grid transition-all duration-300 ${
                isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-4 pb-3 text-sm leading-relaxed text-white/70">{item.fix}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ExtensionDownloadContent() {
  return (
    <main className="min-h-screen px-4 pb-20 pt-28 text-white md:pt-36">
      <FadeIn className="mx-auto w-full max-w-6xl">
        <div className="mb-10 text-center">
          <h1 className="mt-2 text-3xl font-black leading-[1.1] tracking-tight text-white drop-shadow-2xl sm:text-4xl lg:text-5xl">
            KTP Referral Finder
          </h1>
          <p className="mx-auto mt-3 max-w-3xl text-[1.05rem] text-white/60">
            Chrome extension that finds KTP alumni referral contacts while you browse job
            postings on LinkedIn, Greenhouse, Lever, Workday, and company career pages.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl md:p-8">
          <a
            href="/downloads/ktp-referral-finder.zip"
            download="ktp-referral-finder.zip"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-lg font-bold text-white transition hover:bg-blue-500"
          >
            <Download size={20} />
            Download Extension
          </a>
          <p className="mt-3 text-sm text-white/50">
            Version 1.4.1 · works with your ktpnewbrunswick.org login · unpaid fines lock referrals
          </p>

          <div className="mt-8">
            <h2 className="text-lg font-bold">How it works</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-white/80">
              {HOW_IT_WORKS.map((item) => (
                <li key={item} className="leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl md:p-8">
            <h2 className="text-xl font-bold">Install &amp; use</h2>
            <ol className="mt-4 list-decimal space-y-4 pl-5 text-white/80">
              {INSTALL_STEPS.map((step) => (
                <li key={step.title} className="leading-relaxed">
                  <span className="font-semibold text-white">{step.title}.</span>{' '}
                  {step.body}
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl md:p-8">
            <h2 className="text-xl font-bold">Troubleshooting</h2>
            <p className="mt-1 text-sm text-white/50">Click a problem to see the fix.</p>
            <div className="mt-4">
              <TroubleshootingAccordion items={TROUBLESHOOTING} />
            </div>
          </div>
        </div>

        <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60">
          This extension is distributed by the chapter and is not on the Chrome Web Store
          yet, so Chrome will show a Developer Mode notice — that is expected and safe for
          brothers installing from this page.
        </p>
      </FadeIn>
    </main>
  );
}

export default function ExtensionPage() {
  return (
    <AuthGate>
      <ExtensionDownloadContent />
    </AuthGate>
  );
}
