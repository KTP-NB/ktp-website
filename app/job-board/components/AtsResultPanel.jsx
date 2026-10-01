export default function AtsResultPanel({ analysis }) {
  const score = Math.round(Number(analysis.score || 0));

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 text-white shadow-xl backdrop-blur">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-200">
            Match Score
          </p>
          <h2 className="mt-2 text-4xl font-black">{score}%</h2>
        </div>
        <div className="h-4 w-full overflow-hidden rounded-full bg-slate-950/40 lg:max-w-xl">
          <div
            className="h-full rounded-full bg-blue-400"
            style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <MetricList title="Matched skills" items={analysis.matched_skills || analysis.matchedSkills || []} tone="good" />
        <MetricList title="Missing skills" items={analysis.missing_skills || analysis.missingSkills || []} tone="warn" />
        <MetricList title="Missing keywords" items={analysis.missing_keywords || analysis.missingKeywords || []} tone="warn" />
        <MetricList title="Suggestions" items={(analysis.recommendations || []).map((item) => item.title || item.message)} />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <ScorePill label="Experience" value={analysis.experience_alignment?.score} />
        <ScorePill label="Education" value={analysis.education_alignment?.score} />
        <ScorePill label="Projects" value={analysis.project_relevance?.score} />
      </div>
    </section>
  );
}

function MetricList({ title, items, tone }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
      <h3 className="text-sm font-black uppercase tracking-wide text-blue-100">{title}</h3>
      {items.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.slice(0, 10).map((item) => (
            <span
              key={item}
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                tone === 'good'
                  ? 'bg-emerald-400/20 text-emerald-100'
                  : tone === 'warn'
                    ? 'bg-amber-400/20 text-amber-100'
                    : 'bg-blue-400/20 text-blue-100'
              }`}
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-blue-50/60">None found.</p>
      )}
    </div>
  );
}

function ScorePill({ label, value }) {
  const score = value == null ? null : Math.round(Number(value) * 100);
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
      <p className="text-sm font-bold text-blue-100/80">{label}</p>
      <p className="mt-2 text-2xl font-black">{score == null ? 'N/A' : `${score}%`}</p>
    </div>
  );
}
