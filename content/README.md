# Content

Content is data the engine receives and never imports (ADR 0003 decision 2). The page fetches these
files; the harness reads them off disk; both hand the parsed data to the same validator before the same
engine (ADR 0009 decision 6).

## `walking-skeleton.json`

The trivial content set of #7 — one location, no goods — which exists to prove the path through every
layer and nothing else. The content set written to answer the milestone's question is #22.

**Every number in here is a placeholder, and evidence of nothing.** The week, month and year lengths,
the starting credits and the starting day are all measurements this project has not taken yet
(CLAUDE.md); no prototype number is a starting point. They are declared by the content set rather than
held in the engine precisely so that measurement can move them without touching code.
