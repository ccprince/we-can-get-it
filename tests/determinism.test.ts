import { describe, expect, it } from 'vitest';
import { isRejected, takeCommand, view } from '../src/engine';
import type { Command, ContentSet, View } from '../src/engine';
import { aGalaxy, aMotifLane, aLocation, aStart, loadedContentSet } from './support/content';
import { started } from './support/campaign';

/**
 * Determinism is a test, not a convention: the measurement method this project
 * depends on is one seed played twice at two settings, and it is worthless the
 * moment the same seed and command sequence stop agreeing (ADR 0003 decision 1,
 * ADR 0009 decision 3).
 *
 * These hold the shape the harness and a save depend on: the input is a content
 * set, a seed and a command sequence, and replaying it is the whole of a save.
 * They began to bite with the **draw** (#11) — the galaxy itself now derives
 * from the seed, so a view replayed from one is a claim about the whole
 * campaign and not only about the clock. That the galaxy a seed gives is the
 * same galaxy every time is proved where it is drawn, in `draw.test.ts`.
 */
function play(content: ContentSet, seed: number, commands: readonly Command[]): View {
  let campaign = started(content, seed);
  for (const command of commands) {
    const result = takeCommand(campaign, command);
    if (isRejected(result)) throw new Error(result.rejected.message);
    campaign = result.campaign;
  }
  return view(campaign);
}

const SEQUENCE: readonly Command[] = [{ kind: 'wait' }, { kind: 'wait' }, { kind: 'wait' }];

/** A galaxy with somewhere to go, so a sequence can carry a departure (#9). */
function aFlyableGalaxy(): ContentSet {
  return loadedContentSet(
    aGalaxy({
      locations: [
        aLocation(),
        aLocation({ id: 'bellwether', name: 'Bellwether Yards', prose: 'A repair yard.' }),
      ],
      lanes: [aMotifLane({ ends: ['kestrel', 'bellwether'], distance: 12 })],
      start: aStart({ credits: 500 }),
    }),
  );
}

/** Out, across, and a day on the far side: a leg flown day by day. */
const A_JOURNEY: readonly Command[] = [
  { kind: 'depart', toId: 'bellwether' },
  { kind: 'wait' },
  { kind: 'wait' },
  { kind: 'wait' },
];

describe('determinism', () => {
  it('gives identical views for the same content set, seed and command sequence', () => {
    const content = loadedContentSet();

    expect(play(content, 20261022, SEQUENCE)).toEqual(play(content, 20261022, SEQUENCE));
  });

  it('gives identical views when the content set is loaded twice over', () => {
    expect(play(loadedContentSet(), 20261022, SEQUENCE)).toEqual(
      play(loadedContentSet(), 20261022, SEQUENCE),
    );
  });

  it('replays a command sequence that travels, which is also the save', () => {
    const content = aFlyableGalaxy();

    expect(play(content, 20261022, A_JOURNEY)).toEqual(play(content, 20261022, A_JOURNEY));
  });

  it('does not depend on a shared generator: two campaigns in one process agree', () => {
    const content = loadedContentSet();

    const first = play(content, 1, SEQUENCE);
    play(content, 2, SEQUENCE);
    const again = play(content, 1, SEQUENCE);

    expect(again).toEqual(first);
  });
});
