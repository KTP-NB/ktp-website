export default function JobBoardLoading() {
  return (
    <main className="min-h-[80vh] px-4 pb-16 pt-28 md:px-6 md:pt-32 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.06]"
          />
        ))}
      </div>
    </main>
  );
}
