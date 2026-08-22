'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function pad(value) {
  return String(value).padStart(2, '0');
}

/** Parse YYYY-MM-DD / YYYY-MM as a local date, so no timezone slippage. */
function parseValue(value, mode) {
  if (!value) return null;
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month) return null;
  return new Date(year, month - 1, mode === 'month' ? 1 : day || 1);
}

function formatValue(date, mode) {
  if (!date) return '';
  return mode === 'month'
    ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
    : `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatLabel(date, mode) {
  if (!date) return '';
  return date.toLocaleDateString(undefined,
    mode === 'month'
      ? { month: 'long', year: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' });
}

function calendarDays(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

/**
 * Chapter-standard date picker, styled like the assessment builder's calendar.
 * `mode="month"` returns YYYY-MM, otherwise YYYY-MM-DD.
 */
export default function DatePicker({
  value,
  onChange,
  mode = 'date',
  placeholder = 'Select a date',
  label,
  clearable = false,
  disabled = false,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseValue(value, mode), [value, mode]);
  const [viewDate, setViewDate] = useState(() => selected || new Date());
  const rootRef = useRef(null);

  useEffect(() => {
    if (selected) setViewDate(selected);
  }, [selected]);

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  function commit(next) {
    onChange(formatValue(next, mode));
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-label={label}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-left text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
      >
        <span className={selected ? 'text-white' : 'text-white/35'}>
          {selected ? formatLabel(selected, mode) : placeholder}
        </span>
        <CalendarDays size={16} className="shrink-0 text-white/45" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[90] mt-3 w-[min(92vw,320px)] overflow-hidden rounded-2xl border border-white/15 bg-[#0b1426] p-4 shadow-2xl shadow-black/45 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setViewDate(mode === 'month' ? new Date(year - 1, 0, 1) : new Date(year, month - 1, 1))
              }
              className="rounded-full p-2 text-white/65 transition hover:bg-white/10 hover:text-white"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="font-black">
              {mode === 'month' ? year : viewDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
            </div>
            <button
              type="button"
              onClick={() =>
                setViewDate(mode === 'month' ? new Date(year + 1, 0, 1) : new Date(year, month + 1, 1))
              }
              className="rounded-full p-2 text-white/65 transition hover:bg-white/10 hover:text-white"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {mode === 'month' ? (
            <div className="grid grid-cols-3 gap-2">
              {MONTHS.map((name, index) => {
                const active = selected && selected.getFullYear() === year && selected.getMonth() === index;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => commit(new Date(year, index, 1))}
                    className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                      active
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                        : 'text-white/75 hover:bg-white/10'
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-white/40">
                {WEEKDAYS.map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-1">
                {calendarDays(year, month).map((day) => {
                  const active = selected && sameDay(day, selected);
                  const muted = day.getMonth() !== month;
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => commit(day)}
                      className={`aspect-square rounded-xl text-sm font-bold transition ${
                        active
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                          : muted
                            ? 'text-white/25 hover:bg-white/5'
                            : 'text-white/75 hover:bg-white/10'
                      }`}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => commit(new Date())}
              className="flex-1 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white/70 transition hover:bg-white/10"
            >
              {mode === 'month' ? 'This month' : 'Today'}
            </button>
            {clearable && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className="flex-1 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white/70 transition hover:bg-white/10"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
