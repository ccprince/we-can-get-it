import { useState } from 'react';
import type {
  Command,
  HoldView,
  LotView,
  MailOfferView,
  MatchView,
  OrdersView,
  OrderTermsView,
  PersonView,
} from '../engine';
import { buttonChrome } from './chrome';

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
            className={`${buttonChrome} px-2 py-1`}
          >
            Buy
          </button>
          <span className="text-xs text-stone-500">up to {lot.mostYouCanBuy}</span>
        </div>
      </td>
    </tr>
  );
}

/**
 * Who is here and what each is after, said plainly. Under each want sits every
 * good in the hold with the **tier** it would earn and what it would be paid,
 * before the player commits; a refused good shows the buyer's own words.
 */
export function People({
  people,
  onCommand,
}: {
  readonly people: readonly PersonView[];
  readonly onCommand: (command: Command) => void;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-xs tracking-widest text-stone-500 uppercase">People here</h2>
      {people.length === 0 ? (
        <p className="mt-2 text-stone-500">Nobody is here.</p>
      ) : (
        people.map((person) => (
          <div key={person.name} className="mt-3">
            <h3 className="text-stone-200">{person.name}</h3>
            {person.wants.length === 0 && (
              <p className="text-sm text-stone-500">Is after nothing more.</p>
            )}
            <ul className="space-y-2">
              {person.wants.map((want) => (
                <li key={want.want} className="text-sm text-stone-300">
                  <span className={want.register === 'vague' ? 'italic' : undefined}>
                    {want.wording}
                  </span>{' '}
                  ({want.wanted})
                  {want.order !== null && <OrderTerms order={want.order} onCommand={onCommand} />}
                  <ul className="mt-1 ml-4 space-y-1">
                    {want.matches.map((match) => (
                      <Match key={match.good} match={match} onCommand={onCommand} />
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

/**
 * One good aboard against a want. The units default to one and are never capped
 * here, as in the shop: a sale the engine would refuse is still handed to it, so
 * the player hears the reason.
 */
function Match({
  match,
  onCommand,
}: {
  readonly match: MatchView;
  readonly onCommand: (command: Command) => void;
}) {
  const [units, setUnits] = useState('1');
  const { verb } = match;

  return (
    <li className="flex items-center gap-2 text-stone-400">
      <span>
        {match.good}: {match.tier}
        {match.offer !== null && `, ${match.offer} credits each`}
        {match.reason !== null && ` — “${match.reason}”`}
        {match.failedTerm !== null && ' — close, but not quite what they asked for'}
      </span>
      <input
        type="number"
        min={1}
        value={units}
        onChange={(event) => setUnits(event.target.value)}
        aria-label={`Units of ${match.good} to ${verb}`}
        className="w-14 rounded border border-stone-700 bg-stone-900 px-1 py-0.5 text-stone-200"
      />
      <button
        type="button"
        aria-label={`${verb === 'sell' ? 'Sell' : 'Fill with'} ${match.good}`}
        disabled={!match.available}
        onClick={() => onCommand({ kind: verb, ...match.sale, quantity: Number(units) })}
        className={`${buttonChrome} px-2 py-0.5 text-xs`}
      >
        {verb === 'sell' ? 'Sell' : 'Fill'}
      </button>
      <span className="text-xs text-stone-500">up to {match.mostYouCanSell}</span>
    </li>
  );
}

/** The mail on offer, one consignment a lane, or the mail already aboard. */
export function Mail({
  offers,
  aboard,
  onCommand,
}: {
  readonly offers: readonly MailOfferView[];
  readonly aboard: string | null;
  readonly onCommand: (command: Command) => void;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-xs tracking-widest text-stone-500 uppercase">Mail</h2>
      {aboard !== null ? (
        <p className="mt-2 text-sm text-stone-400">You are carrying mail for {aboard}.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm text-stone-300">
          {offers.map((offer) => (
            <li key={offer.to}>
              To {offer.to}, {days(offer.days)}: {offer.advance} credits in advance
              <button
                type="button"
                onClick={() => onCommand(offer.take)}
                className={`${buttonChrome} ml-2 px-2 py-0.5 text-xs`}
              >
                Take
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function days(count: number): string {
  return count === 1 ? '1 day' : `${count} days`;
}

/** An order's stated terms, and the way to take it on. */
function OrderTerms({
  order,
  onCommand,
}: {
  readonly order: OrderTermsView;
  readonly onCommand: (command: Command) => void;
}) {
  const { accept } = order;
  return (
    <span className="ml-2 text-amber-300">
      order: {order.price} credits each, open to {order.by.label}
      {order.daysLeft === 0 ? ' (last day)' : ` (${order.daysLeft} more days)`}
      {accept !== null && (
        <button
          type="button"
          onClick={() => onCommand(accept)}
          className={`${buttonChrome} ml-2 px-2 py-0.5 text-xs`}
        >
          Accept
        </button>
      )}
    </span>
  );
}

/** The orders the player has taken on, wherever they are to be filled. */
export function Orders({ orders }: { readonly orders: OrdersView }) {
  return (
    <section className="mt-8">
      <h2 className="text-xs tracking-widest text-stone-500 uppercase">Orders</h2>
      {orders.accepted.length === 0 ? (
        <p className="mt-2 text-stone-500">You have taken on no orders.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm text-stone-300">
          {orders.accepted.map((order) => (
            <li key={order.want}>
              {order.buyer} at {order.where} {order.wording} ({order.wanted}): {order.price} credits
              each, by {order.by.label}
            </li>
          ))}
        </ul>
      )}
    </section>
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
