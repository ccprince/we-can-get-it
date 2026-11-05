import { useEffect, useRef, useState } from 'react';

/**
 * A good's name, which opens its prose. The prose is never on the page until
 * asked for: the trade guide is verbose already, and every good's words at once
 * would bury it (#144). A click, or Enter on the focused name, opens a card
 * beside it; Escape or a click elsewhere closes it. Whether it is open is view
 * state (ADR 0009 decision 10).
 *
 * A click and not a hover, so it can be reached by keyboard and by touch, and
 * stays put while it is read.
 */
export function GoodName({ name, prose }: { readonly name: string; readonly prose: string }) {
  const [open, setOpen] = useState(false);
  const holder = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const closeOnClickElsewhere = (event: MouseEvent) => {
      if (!holder.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('mousedown', closeOnClickElsewhere);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('mousedown', closeOnClickElsewhere);
    };
  }, [open]);

  return (
    <span ref={holder} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={nameChrome}
      >
        {name}
      </button>
      {open && (
        <span role="dialog" aria-label={name} className={cardChrome}>
          <span className="block text-stone-100">{name}</span>
          <span className="mt-1 block leading-relaxed">{prose}</span>
        </span>
      )}
    </span>
  );
}

/** Dotted, so a name reads as something to open without shouting over the row. */
const nameChrome = [
  'text-left underline decoration-stone-600 decoration-dotted underline-offset-4',
  'hover:decoration-stone-400',
].join(' ');

const cardChrome = [
  'absolute top-full left-0 z-10 mt-1 block w-72 max-w-[calc(100vw-2rem)]',
  'rounded border border-stone-600 bg-stone-900 p-3 shadow-lg',
  'text-sm font-normal whitespace-normal text-stone-300',
].join(' ');
