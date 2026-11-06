'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

/* ── SelectMenu — branded dropdown, no OS-native popup ────────────────────
 * A fully custom listbox that replaces <select> on the storefront: styled to
 * the theme, keyboard-operable, screen-reader correct, and animated.
 * Implements the WAI-ARIA listbox pattern (open on Enter/Space/ArrowDown,
 * arrow navigation, Home/End, type-ahead, Enter to select, Esc to close). */

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectMenuProps {
  value: string;
  onValueChange: (v: string) => void;
  options: SelectOption[];
  /** Accessible name announced to screen readers */
  label: string;
  id?: string;
  /** Tailwind classes for the trigger button */
  className?: string;
  /** Panel horizontal alignment relative to the trigger */
  align?: 'start' | 'end';
  disabled?: boolean;
}

export function SelectMenu({
  value,
  onValueChange,
  options,
  label,
  id,
  className = '',
  align = 'start',
  disabled = false,
}: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)));
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ str: '', ts: 0 });
  const listboxId = useId();

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  /* close on outside click */
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  /* keep the active option in view while navigating */
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  const commit = (idx: number) => {
    const opt = options[idx];
    if (!opt) return;
    if (opt.value !== value) onValueChange(opt.value);
    setOpen(false);
  };

  const move = (delta: number, e?: KeyboardEvent) => {
    e?.preventDefault();
    setActiveIdx((i) => {
      const next = Math.min(options.length - 1, Math.max(0, i + delta));
      return next;
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        setActiveIdx(Math.max(0, options.findIndex((o) => o.value === value)));
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown': move(1, e as unknown as KeyboardEvent); break;
      case 'ArrowUp': move(-1, e as unknown as KeyboardEvent); break;
      case 'Home': e.preventDefault(); setActiveIdx(0); break;
      case 'End': e.preventDefault(); setActiveIdx(options.length - 1); break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        commit(activeIdx);
        break;
      case 'Escape':
      case 'Tab':
        setOpen(false);
        break;
      default: {
        // type-ahead: jump to next option whose label starts with typed chars
        if (e.key.length === 1 && /[a-z0-9 ₹]/i.test(e.key)) {
          const now = Date.now();
          const keep = now - typeahead.current.ts < 900;
          const str = (keep ? typeahead.current.str : '') + e.key.toLowerCase();
          typeahead.current = { str, ts: now };
          const from = keep ? activeIdx + 1 : 0;
          const order = [...options.slice(from % options.length), ...options.slice(0, from % options.length)];
          const hit = order.findIndex((o) => o.label.toLowerCase().startsWith(str));
          if (hit >= 0) setActiveIdx((from + hit) % options.length);
        }
      }
    }
  };

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={label}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`flex cursor-pointer items-center justify-between gap-2 outline-none transition focus-visible:ring-2 focus-visible:ring-brand/50 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        <span className="truncate">{selected?.label ?? options[0]?.label ?? '—'}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-jaggery-2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={label}
            tabIndex={-1}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className={`absolute top-[calc(100%+6px)] z-50 max-h-64 min-w-full overflow-y-auto overscroll-contain rounded-2xl border border-line-warm bg-card p-1.5 shadow-[0_24px_48px_-16px_rgba(61,31,18,0.35)] ${
              align === 'end' ? 'right-0' : 'left-0'
            }`}
          >
            {options.map((o, i) => {
              const isSelected = o.value === value;
              const isActive = i === activeIdx;
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => commit(i)}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-[13.5px] font-semibold transition-colors ${
                      isActive ? 'bg-cream-2 text-ink' : 'text-ink/85'
                    } ${isSelected ? 'text-brand' : ''}`}
                  >
                    <span className="truncate">{o.label}</span>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-brand" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
