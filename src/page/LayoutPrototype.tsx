import { useState, type ReactNode } from 'react';
import type { Command, GuideEntryView, LaneView, View } from '../engine';
import { buttonChrome } from './chrome';
import { Guide } from './Guide';
import { PrototypeSwitcher, useVariant, type Variant } from './PrototypeSwitcher';
import { Hold, People, Shop } from './Trade';

/**
 * PROTOTYPE — throwaway. Three ways to split the crowded campaign screen,
 * switchable via `?variant=` on the existing page, beside the current layout:
 *
 *   current — today's single long page, for comparison
 *   A — tabs by information source: Here / Chart / Trade guide (the prototype's shape)
 *   B — by location: a list of every place, and the chosen one's whole story
 *   C — by task: Buy / Sell / Travel, each pulling in what the task needs
 *
 * Styling is untouched on purpose; only the arrangement is being judged.
 */
const VARIANTS: readonly Variant[] = [
  { key: 'current', name: 'Current single page' },
  { key: 'A', name: 'Tabs: Here / Chart / Guide' },
  { key: 'B', name: 'Location list + detail' },
  { key: 'C', name: 'Tasks: Buy / Sell / Travel' },
];

type Props = {
  readonly view: View;
  readonly seed: number;
  readonly refusal: string | null;
  readonly onCommand: (command: Command) => void;
};

export function LayoutPrototype({ current, ...props }: Props & { readonly current: ReactNode }) {
  const [variant, choose] = useVariant(VARIANTS);
  return (
    <>
      {variant === 'A' ? (
        <VariantA {...props} />
      ) : variant === 'B' ? (
        <VariantB {...props} />
      ) : variant === 'C' ? (
        <VariantC {...props} />
      ) : (
        current
      )}
      <PrototypeSwitcher variants={VARIANTS} current={variant} onChoose={choose} />
    </>
  );
}

// ---------------------------------------------------------------------------
// A — tabs by information source

function VariantA({ view, seed, refusal, onCommand }: Props) {
  const [tab, setTab] = useState<'here' | 'chart' | 'guide'>('here');
  return (
    <>
      <StatusBar view={view} refusal={refusal} onCommand={onCommand} />
      <Tabs
        tabs={[
          ['here', view.here === null ? 'Underway' : 'Here'],
          ['chart', 'Chart'],
          ['guide', 'Trade guide'],
        ]}
        current={tab}
        onChoose={setTab}
      />
      {tab === 'here' && (
        <>
          <Digest view={view} />
          <WhereProse view={view} />
          {view.here !== null && <Shop lots={view.here.lots} onCommand={onCommand} />}
          {view.here !== null && <People people={view.here.people} onCommand={onCommand} />}
          <Hold hold={view.hold} />
        </>
      )}
      {tab === 'chart' && <ChartByLocation view={view} onCommand={onCommand} />}
      {tab === 'guide' && <Guide entries={view.guide.entries} />}
      <Seed seed={seed} />
    </>
  );
}

/** The chart regrouped: departures from here first, then each place and its lanes. */
function ChartByLocation({ view, onCommand }: Pick<Props, 'view' | 'onCommand'>) {
  const fromHere = view.chart.lanes.filter((lane) => lane.destination !== null);
  return (
    <>
      <Section title={view.here === null ? 'Departures' : `Departures from ${view.here.name}`}>
        {view.here === null ? (
          <p className="text-stone-500">No departures while underway.</p>
        ) : (
          <LaneTable lanes={fromHere} from={view.here.name} onCommand={onCommand} />
        )}
      </Section>
      <Section title="Every place and its lanes">
        <ul className="space-y-3">
          {view.chart.locations.map((location) => (
            <li key={location.name}>
              <p className="text-stone-200">
                {location.name}
                {view.here?.name === location.name && (
                  <span className="text-stone-500"> — you are here</span>
                )}
              </p>
              <ul className="ml-4 text-sm text-stone-400">
                {lanesAt(view, location.name).map((lane) => (
                  <li key={lane.ends.join('–')}>
                    → {otherEnd(lane, location.name)}: {days(lane.days)}, {lane.fare} cr
                    {!lane.withinRange && <span className="text-stone-500"> (beyond range)</span>}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

// ---------------------------------------------------------------------------
// B — location list on the left, the chosen place on the right

function VariantB({ view, seed, refusal, onCommand }: Props) {
  const anchor = view.here?.name ?? view.transit?.destination ?? view.chart.locations[0]!.name;
  const [chosen, setChosen] = useState<string | null>(null);
  const selected = chosen ?? anchor;
  const entry = view.guide.entries.find((candidate) => candidate.name === selected);
  const isHere = view.here?.name === selected;

  return (
    // Breaks out of the page's narrow column so two panes fit.
    <div className="relative left-1/2 w-[min(64rem,calc(100vw-2rem))] -translate-x-1/2">
      <div className="grid grid-cols-[18rem_1fr] gap-8">
        <aside>
          <h1 className="text-xl text-stone-100">
            {view.here === null ? 'In transit' : view.here.name}
          </h1>
          <p className="mt-1 text-sm text-stone-400">
            {view.today.date.label} · {view.credits.credits} credits
          </p>
          {view.transit !== null && (
            <p className="mt-2 text-sm text-stone-300">
              Bound for {view.transit.destination}, {days(view.transit.daysToRun)} to run.
            </p>
          )}
          <Menu view={view} refusal={refusal} onCommand={onCommand} />

          <Section title="Places">
            <ul className="text-sm">
              {view.chart.locations.map((location) => {
                const lane = view.chart.lanes.find(
                  (candidate) => candidate.destination === location.name && view.here !== null,
                );
                return (
                  <li key={location.name}>
                    <button
                      type="button"
                      onClick={() => setChosen(location.name)}
                      className={`w-full px-2 py-1 text-left ${
                        location.name === selected
                          ? 'bg-stone-800 text-stone-100'
                          : 'text-stone-300 hover:bg-stone-900'
                      }`}
                    >
                      {location.name}
                      <span className="float-right text-stone-500">
                        {location.name === view.here?.name
                          ? 'here'
                          : lane === undefined
                            ? ''
                            : lane.withinRange
                              ? `${days(lane.days)} · ${lane.fare} cr`
                              : 'beyond range'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Section>
          <Hold hold={view.hold} />
          <Digest view={view} />
        </aside>

        <main>
          <h2 className="text-lg text-stone-100">{selected}</h2>
          {isHere && view.here !== null && (
            <>
              <p className="mt-2 leading-relaxed text-stone-300">{view.here.prose}</p>
              <Shop lots={view.here.lots} onCommand={onCommand} />
              <People people={view.here.people} onCommand={onCommand} />
            </>
          )}
          {!isHere && entry !== undefined && <GuideEntry entry={entry} />}
          <Section title="Lanes">
            <LaneTable lanes={lanesAt(view, selected)} from={selected} onCommand={onCommand} />
          </Section>
        </main>
      </div>
      <Seed seed={seed} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// C — tabs by task, each pulling in what that task needs

function VariantC({ view, seed, refusal, onCommand }: Props) {
  const [tab, setTab] = useState<'buy' | 'sell' | 'travel' | 'guide'>(
    view.here === null ? 'travel' : 'buy',
  );
  return (
    <>
      <StatusBar view={view} refusal={refusal} onCommand={onCommand} />
      <Digest view={view} />
      <Tabs
        tabs={[
          ['buy', 'Buy'],
          ['sell', 'Sell'],
          ['travel', 'Travel'],
          ['guide', 'Trade guide'],
        ]}
        current={tab}
        onChoose={setTab}
      />

      {tab === 'buy' &&
        (view.here === null ? (
          <Underway />
        ) : (
          <>
            <Shop lots={view.here.lots} onCommand={onCommand} />
            <Section title="Who wants these kinds">
              <ul className="space-y-1 text-sm text-stone-300">
                {[...new Set(view.here.lots.map((lot) => lot.kind))].map((kind) => (
                  <li key={kind}>
                    <span className="text-stone-200">{kind}</span>:{' '}
                    {view.guide.entries
                      .filter((entry) => entry.standing.demands.includes(kind))
                      .map((entry) => entry.name)
                      .join(', ') || 'nobody on the guide'}
                  </li>
                ))}
              </ul>
            </Section>
            <HoldLine view={view} />
          </>
        ))}

      {tab === 'sell' && (
        <>
          {view.here === null ? (
            <Underway />
          ) : (
            <People people={view.here.people} onCommand={onCommand} />
          )}
          <Hold hold={view.hold} />
          <Section title="Wanted elsewhere, last known">
            <ul className="space-y-1 text-sm text-stone-300">
              {view.guide.entries
                .filter((entry) => entry.name !== view.here?.name && entry.known !== null)
                .flatMap((entry) =>
                  entry.known!.people.map((person) => (
                    <li key={`${entry.name}/${person.name}`}>
                      <span className="text-stone-200">{entry.name}</span> · {person.name}:{' '}
                      {person.wants.map((want) => want.wording).join('; ')}{' '}
                      <span className="text-stone-500">({entry.known!.daysAgo}d old)</span>
                    </li>
                  )),
                )}
            </ul>
          </Section>
        </>
      )}

      {tab === 'travel' && (
        <>
          <WhereProse view={view} />
          {view.here !== null && (
            <Section title="Where you can go">
              <ul className="space-y-4">
                {view.chart.lanes
                  .filter((lane) => lane.destination !== null)
                  .map((lane) => {
                    const entry = view.guide.entries.find((e) => e.name === lane.destination);
                    return (
                      <li key={lane.ends.join('–')} className="border-t border-stone-800 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-stone-200">
                            {lane.destination}{' '}
                            <span className="text-sm text-stone-500">
                              {days(lane.days)} · {lane.fare} cr
                            </span>
                          </span>
                          <Departure lane={lane} onCommand={onCommand} />
                        </div>
                        {entry !== undefined && <GuideEntry entry={entry} />}
                      </li>
                    );
                  })}
              </ul>
            </Section>
          )}
          <details className="mt-8">
            <summary className="cursor-pointer text-xs tracking-widest text-stone-500 uppercase">
              The whole chart
            </summary>
            <ChartByLocation view={view} onCommand={onCommand} />
          </details>
        </>
      )}

      {tab === 'guide' && <Guide entries={view.guide.entries} />}
      <Seed seed={seed} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Small shared pieces (layout is each variant's own)

function StatusBar({ view, refusal, onCommand }: Omit<Props, 'seed'>) {
  return (
    <header className="sticky top-0 z-10 border-b border-stone-700 bg-stone-950 pt-2 pb-3">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-xl text-stone-100">
          {view.here === null ? 'In transit' : view.here.name}
        </h1>
        <p className="text-sm text-stone-400">
          {view.today.date.label} · {view.credits.credits} cr · hold {view.hold.used}/
          {view.hold.capacity}
        </p>
      </div>
      <Menu view={view} refusal={refusal} onCommand={onCommand} />
    </header>
  );
}

function Menu({ view, refusal, onCommand }: Omit<Props, 'seed'>) {
  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        {view.menu.offered.map((command) => (
          <button
            key={command.kind}
            type="button"
            onClick={() => onCommand(command)}
            className={`${buttonChrome} px-3 py-1 text-sm`}
          >
            {command.kind === 'wait' ? 'End the day' : command.kind}
          </button>
        ))}
      </div>
      {refusal !== null && <p className="mt-2 text-sm text-rose-300">{refusal}</p>}
    </div>
  );
}

function Tabs<T extends string>({
  tabs,
  current,
  onChoose,
}: {
  readonly tabs: readonly (readonly [T, string])[];
  readonly current: T;
  readonly onChoose: (tab: T) => void;
}) {
  return (
    <nav className="mt-4 flex gap-1 border-b border-stone-700">
      {tabs.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChoose(key)}
          className={`px-3 py-1.5 text-sm ${
            key === current
              ? 'border-b-2 border-stone-200 text-stone-100'
              : 'text-stone-500 hover:text-stone-300'
          }`}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

function WhereProse({ view }: { readonly view: View }) {
  if (view.here !== null)
    return <p className="mt-4 leading-relaxed text-stone-300">{view.here.prose}</p>;
  if (view.transit !== null)
    return (
      <p className="mt-4 leading-relaxed text-stone-300">
        {days(view.transit.daysOut)} out of {view.transit.from}, bound for{' '}
        {view.transit.destination} with {days(view.transit.daysToRun)} to run.
      </p>
    );
  return null;
}

function Digest({ view }: { readonly view: View }) {
  if (view.digest === null || view.digest.entries.length === 0) return null;
  return (
    <div className="mt-4 border-l-2 border-amber-700 pl-3 text-sm">
      <p className="text-stone-500">{view.digest.date.label}</p>
      <ul className="text-stone-300">
        {view.digest.entries.map((entry) => (
          <li key={entry.text}>{entry.text}</li>
        ))}
      </ul>
    </div>
  );
}

function HoldLine({ view }: { readonly view: View }) {
  return (
    <p className="mt-6 text-sm text-stone-400">
      Hold {view.hold.used}/{view.hold.capacity}
      {view.hold.cargo.length > 0 &&
        ': ' + view.hold.cargo.map((line) => `${line.quantity} × ${line.good}`).join(', ')}
    </p>
  );
}

function GuideEntry({ entry }: { readonly entry: GuideEntryView }) {
  return (
    <div className="mt-2 text-sm">
      <p className="text-stone-400">
        Supplies {entry.standing.supplies.join(', ') || 'nothing'} · wants{' '}
        {entry.standing.demands.join(', ') || 'nothing'}
      </p>
      {entry.known === null ? (
        <p className="text-stone-500">Not yet visited.</p>
      ) : (
        <>
          <p className={entry.known.daysAgo === 0 ? 'text-stone-400' : 'text-amber-300'}>
            As of {entry.known.asOf.label} ({entry.known.daysAgo}d ago)
          </p>
          <ul className="text-stone-300">
            {entry.known.lots.map((lot) => (
              <li key={lot.good}>
                {lot.quantity} × {lot.good} ({lot.kind}) at {lot.price} cr
              </li>
            ))}
            {entry.known.people.map((person) => (
              <li key={person.name}>
                {person.name}: {person.wants.map((want) => want.wording).join('; ')}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function LaneTable({
  lanes,
  from,
  onCommand,
}: {
  readonly lanes: readonly LaneView[];
  readonly from: string;
  readonly onCommand: (command: Command) => void;
}) {
  if (lanes.length === 0) return <p className="text-stone-500">No lanes.</p>;
  return (
    <table className="w-full text-left text-sm">
      <tbody>
        {lanes.map((lane) => (
          <tr key={lane.ends.join('–')} className="border-t border-stone-800">
            <td className="py-1.5 text-stone-300">{otherEnd(lane, from)}</td>
            <td className="py-1.5 text-right text-stone-300">{days(lane.days)}</td>
            <td className="py-1.5 text-right text-stone-300">{lane.fare} cr</td>
            <td className="py-1.5 pl-3 text-right">
              <Departure lane={lane} onCommand={onCommand} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Departure({
  lane,
  onCommand,
}: {
  readonly lane: LaneView;
  readonly onCommand: (command: Command) => void;
}) {
  if (!lane.withinRange) return <span className="text-stone-500">Beyond your range</span>;
  const depart = lane.depart;
  if (depart === null) return null;
  return (
    <button type="button" onClick={() => onCommand(depart)} className={`${buttonChrome} px-2 py-1`}>
      Depart
    </button>
  );
}

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 text-xs tracking-widest text-stone-500 uppercase">{title}</h2>
      {children}
    </section>
  );
}

function Underway() {
  return <p className="mt-6 text-stone-500">Nothing to trade while underway.</p>;
}

function Seed({ seed }: { readonly seed: number }) {
  return (
    <footer className="mt-10 border-t border-stone-800 pt-3 font-mono text-xs text-stone-600">
      seed {seed}
    </footer>
  );
}

function lanesAt(view: View, name: string): readonly LaneView[] {
  return view.chart.lanes.filter((lane) => lane.ends.includes(name));
}

function otherEnd(lane: LaneView, name: string): string {
  return lane.ends[0] === name ? lane.ends[1] : lane.ends[0];
}

function days(count: number): string {
  return count === 1 ? '1 day' : `${count} days`;
}
