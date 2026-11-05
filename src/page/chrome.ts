/** The chrome every button on the page wears; each adds its own padding. */
export const buttonChrome =
  'rounded border border-stone-600 text-stone-200 hover:border-stone-400 hover:bg-stone-800';

/** A good's name: dotted, so it reads as something to open without shouting over the row. */
export const goodNameChrome = [
  'text-left underline decoration-stone-600 decoration-dotted underline-offset-4',
  'hover:decoration-stone-400',
].join(' ');

/** The card a good's name opens, beside the name and over what follows it. */
export const goodCardChrome = [
  'absolute top-full left-0 z-10 mt-1 block w-72 max-w-[calc(100vw-2rem)]',
  'rounded border border-stone-600 bg-stone-900 p-3 shadow-lg',
  'text-sm font-normal whitespace-normal text-stone-300',
].join(' ');
