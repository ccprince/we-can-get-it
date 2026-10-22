# ADR 0004: The campaign is one continuous game, won by a ladder of commissions and lost with the last patron

**Status:** accepted, 2026-10-22; decision 16 amended in wording 2026-10-22 by ADR 0005 (decision 14) — a
standing arrangement is a **daily rate billed a week in advance**, not a cost deducted daily. The intent,
that the burn is a number the player *chose*, is what drove the amendment and is unchanged.
**Context:** `docs/design-overview.md` §3 (the question this settles), `docs/prototype-findings.md` §2.1, §2.2, §2.3, §2.5, §4; ADR 0001, ADR 0002

## Context

Overview §3 named the shape of a session **"the single most consequential open question, and the one
unexamined assumption carried out of the prototype"**: the prototype was a sixteen-jump run against a
1,500-credit debt, every number of it void, and the *run itself* was never examined even though every
other part of the design is quietly scaled to it.

The designer's vision was "somewhere between a roguelike and a campaign", resolved in conversation on
2026-10-22 into two separable requirements:

- **Roguelike** in that *the world must be surprising*, with significant variability between plays —
  the game is being built for its designer to play repeatedly.
- **Campaign** in that *capabilities visibly progress*, there is an ultimate goal, and the game can be
  **won**.

Plus a shape requirement: a play spans many stretches at the keyboard, made of many small events, so
that "ten minutes, a couple of days' worth" and "an evening of digging in" are both good ways to sit
down.

This ADR records what that resolved into. Every number it mentions is explicitly a measurement, per
CLAUDE.md.

## Decision

### The units, and a retired word

**1. *Session* is retired from the vocabulary.** It was ambiguous between the unit of play and a stretch
at the keyboard, and overview §3's own question ("how long is one sitting, and how many sittings is a
whole thing?") is only askable once they are separate. The two words are **campaign** — one whole
winnable game — and **sitting** — one stretch at the keyboard, of which a campaign takes many. **Run**
survives as prototype history only, so its scale cannot come back in with the word.

**2. A campaign is continuous. Nothing resets inside it.** Not a campaign made of runs. Overview §3's
argument is decisive: warmth, access, introductions and leads were the standout mechanic of the whole
prototype (findings §2.3) and **their entire value is accumulation**; a mid-campaign reset caps the best
thing in the game at one sitting's worth and obliges the design to invent something else to carry the
fresh start. The roguelike requirement is about variability *between* campaigns, not resets *within* one.

**3. Episodic structure comes from acts, which gate rather than reset.** An **act** is a tier of the
ladder holding several commissions at one level of ambition; clearing it unlocks the next tier — bigger
patrons, further places, goods previously out of reach. Several rungs per act and not one, because this
project's own rule is that a shape needs **2–4 instances before it can be judged** (findings §2.4): a
one-commission act is an unrepeated experience the player cannot learn the grammar of and a play-test
cannot read.

### Winning

**4. The win is a delivery, not a balance.** A campaign is a **ladder** of commissions, ending in one
final commission that cannot be filled without most of the galaxy and most of the player's
relationships. Delivering it wins. A purely monetary goal is rejected outright by findings §2.5 — it
makes the look-back worthless and crowds out story, and a longer game needs that fixed *more*, not less.

**5. A commission is an order, not a new kind of transaction.** Findings §2.1 settles that the order is
*the* primary transaction and that it states its price; a commission is the largest kind — a patron's
job, stating what is wanted, where it goes, by when, and for what. One transaction path, not two.

**6. Difficulty has three axes, and price is not one of them**: **breadth** (a list — "one of every kind
of X", which leans on the tag system and needs the many-goods-per-kind-tag lever of findings §2.4),
**depth** (access — the holder will not deal with a stranger, so the commission is three introductions
long), and **distance** (a route the map makes awkward). They map onto chunks 4, 6 and 3, so a ladder
built from them exercises the whole game. The final commission demands all three at once.

**7. The offer is fully stated; the bet is on the galaxy.** The player is told the goods, the
destination, the date and the price. What they are *not* told, and what they are actually wagering on,
is whether this galaxy holds the thing, at a price they can pay, reachable in time. The uncertainty is
**epistemic, not random**: an estimate is only as good as the player's reading of the galaxy, which makes
the trade guide, contacts and last-known into the instruments the campaign is won and lost by (findings
§2.5, chunk 8) rather than conveniences.

**8. Commissions stay in the plain-voiced row** of the four want shapes. Vague wants remain the business
of characters and their own urges. Deliberate: the campaign's single loss condition must not sit on top
of the one content question still open (findings §4), or a rework of vague wants threatens the win.

**9. One commission at a time** — starting at a cap of exactly one. Without a cap the best play is to
accept everything and deliver whatever turns out to be fillable, and the acceptance decision degenerates.
With a cap the decision is *which of these, and is this one worth the slot*, which is the decision worth
having.

**10. Offers stand, visibly, and the galaxy can take them away.** Several offers stand at once with
visible windows, so a cap of one creates a choice rather than a queue; an offer can be **withdrawn**
before it is ever taken, because the patron found someone else or stopped needing it. A withdrawal costs
no standing. *The patron found someone else* is the galaxy competing with the player, which findings §2.2
identifies as the strongest aliveness signal commerce can produce on its own — the same mechanism as a
lot being **picked over**, applied to work.

### Losing

**11. Standing is the patron roster.** Not a score with patrons as flavour: standing **is** the named
list of patrons who will still deal with the player.

- **Failing a commission costs that patron.** The one whose job was dropped is the one who drops the
  player, in his own words. The loss is therefore perfectly attributable, which is what findings §2.2
  demands of all change: *change the player can attribute to a cause reads as a living world at any
  volume; change they cannot reads as dice at any volume.*
- **Clearing an act adds patrons**, at the new tier. The roster grows with success and shrinks with
  failure: a long list means the player picks the commission that fits his plans, a short one means the
  commissions drive his choices instead.
- **A vouch recovers one.** A character of real warmth stakes their own name and the lost patron takes
  the player back. Askable only of the very warm, **once per person ever**, and it **spends that
  warmth**. The number of recoveries available is therefore the number of deep relationships built —
  bounded without a counter, and paid for out of the spine of progression.
- **An empty roster ends the campaign.** Explicitly, with a look-back — not a drift into a galaxy where
  nothing is offered and the player works out over several sittings that they were finished long ago.

**12. Standing gates what is offered and nothing else.** It never worsens prices, cools warmth, closes
doors or touches the ship. A fallen player's galaxy gets **smaller, not harder**, so failure costs
opportunity and never capability — which is what makes a death spiral structurally impossible. A
shortening list of names is also its own unmissable warning.

**13. There is no bankruptcy loss, because there is no stranded state.** **Passage work** — badly paid,
slow, paid in advance, more plentiful at busy hubs than backwater outposts — is always available to get a
broke player off the rock. Being broke therefore costs **days**, and days are what an accepted commission
is made of: poverty reaches the loss condition through standing rather than being a second one. It cannot
become grind-to-win, because the supply of commissions is finite and perishable.

**14. Both endings get the same look-back**: the commissions filled and dropped, who vouched, who was
never reached, how far up the ladder. Since the win is a delivery, both endings are a story about what
the player did and did not manage to get for people — which is what findings §2.5 says a monetary goal
made impossible.

### Progression, variability and interruption

**15. Access is the spine of progression; credits are the scorekeeper.** Findings §2.3: *access is the
reward the player notices; money is the one they don't.* Reach — hold, range, speed, what a journey costs
— is the enabler, bought with credits. Licences and better knowledge surfaces are instruments of those
two, not ladders of their own.

**16. No firm and no management layer.** The plural in the game's title stays a **voice** — the boast of
somebody who knows people, not an org chart. Reach extends through **services** bought one at a time (a
courier for one delivery, a message carried, a load held) and **standing arrangements** bought on a
**daily rate billed a week in advance** (a broker on retainer, a berth, an information service). Both buy
away friction, never cargo and never access. The player remains the one doing things. The daily burn is therefore a
number the player *chose*, which is where large-scale pressure comes from instead of from a loan.

**17. A quest is non-transactional**: no price, no standing at stake, free to decline, paid purely in
access, information or warmth. It covers the favour, the errand, and the road to a vouch. The line that
keeps the word honest is the **absence of a price**, not the presence of steps — and it is what keeps the
prototype's relay failure from recurring, where a payoff in goods *"reads as free cargo, not as a lead"*
(findings §2.4).

**18. The cast is drawn once per campaign; only state moves within it.** Drawn at campaign start from a
reserve larger than one campaign can see: which locations exist and how they connect, which goods are in
circulation, which people are out there, **who is hidden**, and which patrons the ladder is built from.
Within the campaign what moves is state — wants, orders, stock, prices, who is away, what is known —
under the budget of ADR 0001. So the galaxy is *surprising* at the start of every campaign and
*trustworthy* within one, which is what makes learning it worth doing and what makes the trade guide's
authority mean something. It is also the direct fix for prospecting dying by the fourth prototype run
(findings §2.5).

**19. Nothing carries between campaigns except the player's own understanding.** No unlocks, no
persistent currency, no account-level anything. Unlocks would mean early campaigns are played at
deliberately reduced capability, which contradicts progression being the arc *within* a campaign; and
cross-campaign expertise must be about the galaxy's **grammar**, not its **facts**, or the game stops
being able to surprise its designer.

**20. Interruption is free, and the day is the beat.** State is committed after every action, so closing
the window mid-anything loses nothing — findings §2.5 records two play-test runs ending to the back
button, and ADR 0003's deterministic action-sequence engine makes this nearly free. A **day boundary with
a short digest** is what makes a ten-minute sitting feel finished rather than truncated, and it is also
the carrier findings §2.2 wants for attribution: shops have weekends, and an absence can be given a
reason.

## Rejected alternatives

Recorded because each is the obvious suggestion somebody will make again.

- **A campaign made of runs**, with a settling-up and partial reset between them. Caps accumulated
  access at one run's worth — see decision 2.
- **Permadeath on a single failure.** Out of scale with any one mistake in a campaign tens of sittings
  long, and it makes the short casual sitting dangerous. The requirement that *speculation must be able
  to lose* (findings §2.1) is satisfied entirely at the level of the individual bet, which is where it
  was fun.
- **No loss condition at all.** Considered and rejected by the designer: *"without a chance for loss,
  winning doesn't really matter"* — the NYT-puzzle reading, where Wordle's six guesses are the point and
  Strands' unlimited hints make the solve inevitable. A bound exists to force commitment **before**
  certainty.
- **Bankruptcy as its own loss state.** Collapses into decision 13; and an unnamed loss state (the
  player stranded with no action that earns passage) is the worst kind.
- **A global deadline, or a debt coming due.** This is the prototype's exact structural failure
  (findings §2.5): one place to settle up plus a hard jump limit meant every late sub-goal was judged by
  whether it ended near Dock Nine, and two of the first four runs were lost precisely there. Stretched
  over a campaign it would be that failure for weeks. Pressure is instead local, dated and attributable:
  a commission's date, a withdrawn offer, a wind-down, a depleting lot, a chosen daily burn.
- **Standing affecting prices, warmth or who will see the player.** The designer's objection, and it is
  correct: if losing standing degrades *capability*, failure compounds into failure and the player is out
  of the game long before they know it. Standing narrows opportunity only — decision 12.
- **Standing regained by ordinary good work.** Dissolves the bound into grind and makes the campaign
  Strands: a patient player always gets there. The only route up is a vouch, and it costs a relationship.
- **Meta-progression unlocks between campaigns** — decision 19.
- **A single campaign-wide settling-up or home station.** Each commission names its own delivery point at
  offer time, so a delivery is a journey the player *planned*, which is the "deliberate homecoming, not a
  positioning tax on the last third" that findings §2.5 asks for. The final commission is the one
  deliberate exception, designed as a homecoming because by then it has earned the weight.

## Consequences

- **The numbers this hands to measurement**, none of them decidable here: the starting size of the patron
  roster (too many names and nothing is at stake, too few and the campaign is fragile), the commission
  cap above one if it ever rises, rungs per act, the daily burn, how many days a deadline allows, how
  long an offer stands, how much passage work pays and costs in days, and how far up the ladder a
  typical campaign gets.
- **The reading surfaces are now load-bearing for the loss condition**, not just for convenience: under
  decision 7 the player's estimate of a commission is made out of the trade guide, contacts and
  last-known. Chunk 8 cannot be built last.
- **The content pipeline must support generated substance over authored patrons** (chunk 9): a
  commission's demand is composed by the engine from *this* campaign's galaxy, so the validator and the
  cross-product tool have a harder job than reading hand-written wants, and a rung must be checkable as
  fillable at composition time.
- **Save/resume is satisfied by ADR 0003 as written** — a deterministic engine driven by an action
  sequence is already a save file — so decision 20 adds a requirement to *commit*, not an architecture.
- ~~**Time (chunk 2) is now the blocking question.**~~ **Settled**, 2026-10-22, in ADR 0005: the day is
  atomic, a day grants an allowance of **actions** spent on people and distance but never on trade, and a
  journey costs a route-dependent number of days. The map (chunk 3) is now the blocking question, because
  decision 6's distance axis is topology and ADR 0005 makes route length in days a property of it.
- `area:session` in `docs/agents/triage-labels.md` is renamed `area:campaign`.
