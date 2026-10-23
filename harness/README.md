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
| `nearest` | Departs along the flyable lane of fewest days: many landings, little time in the black. |
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
cannot be read as a trend. **Plotting stays outside the instrument.** Its columns are thin because
little exists yet, and every later ticket in the milestone extends them.

Today: `setting`, `seed`, `day`, `location`, `inTransit`, `credits`. A day in the black is at no
location, so `location` names where the ship is **bound** and `inTransit` is what says the day was
not a landing.

## Why it has no tests

It is an instrument with a short life, and testing it would pin down the thing most expected to
change. What *is* tested is the queries it reads, through the engine's public seam (#8). A content set
that will not load stops the run before a single day is measured, so a measurement is never taken
against a silently patched galaxy.
