# Content

Content is data the engine receives and never imports (ADR 0003 decision 2). The page fetches these
files; the harness reads them off disk; both hand the parsed data to the same validator before the
same engine (ADR 0009 decision 6).

## The manifest

`sets.json` is an ordered list of the content sets the page offers, by name, where a name is a set's
file name without its extension. It is not a content set and no loader reads it.

```json
["plain-and-vague", "walking-skeleton"]
```

- **Listing a set** is one line, and no code. The first entry is the set a new campaign opens on
  when nothing else is asked for. A save records its set's name, so a set renamed or taken off the
  list cannot resume it.
- **Leaving a set unlisted** keeps it in the folder without offering it: the harness and the
  cross-product report still read it by path. List a set once it loads.
- The page offers a picker in **Start a new campaign** when two or more sets are listed, and none at
  one. `?content=<name>` names the set a new campaign starts on, as `?seed=` names its seed.
- Every listed name must exist and load with no problems; a test checks it.

## What the validator does with it

The **validator** issues two verdicts and never conflates them (ADR 0007 decision 18):

- a **problem** is a content mistake, named by what it is and where it is, and it **fails** the
  load;
- a **report** is something for a writer to judge, and is **never** a reason to fail a load.

Prose missing its **tell** words is the type case for a report: a writer finding a better word than
the tag table predicted is the normal case, and failing it would train writers to pad prose with
keywords. A report states a **distribution** and never a mean.

What is checked here is the content set **as written**. Nearly every bound is also a property of the
**drawn galaxy** — a kind can be usable in the reserve and a singleton in one campaign — and those
checks are the draw-time pass's (#12, #27). Both are kept.

## The cross-product report

The validator's other half: what you have actually written, laid out to be judged rather than
failed (ADR 0007 decision 18). It is the loader and the draw in reporting mode, not a second tool,
so it cannot disagree with the game.

```
npm run report -- content/walking-skeleton.json                    # the content set as written
npm run report -- content/walking-skeleton.json --seed 3           # and the galaxy seed 3 draws
npm run report -- content/walking-skeleton.json --out some/file.md
# without --out: out/walking-skeleton-cross-product.md
```

The report is Markdown, written to a file. It is written even when the content set will not load
(the problems are in it) and the exit is then non-zero. Its sections, in order:

| Section | What it tells you |
| --- | --- |
| **Problems** | Mistakes, each **fails**: the load's problems, and the draw's if a seed was asked for and gave no galaxy. |
| **Reports from the load** | Suspicions, each **judge**, exactly as the loader issues them. The missing-tell ones appear again below, by good. |
| **Motif Slots** | One sub-heading per motif, listing its slots with how many reserve locations can fill each; an untyped slot counts every location. A low count is an over-narrow motif, visible before a draw exhausts its re-rolls. Closes with **Locations by archetype**, which locations each archetype holds, once. |
| **Motif layouts** | One sub-heading per motif, worst first, giving its **worst distortion** — the largest ratio between a lane's drawn length on the chart and its distance, either way round — and each lane's drawn length against its distance. `1.00` is drawn exactly. Distortion is never a failure: some distances cannot be drawn, such as a triangle of 1, 1 and 5 (ADR 0011 decision 5). |
| **goods per kind** | A distribution, widest group first, never a mean. Foremost: a kind with few goods is a lookup, not a search. |
| **goods per role tag** | The same, over tags some buyer holds as a bonus or a refusal. |
| **prose missing the tells of a tag the good holds** | A good whose prose carries none of a held tag's tell words. |
| **prose carrying the tells of a tag the good does not hold** | A good whose prose reads like a tag it does not carry. |
| **Drawn: …** | Each of the four above over the goods and people the draw kept, plus **goods hidden**: how many of the goods of the kinds in circulation the draw hid against the declared rate, and each good it drew back to keep a kind's floor or a role tag's least, which is why the two differ; **slots placed**: which location filled which slot, and **inter-motif stretch**: each lane between motifs, most stretched first, drawn on the chart against its distance. The draw lengthens only these lanes, and only to fit a motif without a crossing (ADR 0011 decision 6). Only with `--seed`. |

A tell finding is a **judgement for you** and never a failure: a missing tell is usually a better
word than the tag table predicted, and failing it would train writers to pad prose with keywords.
Most bounds are properties of the **drawn** galaxy, which is why the report can be run over one.
**Overridden pairings** are not listed: overrides are outside the first milestone (#29).

## The shape of a content set

```jsonc
{
  "bounds": { ... },      // what this content set declares about its own shape
  "fareRate": 10,         // credits per unit of distance, galaxy-wide (ADR 0006)
  "calendar": { ... },    // one galaxy-wide reckoning (ADR 0005)
  "locations": [ ... ],   // places on the chart
  "lanes": [ ... ],       // what joins them, and the only way between them
  "tags": [ ... ],        // the vocabulary wants match against
  "goods": [ ... ],       // the catalogue
  "buyers": [ ... ],      // who wants what
  "start": { ... }        // where and when a campaign opens, and in what ship
}
```

### `bounds`

A content set **declares its own bounds** and the validator enforces what was declared; the engine
hardcodes none of them (ADR 0007 decision 15). Growing the catalogue is a config edit rather than an
argument, and both ends of both ranges are expected to widen as it grows.

| Field | What it bounds |
| --- | --- |
| `tagsPerGood` | Tags on one good, the mandatory kind included. Outside it, the good fails. |
| `goodsPerRoleTag` | Goods carrying a tag any buyer holds as a **bonus** or a **refusal**. A role must be a learnable pattern, so more than one good. Outside it, the load fails. The drawn galaxy must meet it too, among the goods the draw kept, so the least is set against what a hidden third leaves. |
| `usabilityFloor` | The goods a **kind** must carry to be **usable**. A kind below it is legal and is **reported**; what is refused is a **vague** want pointed at one (#16). |
| `quirkRation` | The most **quirk** tags the galaxy may hold. Above it, the load fails. |

A range is `{ "least": n, "most": n }`, both ends inclusive.

### What the draw hides

An **archetype** declares the **kinds** it `supplies` and `demands`, each a tag of class kind. A kind
that some drawn archetype supplies or demands stays in circulation; one that none does may be dropped
entire. Within a kind, `drawParameters.goodsHiddenPercent` is the chance any one good is hidden, and
the draw never takes a kind below the usability floor to do it (ADR 0008 decision 11). The same rate
is what drops a kind: one that no drawn archetype supplies or demands is dropped entire when the rate,
rolled over its goods, would take it below the floor. There is no second rate to declare. Both rates
are whole percentages, `0` to `100`.

Two more numbers are checked against what was drawn, and neither has a default.
`drawParameters.peopleFloor` is the fewest people every drawn location carries once the people are
hidden (ADR 0008 decision 12); a miss re-rolls the people pass. The walking skeleton declares `0`,
since it has too few people to hold a floor of one. `drawParameters.reserveSurplus` is **one** number
applied to every archetype: the reserve must hold that many locations of the archetype beyond the
most simultaneous slots of it any assembly of `motifsPerCampaign` motifs can demand (decision 9).
A short archetype fails the draw by name, and is not a re-roll.

### `lanes`

A **lane** is the only way between the two **locations** it joins (ADR 0006 decision 1), and it
carries one authored number, its **distance** (decision 8):

```jsonc
{ "ends": ["bellwether", "kestrel"], "distance": 6 }
```

Both ends must name locations the content set holds, and they must differ: a lane joins *two*
locations, and a zero-day hop is rejected outright (decision 6). A lane is **symmetric** — one cost,
the same both ways (decision 7) — so a second lane between the same pair, in either order, fails the
load. Days and **fare** are derived, never authored: `ceil(distance / speed)` with a floor of one
day, and `distance × fareRate` in credits.

A galaxy with no lanes is legal, because a content set may hold one location and go nowhere. Whether
a *drawn* map is **connected at baseline range** — every drawn place reachable from the start on
lanes within the baseline ship's `range` — is the draw-time pass's check. A lane beyond range is
legal so long as the place behind it can be reached some other way. The map's shapes and its start
are checked there too, declared under `topology`.

### `topology`

What the **drawn galaxy's** topology must hold, checked after the map is assembled and re-rolling
the motif selection on a miss (ADR 0006 decision 3, ADR 0008 decision 17). Every **motif** names its
`shape` — `spur`, `chokepoint` or `ring` — and a shape outside that list fails the load. The shape
is declared and not yet checked against the motif's lanes.

| Field | What it declares |
| --- | --- |
| `leastPlaced` | The **motif invariants**: at least so many placed motifs of each shape. Every shape is named, `0` for one the map need not hold. |
| `startHub` | The **start-node guarantee** (ADR 0006 decision 16): the `archetype` the start must be (`null` for any), how many `neighbours` within baseline range it must have, and how many of those `spurs` — a dead end, one lane within range, placed by a motif whose shape is `spur`. Of the places that hold it, the start is the one the most lanes touch. |
| `farHaul` | The far cluster no nearer than this: the longest lane *between* motifs must be at least this long (ADR 0008 decision 6). `0` asks for none. |
| `minimumGapPercent` | The **minimum gap**, in whole percent of a motif's shortest lane: how near the chart may draw a location to a lane that does not touch it (ADR 0011 decision 4). |

All four are placeholders, to be measured. Each motif is laid out for the chart once, at load, from
its lanes' distances alone, so it is drawn the same shape in every campaign. A motif whose layout has
two lanes crossing, or puts a location within the minimum gap of a lane it is not on, fails the load
by name: its lanes cannot be drawn flat, or its distances pull a place onto a lane, as five and five
do onto a lane of ten. An invariant no draw could meet — a minimum for a shape no
motif has, minimums summing past `drawParameters.motifsPerCampaign`, a far haul longer than
`drawParameters.interMotifDistance.most` or asked of a one-motif campaign, a start hub of an unknown
archetype, or spurs asked of it with no spur motif or more of them than neighbours — fails the
load.

### `fareRate`

The one galaxy-wide rate a **fare** is the **distance** times (ADR 0006 decision 10). There is
exactly one, because authored per-lane tariffs and regional rates were rejected there: a surcharge on
a particular gate is an **event**, not geography (decision 13).

### `start`

Where and when a campaign opens, and what the player opens it with: `locationId`, `credits`, the
`day` the first digest is dated, and the baseline `ship`. A ship declares its `speed` — **distance**
per day — its `range`, the largest distance it can fly in one **leg**, and its `hold`, the units of
cargo it carries, one to a unit of any good (ADR 0006 decision 9). Ship upgrades are outside this
milestone, so the ship a campaign opens with is the ship it has.

### `shops`

Every drawn location has one shop, stocked at campaign start with **lots** of the drawn goods whose
**kind** its **archetype** `supplies`. A lot is finite and depletable, and one bought out is gone
for the rest of the campaign. Nothing about a lot is authored: its good, its size and its price all
come from the draw and from these:

| Field | What it declares |
| --- | --- |
| `lotsPerShop` | How many lots a shop stocks, drawn per shop. A shop with fewer goods to offer stocks all of them. |
| `lotQuantity` | The units a lot opens with, drawn per lot. The least is 1: a lot that opens empty is already gone. |
| `markupPercent` | What a shop charges above **worth**, in whole percent, drawn once per location. Never below worth; either end may pass 100. |
| `scarcityPercent` | The most a lot adds for being small, in whole percent, and may pass 100. A lot opening at `lotQuantity.most` adds nothing. |

A unit's price is `ceil(worth × (100 + markup + scarcity) / 100)` credits, where `scarcity` is
`scarcityPercent × (most − opening) / most` for a lot that opened at `opening` units. It is fixed
when the shop is stocked, so buying never moves it: the stock a price reads is the size the lot
opened at, which keeps a purchase of several units at a number the player can reproduce from what
the shop shows them (ADR 0009 decision 3).

### `offers`

What a buyer pays for a good, as a whole percent of its **worth**, at each **match tier** that pays
at all: `grudgingPercent`, `acceptablePercent` and `greatPercent`. A refused good is not paid for.
The three must rise strictly, so a better tier pays better, and an offer may pass 100. The offer is
`floor(worth × percent / 100)`, and nothing is authored per want (ADR 0007 decision 13). The
skeleton's three percentages are placeholders to be found by play, like every number here.

### `tags`

Every tag declares its `id`, its `class` — `kind`, `quality`, `origin` or `quirk` (ADR 0007
decision 1) — and its `tells`: the kind of words a good's prose uses to signal it, `alcohol` →
brewed, distilled, proof. A tag declaring **no tell at all fails** the load, and so does a tag
**no want uses and no buyer holds in a role**: tags nobody uses are noise (decision 4). A tell matches
anywhere in the prose and in any case, so a declared stem reaches every word grown from it.

Only a **kind** is public vocabulary. A quality, origin or quirk tag is named nowhere and is reached
only through its tell (decision 3).

### `goods`

A good carries an `id`, a `name`, `prose`, exactly one `kind` — mandatory and flat, and refused if
its other `tags` name a second (decision 2) — and one `worth`, the galaxy-wide anchor an offer is
computed against, deliberately not a tag and not a price (decision 12).

### `buyers`

A buyer has an `id`, a `name`, their `wants`, a `refusalLine` — what they say when a good is turned
down, in their own words, whichever term it failed — and the tags they hold in a role: `bonusTags` they pay
more for and `refusalTags` that make them say no. The role is a property of this buyer's
relationship to a tag rather than a class of tag (decision 7), so the same tag may be a bonus at one
buyer and a refusal at another — but not both at one buyer.

A buyer stands somewhere: `locationId` names a location in the reserve. A campaign that does not draw
that location takes the buyer out with it, and one that does still **hides** them at the rate
`drawParameters.peopleHiddenPercent` declares, per person and independently of the location (ADR
0008 decision 10).

A **want** is a `predicate`, one good by identity, or a **vague** gesture at a `kind`, and exactly one of them:

```jsonc
{ "predicate": [{ "tag": "cloth" }, { "tag": "warm", "negated": true }], "plainly": "wants cloth that stays cool", "quantity": 3 }
{ "goodId": "silk", "quantity": 1 }                                          // this thing, by name
{ "kind": "cloth", "quantity": 1 }                                           // anything at all of this kind
```

Every want carries a `quantity`, a whole number of units of at least one: how many the buyer will take in
all. A sale may be of any number up to what is still wanted, and the want closes when all of it is
sold (ADR 0007 decision 11).

A predicate want carries `plainly`, the want said as the buyer's side of the sentence, because the
player never sees a quality tag and a plain want has to tell them what would satisfy it. A want
naming a good needs none. The match tier is derived and never written here (ADR 0007 decision 9).

A predicate is a **conjunction** of terms, each a tag or a negated tag. There is no disjunction: a
want for "brandy or whisky" is a want for the kind above them, which is what flat kinds with many
goods each are for (decision 6). A named good must exist; that it can be **reached** in the drawn
galaxy is the draw-time pass's check (#27): the good must be drawn, and a drawn location must
supply its kind.

A **vague** want names a `kind` and nothing else: it carries no `plainly`, and the load refuses one
that does, since a plain form would be the working out that is the player's (ADR 0002). It is met by
any good of that kind, at a tier the engine derives like any other (`acceptable`, or `great` with a
bonus tag). It may only point at a **usable** kind. The load fails a vague want whose kind carries
fewer goods than `bounds.usabilityFloor`, naming the kind and its count, and the draw is re-rolled
when it drops the kind entire, because a kind usable in the reserve can be absent from this galaxy.

## `walking-skeleton.json`

The content set the page hand-plays and the harness measures, grown one ticket at a time until #22
writes the one that answers the milestone's question. It began as the trivial content set of #7 — one
location, no goods — which existed to prove the path through every layer and nothing else.

It now holds **twelve locations and three motifs**, of which a campaign places three, duplicates
included: a **chokepoint** crossing, a **ring** of three, and a **spur** whose junction is a market
with three neighbours, one of them the dead end — the start ADR 0006 decision 16 asks for. A neighbour
counts as a spur only when it is a spur's dead end, so the junction is the only location that can
open a campaign, and the motif invariants place a spur every time. Every lane, inside a motif and between them, is
within baseline range, so the drawn map is connected end to end.

Its catalogue is a **placeholder** so the shops have something to stock (#14): three kinds, one
supplied by each archetype, three goods each and no other tags, and one buyer wanting each kind only
because a tag no want uses fails the load. It is there to make buying playable and is evidence of
nothing about the catalogue; #22 writes the one that answers the question.

**Every number in here is a placeholder, and evidence of nothing.** The week, month and year
lengths, the starting credits, the starting day and every declared bound are all measurements this
project has not taken yet (CLAUDE.md); no prototype number is a starting point. They are declared by
the content set rather than held in the engine precisely so that measurement can move them without
touching code.

## `plain-and-vague.json`

The content set the first milestone measures (#22), named for its question: how do plain and vague
wants divide the game? `walking-skeleton.json` stays as it is. This set is revised all through #22,
in stages: frame, cast, goods three times, measure, prose.

### Scope: fewer kinds, not fewer goods per kind

The question turns on **goods per usable kind** in the drawn galaxy, not on how many kinds there
are. So ADR 0007's 6–8 goods per usable kind holds, and its 20–30 kinds are cut. People, locations
and motifs scale down with the kinds. What is given up is the **economic grain** of a **region**,
many kinds disagreeing along its lanes, and this milestone does not measure it.

### The sizing estimates

**Estimates, void on first measurement, and evidence of nothing.** No prototype number is a
starting point. Each takes the low end, to reach play sooner.

| Estimate of | Estimate | Why |
| --- | --- | --- |
| Goods per usable kind | **6**, drawn | The low end of ADR 0007's 6–8. |
| Number of kinds | **8** | The cut above. |
| Motifs per campaign | **4** | The low end of ADR 0008's 4–6, with fewer kinds and so fewer archetypes. |

What follows from them is arithmetic, recorded as such:

| Quantity | Estimate | Derivation |
| --- | --- | --- |
| Goods reserve | about 70 | 8 kinds × 6, divided by ⅔ for the third the draw hides. |
| Drawn locations | 12–16 | 4 motifs of 3–4 locations each. Below ADR 0008's 16–24, which assumed about 5 archetypes. |
| Archetypes | 4 | Enough that each of 8 kinds has an archetype supplying it and one demanding it: `extractor`, `processor`, `agricultural`, `market`. |
| Location reserve | 24 | 6 per archetype: no motif has two slots of one archetype, so 4 motifs demand at most 4, plus a `reserveSurplus` of 2. That is 1.5–2 times the draw, under ADR 0008's two to three; the per-archetype rule is the binding one. |
| Motif reserve | 6 | Two spurs, two chokepoints, two rings. |
| Usability floor | 4 | ADR 0008 decision 20: a floor below the target, not the target. |

**The first measurement voided them (#110)**, over 200 draws: goods per usable kind drawn is 4–10,
mostly 6–8; all 8 kinds circulate in every draw; every campaign places 4 motifs and 13–15 locations;
77 goods are written and 50–68 drawn, since the draw hides fewer than `goodsHiddenPercent` to keep
named goods and role tags. The location reserve is exactly the binding per-archetype need, with no slack beyond the
surplus of 2.

### Supply and demand

Eight kinds, each one a **tag** of class kind with its tells, and four archetypes, each supplying
some kinds and demanding others. Every kind has an archetype that supplies it and one that demands
it.

| Archetype | Supplies | Demands |
| --- | --- | --- |
| `extractor` | ore | mechanical, provisions, spirits, remedies |
| `processor` | mechanical, cloth | ore, botanicals, provisions |
| `agricultural` | provisions, botanicals, spirits | mechanical, cloth |
| `market` | curios, remedies | spirits, curios, cloth, provisions |

`ore` stands for heavy cargo, in the fiction only: the game does not model bulk, and a unit of ore
takes one unit of hold like any other good. `curios` travel only from one market to another, since
the market is both their supplier and their buyer. `cloth` covers the raw material and what is made of it, and
`mechanical` covers things usable as they are and the parts they are made of: within a kind, that
difference is for tags to carry, not a second kind.

### The goods

**Every kind's goods are written**, replacing the stubs the set loaded with until then (#107–#109):
nine goods to a kind, ten for cloth to carry a fourth floral good, and eleven for ore and botanicals
so that goods outnumber wants across the galaxy.

A written good's prose is, for now, one line saying what it is, not its finished prose: that comes last,
once measurement shows which goods survive. Its tags are drawn from the cast's tastes, and once a
kind's goods are written, the minor buyers wanting that kind state their wants plainly, as a
predicate or as an **order**. Every order's price and window is a placeholder: the price is the
good's worth, or near the middle of the worths a predicate order matches, and the window is 30 days.

**Measurement revised the draft (#110).** Seven minor buyers' wants moved off provisions, the
most-wanted kind: two became plain wants for curios and remedies, and five became vague wants, one
each for botanicals, curios, ore, remedies and spirits, the kinds that had only two vague wants.
Two orders went with the provisions wants, since no vague want carries one. Those five holders
become **characters**, since a minor buyer talks plainly: each pays more for one tag and refuses one, as every
cast vague want's holder does, so that a vague want does not take a whole kind out of **thin
demand**. Each **quirk** now sits on four goods, so that a drawn quirk is usually three.

**Waterproof** carries `proof`, a tell of spirits, so every cloth good whose prose says waterproof
is reported as reading like spirits. That is a known false tell, kept because both words are the
right ones (#122).

### The map

A location is shown as one world: a planet by default, with stations and asteroid colonies among
them. The `market` archetype is the populated, non-farming world. A campaign always places a spur
and a chokepoint, and opens at a `market` hub with three neighbours, one of them a spur's dead end.

**Every number in this file is a placeholder, and evidence of nothing**, beyond the estimates
above: the bounds, the fare rate, the calendar, every lane's distance, and everything in
`topology`, `drawParameters`, `shops`, `offers` and `start`. The calendar, fare rate, shops,
offers and start are the walking skeleton's own placeholders, carried over unmeasured, except the
months: ten of 36 days, named as old ordinals worn down (`Unem` to `Decem`), a year of 360 days.
