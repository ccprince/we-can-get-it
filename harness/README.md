# The harness

A **throw-away instrument**, not part of the game. It drives a scripted policy over many seeds and
writes the curve through each campaign to a CSV. It gives counts and shape; it cannot give a verdict
(findings §5.4) — verdicts come from hand-play.

```
npm run harness                               # harness/harness.config.json
npm run harness -- path/to/other.config.json  # a variant, for one run
```

Output lands where the config's `out` says, under `harness/out/`, which is not checked in.

## Its own config

The config is the harness's own file (ADR 0009 decision 5), and the test run never picks the harness
up. A run is `seedCount` seeds from `firstSeed`, each played for `days` days, against every entry in
`settings`.

```json
{
  "days": 20,
  "firstSeed": 1,
  "seedCount": 8,
  "out": "harness/out/tourist.csv",
  "settings": [
    { "name": "nearest", "contentPath": "content/walking-skeleton.json", "route": "nearest" },
    { "name": "farthest", "contentPath": "content/walking-skeleton.json", "route": "farthest" }
  ]
}
```

**Two settings in one pass is the method, not a convenience.** Every setting is run over the same
seeds, so a setting's effect is read as a diff and is isolated from the **draw** — one seed played
twice at two settings. A setting varies by its content set, where the ratios being tuned live, and by
the tourist's **route rule**; later tickets add the knobs they introduce.

### `route`, the tourist's route rule

How the tourist moves is a knob and not a hardcode, because what a player is exposed to depends on
how they move (#6). It must be named: a measurement taken against a knob nobody set is one nobody
can report.

| `route` | What the tourist does |
| --- | --- |
| `stay` | Never departs. The exposure of one location, and the baseline the others read against. |
| `nearest` | Departs along the flyable lane of fewest days: many landings, little time in transit. |
| `farthest` | Departs along the flyable lane of most days: few landings, long hauls. |

All three are stateless reads of the **chart**, because a policy is handed a view and nothing else. A
rule that would not fly straight back the way it came needs the policy to remember where it has been,
which is a later knob if a run asks for one.

**Every number in the config is a knob, and none of them is a finding.** What a run concludes belongs
in a play-test write-up (`docs/playtests/TEMPLATE.md`), not here.

## What it is allowed to know

A policy is `chooseCommand(view) -> command` and receives **exactly the read models the page renders**
— no campaign, no content set, no privileged read of the galaxy. That is what makes the curves a
record of what a player could have been exposed to rather than a census of the content. The **tourist**
is the first policy: it reads everything available and flies, without trading, so the first curves
carry no economic competence. It takes its departures from the **chart** and leaves alone a **fare**
it cannot pay, since the engine refuses one and a refused command stops the run — so a run with no
income in it (trade is #14 onwards) ends with the tourist grounded wherever its credits ran out,
which is the shape to expect rather than a fault.

The CSV is one row per day per seed per setting, every row carrying its seed so that one odd galaxy
cannot be read as a trend. **Plotting stays outside the instrument.** Every column is read off the
view and nothing else, so each is a count of what a player could have seen.

## The columns

`setting`, `seed`, `day`, `location`, `inTransit`, `credits`. A day in transit is at no location,
so `location` names where the ship is **bound** and `inTransit` is what says the day was not a
landing.

Beside the day file is a per-campaign file with `.draw` before the extension (`tourist.draw.csv`),
one row per seed per setting, because a campaign's draw is one fact and not twenty.

| Column | File | What it counts |
| --- | --- | --- |
| `placesKnown` | day | Locations the **trade guide** holds something seen of, cumulative. |
| `oldestKnownDays` | day | Days old the oldest of those is. |
| `wantsSeen`, `wantsSeenPlain`, `wantsSeenVague` | day | Wants seen so far, cumulative: a want seen once stays seen after a revisit. Split by **register**. |
| `wantsNew`, `wantsNewPlain`, `wantsNewVague` | day | The same, first seen today. |
| `ordersOpenPlain`, `ordersOpenVague` | day | Orders among the wants seen whose date has not passed, by register. Seen, not accepted: the tourist accepts nothing. |
| `ordersFillable` | day | Of those, how many some lot in stock among those seen answers at **acceptable** or better. |
| `lotsSeen` | day | Lots on sale where the ship landed today; nought in transit. |
| `lotsMatching` | day | Of those, how many answer a want the player has seen anywhere. |
| `goodsUnwanted` | day | Distinct goods on sale in any shop the guide holds that no want seen is after: **thin demand** as a measurement. |
| `motifs`, `locations`, `kinds`, `goods` | draw | The shape the **draw** gave the campaign (#11, #33). |
| `usableKinds`, `goodsPerUsableKind` | draw | Kinds at or above the usability floor, and goods per kind as a distribution: `goods:kinds` pairs, `3:1 4:2` being one kind of three goods and two of four. |
| `vagueZero`, `vagueOne`, `vagueFew`, `vagueMany` | draw | Vague wants held by anyone the draw placed, bucketed by how many drawn goods answer each at acceptable or better: none, one, two to four, five or more. Counts of wants, never an average. |

Whether a good answers a want is the engine's to say (`wantsAnswered` and `lotsAnswering` on the
guide's known lots and wants); the harness only counts. The draw columns read the drawn galaxy through
`drawShape` on the engine's seam, not the view: a want's answers across the whole galaxy are not
something a player sees. The bounds of "few" (`FEW_ANSWERS` in `csv.ts`) are a knob, not a finding.

Run one seed at two settings and `diff` the day files; a single pass over many seeds writes one file
of rows, each carrying its seed.

## Why it has no tests

It is an instrument with a short life, and testing it would pin down the thing most expected to
change. What *is* tested is the queries it reads, through the engine's public seam (#8). A content set
that will not load stops the run before a single day is measured, so a measurement is never taken
against a silently patched galaxy.
