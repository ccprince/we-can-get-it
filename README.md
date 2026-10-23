# We Can Get It For You

A text space-trading game about finding the right good at the right shop for the right buyer. The
design canon is in [`docs/`](docs) — read [`CLAUDE.md`](CLAUDE.md) first; it says what is settled, what
is deliberately open, and what not to re-litigate.

TypeScript on Node, one package, with the engine as a pure library that the page, the harness and the
tests each import in-process (ADR 0009).

```
src/engine/   the rules. No I/O, no DOM, no clock, no ambient randomness; one public seam (src/engine/index.ts)
src/page/     React + Tailwind. Renders read models the engine hands it and decides nothing
content/      content sets as JSON on disk, served as-is: the page fetches them, the harness reads them
tests/        through the engine's public seam, with fixed seeds and purpose-built content
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | serves the page |
| `npm run check` | typecheck, lint, tests — what CI and the pre-commit hook run |
| `npm test` | the test suite |
| `npm run build` | bundles the page |

`npm install` installs the pre-commit hook, which runs `npm run check`.

## The seam

One module, one import for every consumer. A campaign is an immutable value and these functions are
pure; a rejected command returns a reason and leaves the campaign untouched.

```
loadContent(raw)             -> { ok: true, content, reports } | { ok: false, problems, reports }
startCampaign(content, seed) -> Campaign
takeCommand(campaign, cmd)   -> { campaign } | { rejected: Reason }
view(campaign)               -> View
```

The engine is deterministic for a given content set, seed and command sequence, and never reads the
clock. The lint rule in `eslint.config.js` denies the globals that would break that, and it fails the
build.
