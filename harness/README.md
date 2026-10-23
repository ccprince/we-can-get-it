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
    { "name": "as-written", "contentPath": "content/walking-skeleton.json" },
    { "name": "richer", "contentPath": "content/richer.json" }
  ]
}
```

**Two settings in one pass is the method, not a convenience.** Every setting is run over the same
seeds, so a setting's effect is read as a diff and is isolated from the **draw** — one seed played
twice at two settings. Today a setting varies only by its content set, because that is where the
ratios being tuned live; later tickets add the knobs they introduce.

**Every number in the config is a knob, and none of them is a finding.** What a run concludes belongs
in a play-test write-up (`docs/playtests/TEMPLATE.md`), not here.

## What it is allowed to know

A policy is `chooseCommand(view) -> command` and receives **exactly the read models the page renders**
— no campaign, no content set, no privileged read of the galaxy. That is what makes the curves a
record of what a player could have been exposed to rather than a census of the content. The **tourist**
is the first policy: it reads everything available and ends the day, without trading, so the first
curves carry no economic competence.

The CSV is one row per day per seed per setting, every row carrying its seed so that one odd galaxy
cannot be read as a trend. **Plotting stays outside the instrument.** Its columns are thin because
little exists yet, and every later ticket in the milestone extends them.

## Why it has no tests

It is an instrument with a short life, and testing it would pin down the thing most expected to
change. What *is* tested is the queries it reads, through the engine's public seam (#8). A content set
that will not load stops the run before a single day is measured, so a measurement is never taken
against a silently patched galaxy.
