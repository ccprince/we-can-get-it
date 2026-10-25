import {
  isRejected,
  startCampaign,
  takeCommand,
  type Campaign,
  type Command,
  type ContentSet,
} from '../../src/engine';

/**
 * A campaign started, for the tests whose subject is the campaign rather than
 * the draw. A fixture that will not draw is a broken fixture, so this throws
 * rather than returning a verdict — the way `loadedContentSet` does for a
 * fixture that will not load.
 */
export function started(content: ContentSet, seed: number): Campaign {
  const result = startCampaign(content, seed);
  if (!result.ok) {
    throw new Error(`fixture content set did not draw: ${JSON.stringify(result.problems)}`);
  }
  return result.campaign;
}

/**
 * The campaign a sequence of commands leaves, for the tests that expect every
 * one of them to be taken. A refusal is a broken fixture, so this throws.
 */
export function after(campaign: Campaign, ...commands: readonly Command[]): Campaign {
  return commands.reduce((current, command) => {
    const result = takeCommand(current, command);
    if (isRejected(result)) throw new Error(result.rejected.message);
    return result.campaign;
  }, campaign);
}
