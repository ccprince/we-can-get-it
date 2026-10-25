import { useState } from 'react';
import type { Command, HoldView, LotView } from '../engine';

const buttonChrome =
  'rounded border border-stone-600 px-2 py-1 text-stone-200 ' +
  'hover:border-stone-400 hover:bg-stone-800';

/**
 * What is on sale where the player is. The lots, their prices and the most the
 * player could buy all come from the engine; the only thing held here is how
 * many units the player has typed, which is view state (ADR 0009 decision 10).
 */
export function Shop({
  lots,
  onCommand,
}: {
  readonly lots: readonly LotView[];
  readonly onCommand: (command: Command) => void;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-xs tracking-widest text-stone-500 uppercase">For sale</h2>
      {lots.length === 0 ? (
        <p className="mt-2 text-stone-500">Nothing is on sale here.</p>
      ) : (
        <table className="mt-2 w-full text-left text-sm">
          <thead className="text-xs tracking-wide text-stone-500 uppercase">
            <tr>
              <th className="py-1 font-normal">Good</th>
              <th className="py-1 font-normal">Kind</th>
              <th className="py-1 text-right font-normal">Left</th>
              <th className="py-1 text-right font-normal">Price</th>
              <th className="py-1 font-normal" />
            </tr>
          </thead>
          <tbody>
            {lots.map((lot) => (
              <LotRow key={lot.lot} lot={lot} onCommand={onCommand} />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/**
 * One lot, and a buy of it. The units default to one and are never capped
 * here: a buy the engine would refuse is still handed to it, so the player hears
 * the reason — the way a fare they cannot pay is refused at departure rather
 * than hidden.
 */
function LotRow({
  lot,
  onCommand,
}: {
  readonly lot: LotView;
  readonly onCommand: (command: Command) => void;
}) {
  const [units, setUnits] = useState('1');

  return (
    <tr className="border-t border-stone-800">
      <th scope="row" className="py-1.5 font-normal text-stone-300">
        {lot.good}
      </th>
      <td className="py-1.5 text-stone-400">{lot.kind}</td>
      <td className="py-1.5 text-right text-stone-300">{lot.quantity}</td>
      <td className="py-1.5 text-right text-stone-300">{lot.price}</td>
      <td className="py-1.5 pl-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={units}
            onChange={(event) => setUnits(event.target.value)}
            aria-label={`Units of ${lot.good}`}
            className="w-14 rounded border border-stone-700 bg-stone-900 px-1 py-0.5 text-stone-200"
          />
          <button
            type="button"
            aria-label={`Buy ${lot.good}`}
            onClick={() => onCommand({ kind: 'buy', lot: lot.lot, quantity: Number(units) })}
            className={buttonChrome}
          >
            Buy
          </button>
          <span className="text-xs text-stone-500">up to {lot.mostYouCanBuy}</span>
        </div>
      </td>
    </tr>
  );
}

/** The **hold**: how full it is, and what is in it. */
export function Hold({ hold }: { readonly hold: HoldView }) {
  return (
    <section className="mt-8">
      <h2 className="text-xs tracking-widest text-stone-500 uppercase">Hold</h2>
      <p className="mt-2 text-sm text-stone-400">
        {hold.used} of {hold.capacity} units
      </p>
      {hold.cargo.length === 0 ? (
        <p className="mt-1 text-stone-500">The hold is empty.</p>
      ) : (
        <ul className="mt-1 space-y-1 text-stone-300">
          {hold.cargo.map((line) => (
            <li key={line.good}>
              {line.quantity} × {line.good} ({line.kind})
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
