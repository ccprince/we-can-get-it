import { useEffect, useId, useRef, useState } from 'react';
import type { CargoView } from '../engine';
import { goodCardChrome, goodNameChrome } from './chrome';

/**
 * A good's name, which opens its prose. The prose is never on the page until
 * asked for: the trade guide is verbose already, and every good's words at once
 * would bury it (#144). A click, or Enter on the focused name, opens a card
 * beside it; Escape, or a click or focus elsewhere, closes it. Whether it is
 * open is view state (ADR 0009 decision 10).
 *
 * A click and not a hover, so it can be reached by keyboard and by touch, and
 * stays put while it is read. It is a disclosure, not a dialog: focus stays on
 * the name, which says what it controls.
 */
export function GoodName({ good }: { readonly good: Pick<CargoView, 'good' | 'prose'> }) {
  const [open, setOpen] = useState(false);
  const holder = useRef<HTMLSpanElement>(null);
  const card = useId();

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const closeOnElsewhere = (event: Event) => {
      if (!holder.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('mousedown', closeOnElsewhere);
    document.addEventListener('focusin', closeOnElsewhere);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('mousedown', closeOnElsewhere);
      document.removeEventListener('focusin', closeOnElsewhere);
    };
  }, [open]);

  return (
    <span ref={holder} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? card : undefined}
        onClick={() => setOpen((was) => !was)}
        className={goodNameChrome}
      >
        {good.good}
      </button>
      {open && (
        <span id={card} role="region" aria-label={good.good} className={goodCardChrome}>
          <span className="block text-stone-100">{good.good}</span>
          <span className="mt-1 block leading-relaxed">{good.prose}</span>
        </span>
      )}
    </span>
  );
}
