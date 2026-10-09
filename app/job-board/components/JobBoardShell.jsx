'use client';

import JobBoardNav from './JobBoardNav';

export default function JobBoardShell({ children }) {
  return (
    <main className="min-h-[80vh] px-4 pb-16 pt-28 md:px-6 md:pt-32 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-200">
            Member tools
          </p>
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">
                Job Board
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50/75">
                Find opportunities and organize applications.
              </p>
            </div>
            <JobBoardNav />
          </div>
        </div>

        {children}
      </div>
    </main>
  );
}
