import { describe, expect, it } from 'vitest';
import { isRejected, startCampaign, takeCommand, view } from '../src/engine';
import type { Command, ContentSet, View } from '../src/engine';
import { loadedContentSet } from './support/content';

/**
 * Determinism is a test, not a convention: the measurement method this project
 * depends on is one seed played twice at two settings, and it is worthless the
 * moment the same seed and command sequence stop agreeing (ADR 0003 decision 1,
 * ADR 0009 decision 3).
 */
function play(content: ContentSet, seed: number, commands: readonly Command[]): View {
  let campaign = startCampaign(content, seed);
  for (const command of commands) {
    const result = takeCommand(campaign, command);
    if (isRejected(result)) throw new Error(result.rejected.message);
    campaign = result.campaign;
  }
  return view(campaign);
}

const SEQUENCE: readonly Command[] = [
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

  it('does not depend on a shared generator: two campaigns in one process agree', () => {
    const content = loadedContentSet();

    const first = play(content, 1, SEQUENCE);
    play(content, 2, SEQUENCE);
    const again = play(content, 1, SEQUENCE);

    expect(again).toEqual(first);
  });
});
