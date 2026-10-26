import { useEffect, useState } from 'react';

/**
 * PROTOTYPE — throwaway. A floating bar that flips between layout variants,
 * kept in `?variant=` so a variant is shareable and survives a reload. Hidden
 * outside the dev server.
 */
export type Variant = { readonly key: string; readonly name: string };

export function useVariant(variants: readonly Variant[]): [string, (key: string) => void] {
  const [current, setCurrent] = useState(
    () => new URLSearchParams(location.search).get('variant') ?? variants[0]!.key,
  );
  const choose = (key: string) => {
    const params = new URLSearchParams(location.search);
    params.set('variant', key);
    history.replaceState(null, '', `?${params.toString()}`);
    setCurrent(key);
  };
  return [current, choose];
}

const BAR =
  'fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full' +
  ' bg-fuchsia-300 px-4 py-2 font-sans text-sm text-black shadow-lg';

export function PrototypeSwitcher({
  variants,
  current,
  onChoose,
}: {
  readonly variants: readonly Variant[];
  readonly current: string;
  readonly onChoose: (key: string) => void;
}) {
  const at = Math.max(
    0,
    variants.findIndex((variant) => variant.key === current),
  );
  const step = (by: number) =>
    onChoose(variants[(at + by + variants.length) % variants.length]!.key);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable]')) return;
      if (event.key === 'ArrowLeft') step(-1);
      if (event.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!import.meta.env.DEV) return null;

  const variant = variants[at]!;
  return (
    <div className={BAR}>
      <button type="button" onClick={() => step(-1)} aria-label="Previous variant">
        ←
      </button>
      <span>
        {variant.key} ({variant.name})
      </span>
      <button type="button" onClick={() => step(1)} aria-label="Next variant">
        →
      </button>
    </div>
  );
}
