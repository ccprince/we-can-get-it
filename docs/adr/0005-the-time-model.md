# ADR 0005: Time is a day the player spends on people and distance, on one regular galaxy-wide calendar

**Status:** accepted, 2026-10-22
**Context:** `docs/design-overview.md` §4 chunk 2 (the question this settles), §6; `docs/prototype-findings.md`
§2.1, §2.2, §2.5; ADR 0001, ADR 0003, ADR 0004

## Context

ADR 0004 left time as **the blocking question**, and named exactly why: a commission's deadline, passage
work, a wasted jump and the daily burn are all denominated in days, and *a day did not yet mean anything*.
The only thing settled going in was that the full game's clock is days rather than the prototype's jumps,
plus ADR 0004 decision 20 — interruption is free and the day is the beat, with a short digest at the day
boundary.

The design pressure on this chunk comes from one sentence in findings §2.2, which is the sharpest
diagnosis in that document: **change the player can attribute to a cause reads as a living world at any
volume, and change they cannot reads as dice at any volume** — and its own proposed fix, that *if the full
game runs on days rather than jumps, shops have weekends, and an absence can be given a reason*. Calendars
and named local events are meant to be the **carriers** of the change budget rather than abstract event
kinds. So the time model is not bookkeeping; it is where cheap aliveness is bought.

Settled on 2026-10-22 in five rounds of questions. Every number this ADR mentions is explicitly a
measurement, per CLAUDE.md.

## Decision

### The clock

**1. The day is atomic.** The clock is a single integer day index and there is nothing underneath it — no
hours, no morning and afternoon, no clock time. Anything that feels like part of a day is modelled as *an
allowance of things you may do in a day* (decision 5), never as duration. A sub-day clock would be a
second time system the player has to read, and every reading surface in chunk 8 would then have to show
two units.

**2. One calendar, galaxy-wide, perfectly regular, and authored as content.** It has **years**, **months**
and **weeks**. A month is a whole number of weeks, a year a whole number of months; no leap days, no
remainders. An invented calendar has no reason to inherit Earth's mess, and a regular one lets the player
do date arithmetic in their head — which matters because decision 4 makes them do it constantly. Weekday
is therefore derivable from the day index alone, which is what makes "closed on the seventh" learnable
rather than something to look up. Per ADR 0003 the calendar arrives as **data** — week length, month
names, days per month, year length — and the validator checks the divisibility at load.

**3. Months name; weeks work; seasons are local and authored.** A **month** carries no mechanics
whatsoever: it exists so that a date has a sayable name, because decision 4 puts absolute dates in the
prose and "day 214" is an engine artifact, not something a patron says. The **week** is the cycle that
does work — closures (findings §2.2's weekends) and billing (decision 14). A **season** is
location-specific authored content asserted over the day index, not a unit the clock has.

The calendar is **uniform across the galaxy**. Orbits and rotational periods differ and may be described,
but they are scenery: there are no local calendars, no local days and no time zones. The cost of
modelling them is a conversion the player performs on every date they read, in a game whose central bet is
already arithmetic.

**4. Dated things are stated as absolute dates.** A commission's deadline, an offer's window, a
wind-down, a notice — all dates, in the model and in the prose. Dates are comparable to each other
without arithmetic, which is what the acceptance decision of ADR 0004 decisions 9 and 10 is made of:
several differently-dated standing offers weighed against routes whose cost is also in days. "In N days"
is a view-layer convenience over a date, never the stored thing.

### The day

**5. One day loop, and where you are supplies the menu.** A day grants an allowance of **actions**. What
is *on offer* is determined entirely by where the player is: a location offers calling on someone, asking
around, chasing an introduction; a leg of a route offers the ship and the player's own work. The engine's
day loop does not special-case travel. This is one concept rather than two, so the allowance is one number
to measure, the reading surface is the same everywhere, and a transit event can work by **putting
something on the menu that would not ordinarily be there** rather than by being its own subsystem.

**6. Trade is not an action.** Looking at lots, prices, buying, selling, filling an order — all free
within the day, outside the allowance. **Time is what the player spends on people and on distance, and
never on shopping.** The prototype's most-played shape was the outbound fill (findings §2.1), and taxing
it would tax the thing the player does most and enjoys. Meanwhile making *people* cost days is what gives
the visit a price in the campaign's own currency — which is the lever chunk 6's open question needs, since
a visit that costs nothing becomes a formality — and it makes ADR 0004's **depth** axis ("the commission
is three introductions long") expensive in the same unit deadlines are written in, so breadth, depth and
distance all bite one clock.

**7. Waiting is ending the day, chosen one day at a time.** There is no "wait twelve days" and no
wait-until-X. The player ends today; tomorrow they decide again. This removes an entire concept from the
engine — there are no interrupt predicates to define, validate or tune, and no question of what ought to
break a wait, because the player makes that judgement in the moment with the digest in front of them.
It also means sitting on a rock doing nothing is mildly tiresome, which is correct: it should be.

**8. One digest, at every day boundary.** Not a separate arrival digest. The digest's content is simply
whatever counted-on change (ADR 0001) has reached the player: at a location, current news; in transit,
near-empty — the ship and the player's own doings; on landing after six days dark, the whole span at once.
One concept whose content varies by where the player is, which is the same move as decision 5, and it
means a ten-minute sitting ends on the same beat wherever the player happens to be.

### Distance

**9. A journey costs a route-dependent number of days, fixed at departure.** Not one day per move. A
uniform cost makes the map a bare adjacency graph and throws away the cheapest source of the thing
findings §2.1 says the prototype most lacked — *a jump that can be wasted*, where "a jump that costs more
than a turn" is one of the two named levers. Variable cost also gives ADR 0004's **distance** axis
something to be, and lets a deadline be tight without being arbitrary. Reach — bought with credits, ADR
0004 decision 15 — is what shortens a route.

**Fixed at departure** is provisional, pending the design of transit events (see open questions). It is
the default because a route's cost being a promise rather than an estimate is what makes a tight deadline
a *reading* of the galaxy rather than a gamble on the vacuum, which is the epistemic bet ADR 0004 decision
7 asks for.

**10. Transit is a place, played day by day.** A multi-day haul is not one atomic act that lands the
player later; each day in the black is a day, with the thin menu of decision 5 — maintain the ship,
research, work over what is aboard — and with its own event surface. The destination cannot be changed
once underway. Transit events are deferred in detail; what is settled here is that they are part of why
in-transit time is played day by day rather than skipped.

**11. The player is out of contact in transit.** Galaxy news does not reach the ship. Local events do.
What was happening out there arrives as one span in the digest on landing (decision 8). This makes the
staleness that decision 12 creates something the player can *feel* — "I have been dark for six days" —
rather than merely suffer, and it keeps a transit day quiet without making it five days of irrelevant
noise. It also gives **standing arrangements** another honest job: an information service that gets
counted-on news through to the ship in the black buys away friction and touches neither cargo nor access,
which is exactly what ADR 0004 decision 16 says an arrangement is for.

### Pressure

**12. The change budget is per day, galaxy-wide, and it runs in transit.** ADR 0001's budget is literally
`changesPerJump`; it re-denominates to per day. The consequence is the substantive part: a six-day haul is
six days of change the player did not watch. Distance therefore costs **knowledge**, not merely days —
landing on a market whose reading is a week old is precisely the uncertainty ADR 0004 decision 7 wants the
campaign bet made of. The announcement rule is untouched: only counted-on change is announced, so a long
trip produces a digest of what the player was relying on, not a changelog.

**13. Everything the player knows carries the date it was learned.** Contacts, last-known prices, the
trade guide's readings, a lead. Shown, as an as-of date. It costs almost nothing and it makes the central
bet legible, because a price from eleven days ago and a price from yesterday are different kinds of fact
and the campaign turns on the player judging exactly that. Nothing is hidden, greyed or filtered for being
old — findings §2.2 forbids relevance filtering, and the player decides what counts as stale.

**14. There is no baseline burn. The burn is a daily rate, billed weekly, in advance.** Zero standing
arrangements means zero daily cost: no ship upkeep, no food, no berth fee unless a berth was bought. ADR
0004 decision 16's claim is that the daily burn is a number the player **chose**, and a baseline is a
slow-acting loan by another name — the exact pressure shape ADR 0004 rejected, and one that worsens the
broke player's position while they are working to fix it, pushing toward the stranded state decision 13
of that ADR exists to forbid. Time's cost is opportunity and dates, never a meter running.

The arrangements the player does buy are **quoted as a daily rate** — so burn is directly comparable to a
six-day haul or a nine-day deadline, in the unit everything else is in — and **charged a week in advance**
at the week boundary. Specifically:

- **Prepaid, so nothing can ever put the player in debt.** The question is always "can I afford next
  week", asked at a predictable boundary, never "I owe for days I have already had". There is no loan in
  this game and nothing accrues against the player.
- **Non-payment lapses the arrangement**, announced in that day's digest in the provider's own words —
  attributable per findings §2.2, and the right consequence: the galaxy gets less convenient, never
  harder.
- **Cancelling ends renewal.** The player keeps it to the end of the week they paid for, because they paid
  for it. Churn gains nothing, because a week is the minimum unit of purchase either way.
- **A mid-week purchase is pro-rated** at the daily rate to the next week boundary, then full weeks after.
  Otherwise the sixth day of a week is a trap, and a trap sprung by a calendar the player did not choose is
  the worst kind.

**15. A commission fails at the end of the stated day, and never before.** Delivery means being at the
named destination with the goods on or before that date. The engine does **not** pre-empt by computing
that the player can no longer make it: that estimate is the player's under ADR 0004 decision 7, and an
engine that announces the bet is already lost has answered the player's riddle, which findings §4 makes a
hard constraint. It also forecloses the desperate run that works, which is the best thing a deadline can
produce. The patron's drop lands in that day's digest in his own words, per ADR 0004 decision 11.

**16. Nothing takes a day from the player without naming its date first.** Involuntary day costs —
a closed berth, a quarantine, a strike — exist, are budgeted like any other change, and come in three
beats, the shape findings §2.2 proved for absences, pointed at the map:

1. **Rumour.** Unrest at the yards, a tariff dispute, weather building. Undated, uncertain, and it may
   come to nothing. This is the beat the player *reads* rather than is told, so it rewards attention and
   keeps the bet epistemic; it belongs on the trade guide rather than in the announcement feed. A rumour
   that fizzles is important — it is what makes reading rumours a skill rather than a lookup.
2. **Notice.** It firms into a dated fact: the berth closes on the fourth. This is the beat that makes the
   delay routable-around, and it is what stops a day cost ever reading as dice.
3. **Effect.** It bites, on the day it said.

Days are now the currency deadlines are written in, so an unannounced four-day delay three days out from
a date is the purest form of change that "reads as dice at any volume" — and worse than a bad price,
because it can reach the loss condition.

**17. Schedules are a separate tier from events: published, repeating, and exploitable.** Some rhythms are
simply true and always were — this market closes the seventh of every week; this world's festival falls on
the same days every year and triples what moves through it; that run's shipping cycle lands the good stuff
on a known day. The player who learns the calendar can **plan against it**: be there the day before the
festival, not the day after. Schedules cost nothing from the change budget and are always true; the budget
spends on **events**, which are one-off, attributable, and announced by decision 16's three beats.

This is load-bearing beyond flavour. ADR 0004 decision 19 says nothing carries between campaigns but the
player's own understanding, and that it must be of the galaxy's **grammar** rather than its **facts**. A
published repeating calendar is grammar: learned in the first campaign and still true in the ninth even
though the galaxy was redrawn, because the rhythm is a rule while the particulars are a draw. A calendar
that only supplied reasons after the fact would throw that away.

**18. Passage work is a class of order: paid in advance, cargo supplied.** Not a separate mechanism with
its own time cost. ADR 0004 decision 5 settles that there is one transaction path, and a "work four days
for sixty credits" subsystem invented purely to solve brokenness would be a second one. As an order, its
day cost simply *is* the journey, and it has a destination and a date like any other.

What is paid at the counter is **passage and postage**, so the class is **passengers and mail**:

- **Mail** takes negligible space, pays worst, and is always on offer everywhere within the baseline
  ship's capacity. This is the actual floor under ADR 0004 decision 13's guarantee that **there is no
  stranded state**, and the validator can check it. A guarantee resting on passenger berths would strand
  any ship that had none.
- **Passengers** need berths, pay better, and berth space is a reach upgrade (ADR 0004 decision 15) where
  volume makes badly-paid work worth doing.
- **Freight supplied by someone else and paid on delivery does not exist at all.** Cargo the player did
  not buy is always pre-paid carriage; cargo the player bought is always sold on arrival. Two shapes, no
  third. A consignment system would be a third transaction path for no gain, and it would let a broke
  player haul value without capital — the exact hole passage work is scaled to be a deliberately bad
  answer to.

### Vocabulary

**19. `action`, `act` and `command sequence` are three different things.** Three concepts were competing
for two words, one of them inside ADR 0003.

- **action** — the thing the player does that spends part of a day. The day's allowance is of these
  (decision 5). New term; the one the player feels.
- **act** — unchanged: the tier of the ladder (ADR 0004 decision 3).
- **command sequence** — ADR 0003's deterministic input log, renamed from *action sequence*. The engine is
  deterministic for a given content set, seed and command sequence.

The last one matters because of decision 6: buying a lot is a command the engine records and replays, and
it is **not** an action, because it spends no day. Had both senses kept one word, "trade is free but is
still an action" would be a sentence needing permanent explanation.

## Rejected alternatives

- **A sub-day clock** — hours, or morning/afternoon. Decision 1. A second unit on every reading surface,
  to buy a precision nothing in the design asked for.
- **The day as a pure container**, where travel and deliberate waiting are the only things that pass time
  and everything at a location is free. Rejected because it leaves the visit costless, which is what
  chunk 6 says turns it into a formality, and it makes **depth** cheap while **distance** is expensive.
- **The day as a full budget**, where every act including commerce costs time. A whole second economy, and
  it taxes the outbound fill — the most-played shape in the prototype and the one the designer named as
  the thing done right (findings §2.1).
- **`wait until`, with engine-side interrupt conditions.** Decision 7. It obliges the engine to decide
  what *ought* to break a wait, which is a tuning surface and a validation surface for a judgement the
  player is better placed to make daily; and a wait that runs through the wrong event teaches the player
  not to use it.
- **A journey as one atomic act that lands the player days later.** Rejected in favour of decision 10: a
  six-day haul with nothing in it is six days of nothing, and transit events need somewhere to happen.
- **Day-by-day galaxy digests while in transit.** Decision 11. Five digests about places the player cannot
  reach is noise of exactly the kind findings §2.2 warns about; withholding them until landing turns the
  same information into the cost of distance.
- **A baseline daily burn** — upkeep, food, berth fees. Decision 14; a loan with extra steps.
- **Billing arrangements at the day boundary, cancellable immediately.** The first answer here, and
  wrong: it invites cycling a berth on and off, and it makes the burn a meter rather than a commitment.
  Weekly prepayment kills the churn, gives the week a second job, and guarantees no debt.
- **Pre-emptive deadline failure** when the commission becomes unreachable. Decision 15. The engine would
  be answering the player's riddle, and the desperate run that works would become impossible.
- **Unannounced delays** — a strike discovered on arrival. Decision 16. A living galaxy is a strike you
  can route around; a surprise one is a tax, and it is the one kind of randomness that can reach the loss
  condition.
- **A calendar that only supplies reasons**, with nothing in it learnable in advance. Decision 17. It is
  the cheaper build and it discards the best answer available to ADR 0004 decision 19's requirement that
  cross-campaign knowledge be grammar rather than facts.
- **Local calendars, local days, time zones.** Decision 3. Differing orbits are real and may be described;
  making them mechanical buys a conversion the player performs on every date they read.
- **Passage work as a block of committed days** — "four days' hauling, paid in advance". The first answer,
  and it broke ADR 0004 decision 5's one-transaction-path rule by inventing a second mechanism. Decision
  18 gets the same effect out of the order that already exists.
- **Consigned freight paid on delivery.** Decision 18.

## Consequences

- **The map (chunk 3) is now the blocking question**, and it inherits a specific job: decision 9 makes
  route length in days a property of the topology, so the map is where "a jump can be wasted" and ADR
  0004's **distance** axis are actually built. Overview §6 is updated accordingly.
- **ADR 0003 is amended**: *action sequence* becomes *command sequence* (decision 19). One line; the
  determinism requirement is unchanged.
- **ADR 0004 decision 16 is amended in wording**: a standing arrangement is a **daily rate billed weekly
  in advance**, not a cost deducted daily (decision 14). The intent — the burn is a number the player
  chose — is unchanged and is what drove the amendment.
- **ADR 0001 is re-denominated**: `changesPerJump` becomes a per-day budget (decision 12). Volume and
  split are still each one number, and still do not move when the content grows.
- **The validator gains jobs** (chunk 9): the calendar's divisibility (decision 2), that every location
  always offers mail within baseline capacity (decision 18), and that a schedule's dates are expressible
  over the day index (decision 17).
- **The content pipeline gains a kind of content it did not have**: schedules and seasons, authored per
  location over the day index, plus the rumour-notice pairs of decision 16. The cross-product tool has to
  be able to show a writer what a location's year looks like.
- **Chunk 8's reading surfaces gain the as-of date** (decision 13) and the digest (decision 8) as
  first-class surfaces, and the trade guide gains the rumour tier (decision 16, beat 1) — which is the
  first thing it carries that is explicitly *not* a current fact.
- **The numbers this hands to measurement**, none of them decidable here: actions per day; days per
  journey and the spread between the shortest and longest route; week, month and year lengths; how many
  days a commission's deadline allows; how long an offer stands; what mail and passengers pay and what a
  berth costs; the daily rates arrangements are quoted at; how far ahead a rumour precedes its notice and
  a notice its effect.

## Open questions this deliberately leaves

Recorded so they are not mistaken for settled, and so the tension in each is visible when it is picked up.

- **Transit events, in full** (decision 10). What they are, how often, and what they may touch. The
  tension to resolve: ADR 0004's structure says no single decision should be able to kill a campaign, and
  deep-space randomness pushes directly against that. Two sub-questions hang off it — whether an event may
  ever move a journey's length, which decision 9 provisionally says no to, and whether an event may take
  **cargo**, which is the harshest thing available in this model and sits against ADR 0004 decision 12's
  rule that failure costs opportunity and never capability.
- **Whether the rumour tier over-warns** (decision 16). Giving every delay a dated notice may rob of
  suddenness some events that ought to be sudden. The rule as written is absolute on purpose, because the
  alternative is worse; whether some class of event should be exempt is a live question.
