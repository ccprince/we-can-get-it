import {
  identify,
  isRejected,
  startCampaign,
  takeCommand,
  type Campaign,
  type Command,
  type ContentSet,
  type Problem,
  type Reason,
} from '../engine';

/**
 * A save is a seed, a command sequence and the identity of the content set it
 * was played on, and never a galaxy (ADR 0009 decision 11, GLOSSARY **draw**).
 * It is the harness's input shape, so resuming one is the harness's code path:
 * `startCampaign`, then `takeCommand` once per command, and no restore logic of
 * its own.
 */
export type Save = {
  /** What `identify` gave for the content set the campaign was played on. */
  readonly content: string;
  readonly seed: number;
  readonly commands: readonly Command[];
};

const KEY = 'we-can-get-it/campaign';

/**
 * What a save replays to: the campaign, the command the engine refused,
 * counted from one, and why, or nothing, because the save was played on a
 * different content set. A refusal stops the replay rather than skipping the
 * command, since every command after it was taken against a campaign that had
 * it. A different content set is refused before any replay: the same seed
 * draws a different galaxy on it, and every command may still be accepted. A
 * seed whose draw fails is the content set's defect, and comes back as its
 * problems.
 */
export type Resumed =
  | { readonly campaign: Campaign }
  | { readonly problems: readonly Problem[] }
  | { readonly rejected: Reason; readonly at: number; readonly of: number }
  | { readonly otherContent: true };

export function resume(content: ContentSet, save: Save): Resumed {
  if (save.content !== identify(content)) return { otherContent: true };
  const opened = startCampaign(content, save.seed);
  if (!opened.ok) return { problems: opened.problems };
  let campaign = opened.campaign;
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
  const { content, seed, commands } = candidate as {
    content?: unknown;
    seed?: unknown;
    commands?: unknown;
  };
  if (typeof content !== 'string' || !Number.isSafeInteger(seed) || !Array.isArray(commands)) {
    return null;
  }
  return { content, seed: seed as number, commands: commands as Command[] };
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
