'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarClock, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Date + time picker from the assessment builder, extracted so every screen
 * that needs a datetime uses the same calendar instead of a native input.
 */
export default function DateTimePicker({ value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const selected = parseDateValue(value) || new Date();
  const [viewDate, setViewDate] = useState(selected);
  const rootRef = useRef(null);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const days = calendarDays(year, month);
  const hours = selected.getHours();
  const minutes = selected.getMinutes();

  function commit(next) {
    onChange(formatDateTime(next));
    setViewDate(next);
  }

  function setDay(day) {
    const next = new Date(selected);
    next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    commit(next);
  }

  function setHour(hour) {
    const next = new Date(selected);
    next.setHours(hour);
    commit(next);
  }

  function setMinute(minute) {
    const next = new Date(selected);
    next.setMinutes(minute);
    commit(next);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((cur) => !cur)}
        className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-left text-sm font-bold text-white transition hover:bg-white/10"
      >
        <span className={value ? 'text-white' : 'text-white/35'}>{value || placeholder}</span>
        <CalendarClock size={16} className="text-white/45" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-[80] mt-3 w-[min(92vw,560px)] overflow-hidden rounded-2xl border border-white/15 bg-[#0b1426] p-4 shadow-2xl shadow-black/45 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))} className="rounded-full p-2 text-white/65 hover:bg-white/10 hover:text-white">
              <ChevronLeft size={18} />
            </button>
            <div className="font-black">{viewDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
            <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))} className="rounded-full p-2 text-white/65 hover:bg-white/10 hover:text-white">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_160px]">
            <div>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-white/40">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => <div key={d}>{d}</div>)}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const active = sameDay(day, selected);
                  const muted = day.getMonth() !== month;
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => setDay(day)}
                      className={`aspect-square rounded-xl text-sm font-bold transition ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' : muted ? 'text-white/25 hover:bg-white/5' : 'text-white/75 hover:bg-white/10'}`}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-white/45">Time</div>
              <div className="grid grid-cols-2 gap-2">
                <TimeColumn values={Array.from({ length: 24 }, (_, i) => i)} value={hours} onChange={setHour} format={(h) => String(h).padStart(2, '0')} />
                <TimeColumn values={[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]} value={Math.round(minutes / 5) * 5 % 60} onChange={setMinute} format={(m) => String(m).padStart(2, '0')} />
              </div>
              <button type="button" onClick={() => { commit(new Date()); setOpen(false); }} className="mt-3 w-full rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white/70 hover:bg-white/10">
                Use now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimeColumn({ values, value, onChange, format }) {
  return (
    <div className="pretty-scrollbar max-h-44 overflow-y-auto rounded-lg bg-black/15 p-1">
      {values.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`block w-full rounded-lg px-2 py-1.5 text-sm font-bold transition ${v === value ? 'bg-blue-600 text-white' : 'text-white/65 hover:bg-white/10'}`}
        >
          {format(v)}
        </button>
      ))}
    </div>
  );
}

function calendarDays(year, month) {
  const start = new Date(year, month, 1);
  const first = new Date(year, month, 1 - start.getDay());
  return Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i));
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function parseDateValue(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(date) {
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
