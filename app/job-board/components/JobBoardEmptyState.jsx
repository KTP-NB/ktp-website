export default function JobBoardEmptyState({ title, message, action }) {
  return (
    <section className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-slate-950/20 p-8 text-center">
      <h2 className="text-2xl font-black tracking-tight text-white">{title}</h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-blue-50/75">{message}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </section>
  );
}
