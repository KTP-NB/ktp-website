const VIEW_W = 1200;
const VIEW_H = 680;

const TRACK =
  "M 40 140 L 180 140 C 320 60 460 220 600 140 C 740 60 880 220 1020 140 C 1190 140 1190 460 1020 460 C 950 380 890 540 820 460 C 650 380 470 540 300 460";

const steps = [
  {
    kind: "stage",
    n: 1,
    title: "Open Rush",
    body: "Four open events. You need to come to at least two of them.",
    node: [180, 140],
    card: [180, 180],
    showEvents: true,
  },
  {
    kind: "check",
    label: "Find out if you made closed rush",
    node: [390, 140],
    tag: [390, 95],
  },
  {
    kind: "stage",
    n: 2,
    title: "Closed Rush",
    body: "Invite only events for the rushees who made it past open rush.",
    node: [600, 140],
    card: [600, 180],
  },
  {
    kind: "check",
    label: "Find out if you got an interview",
    node: [810, 140],
    tag: [810, 95],
  },
  {
    kind: "stage",
    n: 3,
    title: "Application",
    body: "Got an interview? Fill out the application before you go in.",
    node: [1020, 140],
    card: [985, 190],
    cardW: 230,
  },
  {
    kind: "stage",
    n: 4,
    title: "Interview",
    body: "Sit down with the brothers and show them who you are.",
    node: [820, 460],
    card: [820, 505],
  },
  {
    kind: "check",
    label: "Find out if you got a bid",
    node: [560, 460],
    tag: [560, 400],
  },
  {
    kind: "finish",
    title: "Bid Day",
    body: "Get your bid and join the next KTP class.",
    node: [300, 460],
    card: [300, 512],
  },
];

const pctX = (x) => `${(x / VIEW_W) * 100}%`;
const pctY = (y) => `${(y / VIEW_H) * 100}%`;
const at = ([x, y]) => ({ left: pctX(x), top: pctY(y) });

export default function RushTimeline({ term, interestFormUrl }) {
  return (
    <section className="bg-[linear-gradient(135deg,#172f50,#1d3a66,#204584)] px-6 py-24 md:pb-28">
      <div className="mx-auto flex max-w-[1180px] flex-col items-center gap-16">
        <div className="flex max-w-3xl flex-col items-center gap-5 text-center">
          <span className="rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white">
            Coming up next semester
          </span>
          <h2 className="text-4xl font-black leading-[1.08] tracking-tight text-white md:text-5xl">
            {term} Rush Is Coming
          </h2>
          <p className="text-base leading-relaxed text-blue-100 md:text-lg">
            Be on the lookout. Dates drop soon, so here&apos;s exactly how rush works from your first
            event all the way to your bid.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3.5">
            <a
              href={interestFormUrl}
              className="rounded-full bg-blue-500 px-8 py-3 font-semibold text-white transition hover:bg-blue-400"
            >
              Interest Form Coming Soon
            </a>
            <a
              href="#faq"
              className="rounded-full border border-blue-300 px-8 py-3 font-medium text-blue-100 transition hover:bg-white/10"
            >
              FAQs
            </a>
          </div>
        </div>

        <Track />
        <MobileTrack />
      </div>
    </section>
  );
}

function Track() {
  return (
    <div className="relative hidden w-full lg:block" style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full overflow-visible"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={TRACK} stroke="rgba(255,255,255,0.08)" strokeWidth="38" />
        <path d={TRACK} stroke="rgba(147,197,253,0.35)" strokeWidth="40" strokeOpacity="0.25" />
        <path d={TRACK} stroke="#172f50" strokeWidth="30" strokeOpacity="0.55" />
        <path d={TRACK} stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeDasharray="12 14" />
      </svg>

      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold tracking-[0.16em] text-[#172f50]"
        style={at([40, 140])}
      >
        START
      </div>

      {steps.map((step) => (
        <TrackStep key={step.title || step.label} step={step} />
      ))}
    </div>
  );
}

function TrackStep({ step }) {
  if (step.kind === "check") {
    return (
      <>
        <div
          className="absolute h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-blue-500 bg-white"
          style={at(step.node)}
        />
        <div
          className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/20 bg-[#0f2a44]/90 px-3 py-1.5 text-[12.5px] font-medium text-slate-200"
          style={at(step.tag)}
        >
          <BellIcon />
          {step.label}
        </div>
      </>
    );
  }

  const finish = step.kind === "finish";

  return (
    <>
      <div
        className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full ${
          finish
            ? "h-[72px] w-[72px] bg-white shadow-[0_0_0_8px_rgba(255,255,255,0.14),0_12px_30px_rgba(0,0,0,0.35)]"
            : "h-[58px] w-[58px] bg-blue-500 text-[22px] font-extrabold text-white shadow-[0_0_0_7px_rgba(255,255,255,0.12),0_12px_30px_rgba(0,0,0,0.35)]"
        }`}
        style={at(step.node)}
      >
        {finish ? <FlagIcon size={30} /> : step.n}
      </div>
      <div
        className={`absolute flex -translate-x-1/2 flex-col gap-2 rounded-2xl border px-[18px] py-4 ${
          finish ? "border-white/30 bg-white/[0.12]" : "border-white/[0.16] bg-white/[0.07]"
        }`}
        style={{ ...at(step.card), width: pctX(step.cardW || 250) }}
      >
        <h3 className="text-[17px] font-bold text-white">{step.title}</h3>
        <p className="text-sm leading-normal text-blue-100">{step.body}</p>
        {step.showEvents && <EventDots />}
      </div>
    </>
  );
}

function EventDots() {
  return (
    <div className="mt-0.5 flex items-center gap-1.5">
      <span className="h-3 w-3 rounded-full bg-blue-500" />
      <span className="h-3 w-3 rounded-full bg-blue-500" />
      <span className="h-3 w-3 rounded-full border-2 border-white/40" />
      <span className="h-3 w-3 rounded-full border-2 border-white/40" />
      <span className="ml-1.5 text-xs font-semibold text-blue-200">2 of 4 required</span>
    </div>
  );
}

function MobileTrack() {
  return (
    <ol className="flex w-full max-w-[480px] flex-col lg:hidden">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        const check = step.kind === "check";

        return (
          <li key={step.title || step.label} className="flex gap-[18px]">
            <div className="flex w-11 flex-none flex-col items-center">
              {check ? (
                <div className="h-4 w-4 flex-none rounded-full border-4 border-blue-500 bg-white" />
              ) : step.kind === "finish" ? (
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-white">
                  <FlagIcon size={22} />
                </div>
              ) : (
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-blue-500 font-extrabold text-white">
                  {step.n}
                </div>
              )}
              {!last && <div className="min-h-6 flex-1 border-l-2 border-dashed border-white/40" />}
            </div>

            {check ? (
              <p className="pb-7 text-[13px] font-semibold text-blue-300">{step.label}</p>
            ) : (
              <div className={last ? "pt-2" : "pb-7 pt-2"}>
                <h3 className="mb-1.5 text-[17px] font-bold text-white">{step.title}</h3>
                <p className="text-sm leading-normal text-blue-100">{step.body}</p>
                {step.showEvents && <EventDots />}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function BellIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function FlagIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#172f50" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 22V4" />
      <path d="M4 4h14l-2 4 2 4H4" />
    </svg>
  );
}
