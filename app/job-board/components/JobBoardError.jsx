export default function JobBoardError({ error, reset }) {
  return (
    <main className="min-h-[80vh] px-4 pb-16 pt-28 md:px-6 md:pt-32 lg:px-8">
      <section className="mx-auto max-w-3xl rounded-2xl border border-red-300/30 bg-red-950/30 p-8 text-center text-white">
        <h1 className="text-2xl font-black">Something went wrong</h1>
        <p className="mt-3 text-sm text-red-100/80">
          {error?.message || 'The Job Board could not load.'}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-full bg-white px-5 py-2 text-sm font-bold text-slate-950 transition hover:bg-blue-100"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
