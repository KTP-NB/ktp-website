'use client';

export default function JobPagination({ page, totalPages, total, perPage, onPageChange }) {
  if (totalPages <= 1) {
    return (
      <p className="text-center text-sm font-semibold text-blue-50/70">
        Showing {total} job{total === 1 ? '' : 's'}
      </p>
    );
  }

  return (
    <nav className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-white backdrop-blur sm:flex-row">
      <p className="text-sm font-semibold text-blue-50/75">
        Page {page} of {totalPages} / {total} jobs / {perPage} per page
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-full bg-slate-950/40 px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        {pageNumbers(page, totalPages).map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            onClick={() => onPageChange(pageNumber)}
            className={`h-10 w-10 rounded-full text-sm font-black ${
              pageNumber === page ? 'bg-blue-500 text-white' : 'bg-slate-950/40 text-blue-50'
            }`}
          >
            {pageNumber}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-full bg-slate-950/40 px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </nav>
  );
}

function pageNumbers(page, totalPages) {
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
