# Coding standards

Read at **review** time, not while implementing: the rules here are the judgement calls a reviewer
makes, and the mechanical ones are checks instead (see **Already checked** below). This file records
no new decisions — every rule points at the ADR, glossary entry or finding that settled it.

## Where the standards live

| Source | What it governs |
| --- | --- |
| `docs/adr/0003-the-engine-seam.md` | The five principles governing all code. Read before writing any. |
| `docs/adr/0009-the-stack.md` | The stack, the view contract, and what the engine is denied. |
| `GLOSSARY.md` | The vocabulary. Code uses these words and coins no synonyms for them. |
| `docs/closed-questions.md` | Settled questions and the void prototype numbers. |
| The ADR covering the area touched | `0005` time, `0006` the map, `0007` tags, `0008` the draw. |

## Judgement calls

These need a reader; no check substitutes for them.

- **Vocabulary.** A name in the code is a GLOSSARY word where one exists — **digest**, **day**,
  **location**, **hold**, **order**, **draw**, **content set**. A near-synonym for an earned word is
  a finding, and so is a GLOSSARY word used for something it does not mean.
- **The read model carries converted, player-facing values** (ADR 0009 decision 10). If a surface
  needs a number, the query returns that number; the page does no conversion and holds only view
  state. The breach to look for is a raw engine value reaching a surface.
- **Rules live in the engine, not the view** (ADR 0003 decision 4). A rule reachable only through
  the page is in the wrong layer, and its test would have to go through the DOM to find it.
- **Void numbers.** Every number is either content, or found by measurement and written down in a
  play-test. A number inlined in the engine as a constant is a finding; a placeholder in content or
  a fixture is fine when it says it is one.
- **Scope against the ticket.** A chunk ticket's spec is its own acceptance criteria *plus* its
  parent milestone ticket's Implementation / Testing / Out of Scope sections. Reach that belongs to a
  sibling ticket is a finding even when the code is good — the walking skeleton shipped three such
  bits and they came back out.
- **Tests go through the public seam only** (ADR 0003 decision 5), with fixed seeds and purpose-built
  content from the fixture helper, and new-field defaults in one place. A test reaching inside
  `src/engine/` past `index.ts` is a finding.
- **Order** (ADR 0009 decision 3, iteration order). **Written order**, meaning where something sits
  in a content file, deciding an outcome or reaching a surface is a finding. Derived order is not: a
  draw's placement order, or a `Map` filled in an allowed order, is fine. Two things to look for: a
  read-model list with no stated order in its doc comment, and container order deciding an outcome
  with neither the order visible in the code nor a comment naming its source. An engine-side id sort
  added "for determinism" is not a fix: the loader already canonicalises content.
- **Unreachable code.** A branch, parameter or export with no caller through the seam cannot be
  tested through it. The skeleton review found four; they are cheaper to delete than to carry.

## Already checked

Do not spend review attention on these — a failing check is louder than a reviewer:

- The engine's purity: no I/O, no DOM, no clock, no ambient randomness, no React
  (`eslint.config.js`, path-scoped to `src/engine/**`).
- The day index never reaching the page (`eslint.config.js`, path-scoped to `src/page/**`).
  ADR 0005 decision 3; added after a hand review found it breached in the page's first commit.
- Formatting and line width: Prettier at 100 columns, run as an ESLint rule, with `max-len`
  beside it (ADR 0009 decision 13). A violation names the file and the line, and
  `npm run format` fixes what is fixable, so do not wrap a line by hand in review and do not
  argue the width. Markdown, prose in `content/` and shell are outside it, deliberately; the
  ADR says why.
- Types, lint, formatting and tests: `npm run check`, which is what the pre-commit hook and CI
  both run.
