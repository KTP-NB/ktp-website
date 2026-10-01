export default function JobBoardStatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-lg backdrop-blur">
      <p className="text-sm font-semibold text-blue-100/75">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
}
