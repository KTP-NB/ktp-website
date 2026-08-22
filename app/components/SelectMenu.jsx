'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

/**
 * Chapter-standard dropdown. Matches the assessment builder's controls: a
 * bg-white/5 trigger and a #0b1426 popover whose active row is blue-600.
 * Used everywhere instead of a native <select>, which the browser renders with
 * its own light chrome.
 *
 * options: [{ value, label, hint? }]
 * value:   the selected value, or an array when `multiple`
 */
export default function SelectMenu({
  value,
  onChange,
  options,
  label,
  placeholder = 'Select',
  multiple = false,
  searchable = false,
  searchPlaceholder = 'Search',
  align = 'left',
  disabled = false,
  className = '',
  menuClassName = 'w-full min-w-[13rem]',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return undefined;
    }
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

  const selected = useMemo(() => (multiple ? value || [] : value), [multiple, value]);

  const triggerLabel = useMemo(() => {
    if (multiple) {
      if (!selected.length) return placeholder;
      if (selected.length === 1) {
        return options.find((option) => option.value === selected[0])?.label || selected[0];
      }
      return `${selected.length} selected`;
    }
    return options.find((option) => option.value === selected)?.label || placeholder;
  }, [multiple, options, placeholder, selected]);

  const visibleOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => option.label.toLowerCase().includes(term));
  }, [options, query]);

  function pick(optionValue) {
    if (multiple) {
      const next = selected.includes(optionValue)
        ? selected.filter((item) => item !== optionValue)
        : [...selected, optionValue];
      onChange(next);
      return;
    }
    onChange(optionValue);
    setOpen(false);
  }

  const isPlaceholder = multiple ? selected.length === 0 : !options.some((o) => o.value === selected);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-left text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
      >
        <span className={`truncate ${isPlaceholder ? 'text-white/35' : 'text-white'}`}>{triggerLabel}</span>
        <ChevronDown size={16} className={`shrink-0 text-white/45 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full z-[80] mt-3 overflow-hidden rounded-2xl border border-white/15 bg-[#0b1426] p-2 shadow-2xl shadow-black/45 backdrop-blur-xl ${menuClassName}`}
        >
          {searchable && (
            <div className="relative mb-2">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-300"
              />
            </div>
          )}

          <div className="pretty-scrollbar max-h-72 overflow-y-auto">
            {visibleOptions.length === 0 ? (
              <p className="px-4 py-3 text-sm text-white/45">No matches.</p>
            ) : (
              visibleOptions.map((option) => {
                const active = multiple ? selected.includes(option.value) : selected === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => pick(option.value)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-bold transition ${
                      active
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                        : 'text-white/75 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      {option.hint != null && (
                        <span className={`text-xs font-semibold ${active ? 'text-white/70' : 'text-white/40'}`}>
                          {option.hint}
                        </span>
                      )}
                      {multiple && active && <Check size={15} />}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {multiple && selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-1 w-full rounded-xl px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-white/45 transition hover:bg-white/10 hover:text-white"
            >
              Clear selection
            </button>
          )}
        </div>
      )}
    </div>
  );
}
