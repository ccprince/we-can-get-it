import type { Campaign } from './campaign';

/**
 * A command is one entry in the engine's deterministic input log: the engine is
 * deterministic for a given content set, seed and **command sequence**
 * (ADR 0003 decision 1, ADR 0005 decision 19). Every **action** is a command,
 * and so is buying a lot, which is not an action.
 */
export type Command = { readonly kind: 'wait' };

/**
 * Why a command was refused. A rejected command is a read the player gets, not
 * an exception, and it leaves the campaign untouched: no exceptions for player
 * error.
 */
export type Reason = {
  readonly code: 'not-a-command' | 'not-on-offer';
  readonly message: string;
};

export type CommandResult = { readonly campaign: Campaign } | { readonly rejected: Reason };

export function isRejected(
  result: CommandResult,
): result is { readonly rejected: Reason } {
  return 'rejected' in result;
}

/**
 * What the player may do. Where the player is supplies the menu (ADR 0005
 * decision 5); every campaign in the walking skeleton is at a location, and a
 * location so far offers only ending the day, so the answer does not yet vary
 * and this takes no campaign. Travel (#9) is what gives it one.
 *
 * It is one list, read by the page's menu and by `takeCommand`'s refusal, so
 * that what is offered and what is accepted cannot drift apart.
 */
export function offeredCommands(): readonly Command[] {
  return [{ kind: 'wait' }];
}

export function takeCommand(campaign: Campaign, command: Command): CommandResult {
  const kind = kindOf(command);
  if (kind === undefined) {
    return { rejected: { code: 'not-a-command', message: 'That is not a command.' } };
  }
  if (!offeredCommands().some((offered) => offered.kind === kind)) {
    return {
      rejected: { code: 'not-on-offer', message: `There is nothing here to ${kind}.` },
    };
  }

  // Waiting is ending the day, chosen one day at a time (ADR 0005 decision 7).
  return { campaign: endTheDay(campaign) };
}

/**
 * The kind of a command, or nothing if what arrived is not a command at all —
 * which a replayed command sequence from an older engine can be
 * (ADR 0009 decision 11).
 */
function kindOf(command: Command): Command['kind'] | undefined {
  const candidate: unknown = command;
  if (typeof candidate !== 'object' || candidate === null) return undefined;
  const kind: unknown = (candidate as { kind?: unknown }).kind;
  return kind === 'wait' ? 'wait' : undefined;
}

function endTheDay(campaign: Campaign): Campaign {
  return {
    ...campaign,
    day: campaign.day + 1,
    // One digest, at every day boundary (ADR 0005 decision 8). Nothing reaches
    // the player yet: the change budget is out of scope for this milestone.
    digest: { day: campaign.day, entries: [] },
  };
}
