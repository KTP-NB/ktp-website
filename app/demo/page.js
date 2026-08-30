import Link from "next/link";

export const metadata = {
  title: "KTP New Brunswick Platform Demo",
  description: "A walkthrough of the member platform powering Kappa Theta Pi's Alpha Beta chapter at Rutgers.",
};

export default function PlatformDemoPage() {
  return (
    <main className="min-h-screen bg-[#071733] px-5 pb-20 pt-32 text-white">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-blue-300">Kappa Theta Pi · Alpha Beta</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight sm:text-6xl">Building the infrastructure behind Rutgers&apos; premier tech community.</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-white/65">
          A production member-operations platform connecting 50+ members and alumni to recruiting tools,
          technical development, career support, and chapter leadership.
        </p>

        <div className="mt-10 overflow-hidden rounded-3xl border border-blue-300/20 bg-black shadow-2xl shadow-blue-950/50">
          <video className="aspect-video w-full" controls preload="metadata" poster="/demos/ktp-platform-demo-poster.jpg">
            <source src="/demos/ktp-platform-demo.mp4" type="video/mp4" />
            Your browser does not support embedded video.
          </video>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Member success", "Application tracking, recruiting outcomes, resumes, fines, and self-service integrations."],
            ["Technical growth", "CodeRank assessments, monthly OA accountability, and reusable interview-prep workflows."],
            ["Chapter operations", "Role-based administration, recruiting analytics, fine management, APIs, and MCP tooling."],
          ].map(([title, detail]) => (
            <article key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-white/55">{detail}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/" className="rounded-full bg-blue-600 px-6 py-3 font-bold hover:bg-blue-500">Explore KTP New Brunswick</Link>
          <a href="/demos/ktp-platform-demo.mp4" download className="rounded-full border border-white/20 px-6 py-3 font-bold hover:bg-white/10">Download demo</a>
        </div>
      </section>
    </main>
  );
}
