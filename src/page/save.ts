import {
  isRejected,
  startCampaign,
  takeCommand,
  type Campaign,
  type Command,
  type ContentSet,
  type Reason,
} from '../engine';

/**
 * A save is a seed and a command sequence, and never a galaxy (ADR 0009
 * decision 11, GLOSSARY **draw**). It is the harness's input shape, so resuming
 * one is the harness's code path: `startCampaign`, then `takeCommand` once per
 * command, and no restore logic of its own.
 */
export type Save = {
  readonly seed: number;
  readonly commands: readonly Command[];
};

const KEY = 'we-can-get-it/campaign';

/**
 * What a save replays to: the campaign, or the command the engine refused,
 * counted from one, and why. A refusal stops the replay rather than skipping
 * the command, since every command after it was taken against a campaign that
 * had it.
 */
export type Resumed =
  | { readonly campaign: Campaign }
  | { readonly rejected: Reason; readonly at: number; readonly of: number };

export function resume(content: ContentSet, save: Save): Resumed {
  let campaign = startCampaign(content, save.seed);
  for (const [index, command] of save.commands.entries()) {
    const result = takeCommand(campaign, command);
    if (isRejected(result)) {
      return { rejected: result.rejected, at: index + 1, of: save.commands.length };
    }
    campaign = result.campaign;
  }
  return { campaign };
}

/**
 * What the page found where it keeps its save. Something stored that is not a
 * save comes back as it was stored, so the page can show it rather than lose
 * it. Whether its commands are commands is the engine's to say, on replay.
 */
export type Found =
  | { readonly kind: 'none' }
  | { readonly kind: 'save'; readonly save: Save; readonly stored: string }
  | { readonly kind: 'not-a-save'; readonly stored: string };

export function readSave(): Found {
  const stored = storedSave();
  if (stored === null) return { kind: 'none' };
  const save = parse(stored);
  return save === null ? { kind: 'not-a-save', stored } : { kind: 'save', save, stored };
}

/**
 * What is stored, or null. Storage the page may not read is storage it cannot
 * write either, so it has no save to keep and none to overwrite: the campaign
 * opens new, and `writeSave` tells the player it is not being saved.
 */
function storedSave(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(stored: string): Save | null {
  let candidate: unknown;
  try {
    candidate = JSON.parse(stored);
  } catch {
    return null;
  }
  if (typeof candidate !== 'object' || candidate === null) return null;
  const { seed, commands } = candidate as { seed?: unknown; commands?: unknown };
  if (!Number.isSafeInteger(seed) || !Array.isArray(commands)) return null;
  return { seed: seed as number, commands: commands as Command[] };
}

/**
 * Write the save, answering with why it could not be written, or null. A
 * campaign that is not being saved is one a reload would lose, and the player
 * is told rather than finding out.
 */
export function writeSave(save: Save): string | null {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
    return null;
  } catch (trouble) {
    return `This campaign is not being saved, so a reload would lose it: ${String(trouble)}`;
  }
}
