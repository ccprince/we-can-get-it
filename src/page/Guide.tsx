import type { GuideEntryView, KnownView } from '../engine';

/**
 * The **trade guide**, as its own surface. Every location is on it, visited or
 * not, and nothing is filtered for relevance. The standing character says where
 * to start looking; what was seen is shown as last known, with its as-of date
 * and how old that makes it, so stale knowledge never reads as current.
 */
export function Guide({ entries }: { readonly entries: readonly GuideEntryView[] }) {
  return (
    <section className="mt-8">
      <h2 className="text-xs tracking-widest text-stone-500 uppercase">Trade guide</h2>
      <ul className="mt-2 space-y-4">
        {entries.map((entry) => (
          <li key={entry.name} aria-label={entry.name}>
            <p className="text-stone-200">{entry.name}</p>
            <p className="text-sm text-stone-400">
              Supplies {kinds(entry.standing.supplies)} · wants {kinds(entry.standing.demands)}
            </p>
            {entry.known === null ? (
              <p className="text-sm text-stone-500">Not yet visited.</p>
            ) : (
              <Known known={entry.known} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Known({ known }: { readonly known: KnownView }) {
  const current = known.daysAgo === 0;
  return (
    <div className="mt-1 text-sm">
      <p className={current ? 'text-stone-400' : 'text-amber-300'}>
        As of {known.asOf.label}
        {known.daysAgo === 0
          ? ' (today)'
          : `, ${known.daysAgo === 1 ? '1 day' : `${known.daysAgo} days`} ago`}
      </p>
      {known.corrections.length > 0 && (
        <ul aria-label="Corrections" className="text-amber-300">
          {known.corrections.map((correction) => (
            <li key={correction.text}>Corrected: {correction.text}</li>
          ))}
        </ul>
      )}
      <ul className="text-stone-300">
        {known.lots.map((lot) => (
          <li key={lot.good}>
            {lot.quantity} × {lot.good} ({lot.kind}) at {lot.price} credits
          </li>
        ))}
        {known.people.map((person) => (
          <li key={person.name}>
            {person.name}: {person.wants.map((want) => want.wording).join('; ')}
          </li>
        ))}
      </ul>
    </div>
  );
}

function kinds(kindIds: readonly string[]): string {
  return kindIds.length === 0 ? 'nothing' : kindIds.join(', ');
}
