# Content

Content is data the engine receives and never imports (ADR 0003 decision 2). The page fetches these
files; the harness reads them off disk; both hand the parsed data to the same validator before the
same engine (ADR 0009 decision 6).

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
| `goodsPerRoleTag` | Goods carrying a tag any buyer holds as a **bonus** or a **refusal**. A role must be a learnable pattern, so more than one good. Outside it, the load fails. |
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
a *drawn* map is **connected at baseline range**, has its chokepoints and spurs, and satisfies the
start-node guarantee are the draw-time pass's checks (#12), not this file's.

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

A buyer has an `id`, a `name`, their `wants`, and the tags they hold in a role: `bonusTags` they pay
more for and `refusalTags` that make them say no. The role is a property of this buyer's
relationship to a tag rather than a class of tag (decision 7), so the same tag may be a bonus at one
buyer and a refusal at another — but not both at one buyer.

A buyer stands somewhere: `locationId` names a location in the reserve. A campaign that does not draw
that location takes the buyer out with it, and one that does still **hides** them at the rate
`drawParameters.peopleHiddenPercent` declares, per person and independently of the location (ADR
0008 decision 10).

A **want** is either a `predicate` or one good by identity, never both and never neither:

```jsonc
{ "predicate": [{ "tag": "cloth" }, { "tag": "warm", "negated": true }] }   // cloth and not warm
{ "goodId": "silk" }                                                        // this thing, by name
```

A predicate is a **conjunction** of terms, each a tag or a negated tag. There is no disjunction: a
want for "brandy or whisky" is a want for the kind above them, which is what flat kinds with many
goods each are for (decision 6). A named good must exist; that it can be **reached** in the drawn
galaxy is the draw-time pass's check (#27).

## `walking-skeleton.json`

The content set the page hand-plays and the harness measures, grown one ticket at a time until #22
writes the one that answers the milestone's question. It began as the trivial content set of #7 — one
location, no goods — which existed to prove the path through every layer and nothing else.

It now holds **six locations and six lanes**, hand-written rather than assembled from **motifs**,
which is #11. The shape is deliberate and is there to be read in hand-play: a start with three
neighbours, a ring through Thennet Shoals and Caravel Station that offers a long way round, a
**spur** at Grieve's Hollow that must be flown out and back, and one lane out to Lamentation that is
**beyond baseline range** — the wall with a price on it (ADR 0006 decision 14). The vocabulary,
catalogue and cast are still empty.

**Every number in here is a placeholder, and evidence of nothing.** The week, month and year
lengths, the starting credits, the starting day and every declared bound are all measurements this
project has not taken yet (CLAUDE.md); no prototype number is a starting point. They are declared by
the content set rather than held in the engine precisely so that measurement can move them without
touching code.
