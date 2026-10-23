import { dateOf, type CalendarDate } from './calendar';
import type { Campaign, DigestEntry } from './campaign';
import { offeredCommands, type Command } from './commands';

/**
 * Every surface renders a read model handed to it by one engine query, and the
 * view holds only view state (ADR 0009 decision 10). A read model carries
 * converted, player-facing values: if a surface needs a number, the query
 * returns that number.
 *
 * The page and the harness's policy receive this same object, which is what
 * makes what is measured what a player could have seen.
 */

/** Where the player is. */
export type HereView = {
  readonly name: string;
  readonly prose: string;
};

/** The day, as an index the engine counts in and the date the player reads. */
export type TodayView = {
  readonly day: number;
  readonly date: CalendarDate;
};

export type CreditsView = {
  readonly credits: number;
};

export type DigestView = {
  readonly day: number;
  readonly date: CalendarDate;
  readonly entries: readonly DigestEntry[];
};

/**
 * What is on offer, which is determined entirely by where the player is
 * (ADR 0005 decision 5). The commands, not their wording: the view words what
 * the engine returns (ADR 0003 decision 4).
 */
export type MenuView = {
  readonly offered: readonly Command[];
};

export type View = {
  readonly here: HereView;
  readonly today: TodayView;
  readonly credits: CreditsView;
  readonly digest: DigestView | null;
  readonly menu: MenuView;
};

export function view(campaign: Campaign): View {
  const { calendar, locations } = campaign.content;
  const here = locations.find((location) => location.id === campaign.locationId);
  if (here === undefined) {
    throw new Error(
      `the campaign is at ${campaign.locationId}, which the content set does not hold`,
    );
  }

  return {
    here: { name: here.name, prose: here.prose },
    today: { day: campaign.day, date: dateOf(calendar, campaign.day) },
    credits: { credits: campaign.credits },
    digest:
      campaign.digest === null
        ? null
        : {
            day: campaign.digest.day,
            date: dateOf(calendar, campaign.digest.day),
            entries: campaign.digest.entries,
          },
    menu: { offered: offeredCommands() },
  };
}
