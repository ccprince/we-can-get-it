# ADR 0009: TypeScript on Node, with the engine as a library three consumers import

**Status:** accepted, 2026-10-22
**Context:** `docs/design-overview.md` §4 chunk 8 (the surfaces this stack has to carry), §6 item 5 (the
milestone this unblocks); `docs/prototype-findings.md` §2.5, §5.3, §5.4; ADR 0003 (the seam this chooses a
language for); ADR 0006 decision 20 (the chart, and the read model it implies)

## Context

ADR 0003 was written deliberately stack-neutral: *"no language, runtime or presentation technology is chosen
yet; every statement below should survive that choice."* Nothing since has chosen one, and overview §6 item 5
cannot start without it — the measurement harness of findings §5.4 is the first thing built, and a harness
needs a runtime, a task runner and a config path the normal test run does not pick up.

The view needs more than a framework name. Overview §4 chunk 8 makes **knowledge and its reading surfaces** a
top-level chunk precisely so it does not *"get built last and badly"*, findings §2.5 requires every system the
player reasons about to get its reading surface designed at the same time or it will not be used, and ADR 0006
decision 20 has already specified a surface in terms of *converted* numbers — "four days, 140 credits, within
range" rather than "distance 14". That last one is a statement about what an engine query returns, not about
the chart, and it is the part of the view that is expensive to get wrong.

This ADR therefore chooses a stack, states the rules that keep ADR 0003's determinism requirement true in
*this* stack, and fixes the contract between the engine and the view. It decides nothing about the game, and
nothing about layout, keyboard map or visual design, which are settled by playing.

## Decision

**1. TypeScript on Node, one package, three entry points.** Strict mode. The engine, the page, the harness and
the tests live in one package rather than a workspace of several: the only boundary ADR 0003 recognises is the
engine's public seam, and a package boundary per consumer would invent three more.

**2. The engine is a plain TypeScript library with no I/O.** No `fetch`, no `fs`, no DOM, no network, no
`Date`, no `performance`, no `Math.random`. It exports start-a-campaign, take-a-command and read-only queries
(ADR 0003 decision 1) and nothing else. A lint rule denies those globals inside the engine directory, because
this is exactly the constraint that erodes quietly.

**3. Determinism is enforced against the four ways JavaScript loses it.** ADR 0003 decision 1 requires the
same content set, seed and **command sequence** to produce the same campaign, and findings §5.4's method —
one seed played twice at two settings — is worthless the moment that slips.

- **Randomness** comes from a seeded generator created in start-a-campaign from the seed and threaded
  explicitly. Never a module-level generator, which would make two campaigns in one page load differ.
- **Iteration order** never decides an outcome. Anything that affects what the player sees is ordered by an
  explicit sort over stable authored ids, never by object key order, `Map`/`Set` insertion order, or the order
  content happened to be written in. This is the rule the **draw**'s ordered cascade (ADR 0008) depends on.
- **Money and worth are integers.** Credits are whole numbers and every derived price — the **offer**, the
  fare, an **advance** — lands on an integer by a stated rounding rule. Float accumulation drifts, and a price
  the player cannot reproduce by the arithmetic on their own reading surface is worse than a wrong price.
- **The clock is never read**, including for shuffling (ADR 0003's consequence, restated here because
  `Date.now()` as a seed is the single most likely way to break it).

**4. The browser page imports the engine in-process.** The campaign lives in memory in the page's own
JavaScript. No server, no HTTP API, no serialisation boundary, no second runtime — a pure library needs none
of them, and each one would add a place for a rule to leak out of the engine against ADR 0003 decision 4.

**5. The harness is a separate Node entry point with its own config.** It imports the same engine module the
page does, which is what makes ADR 0003's *"the engine's public seam is the harness's only interface"*
literally true rather than aspirational. Its config file is its own, and the test run's include patterns
exclude it, so `vitest` never picks it up (findings §5.4).

**6. Content is JSON on disk, read through one validator both consumers share.** The page fetches it, the
harness reads it off disk, and both hand the parsed data to the same validator before the same engine
(ADR 0003 decisions 2 and 3). Two loaders are acceptable; two validators are not, and a content mistake that
only one surface rejects is the failure mode this decision exists to prevent.

**7. Vite and vitest.** Vite serves and bundles the page; vitest runs the tests through the public seam with
fixed seeds and purpose-built content (ADR 0003 decision 5). One toolchain, one config language, and the
harness stays a plain Node script underneath it.

### The view

**8. "Text" bounds the medium, not the intricacy.** Everything the player reads is prose and numbers: no
sprites, no canvas, no animation, no game loop, and nothing re-rendering between commands — the **day** is
atomic (ADR 0005) and the page is idle until the player acts. What it does *not* mean is simple. Chunk 8 puts
the **chart**, the **trade guide**, contacts and the **ledger** in front of the player at once, cross-
referencing each other, every row carrying an **as-of date**; that is a dense, table-heavy,
keyboard-friendly information UI, and it is the hardest thing in the build after the engine. The useful
consequence of the first half: with no real-time loop, view **performance is irrelevant**, so the framework
choice is settled purely on authoring ergonomics for dense tabular views.

**9. React.** Vite's best-trodden path, and the deepest pool of patterns for what chunk 8 actually needs:
tables, sortable columns, split panels, focus management, keyboard navigation. By decision 10 it holds no game
state, so React is doing layout and list rendering and nothing else — which is also why decision 8's
irrelevant-performance clause is what makes this a low-stakes choice rather than a load-bearing one.

**10. Every surface renders a read model handed to it by one engine query, and the view holds only view
state.** This is the operative half of ADR 0003 decision 4, stated so it survives an intricate UI.

- A **read model** is shaped for the surface that reads it and carries **converted, player-facing values** —
  ADR 0006 decision 20's "four days, 140 credits, within range", not a distance and a speed for the view to
  divide. If a surface needs a number, the query returns that number.
- The view's own state is which panel is open, what is selected, sort order, scroll position, and draft input
  not yet submitted as a command. Nothing else. No derived game values, no caching of a previous answer, no
  arithmetic over two queries.
- The test for whether a line belongs in the engine is unchanged and worth restating: if the player can
  observe it and it follows from the rules, the engine decides it. Findings §5.3 records that the one rule
  computed in the page sat outside the test suite until it was moved, and a four-surface UI is where that
  happens again by accident.

**11. A save is a seed and a command sequence, replayed through the engine on load.** Written to
`localStorage` after each command and replayed on open. Findings §2.5 is blunt about why this is in the first
milestone rather than after it: the browser's back button *ended two play-test runs outright*, and hand-play
is where verdicts come from (§5.4), so a run lost to a stray reload is a lost verdict. It is also nearly free,
because a seed plus a command sequence is already the harness's input shape and already what GLOSSARY's
**draw** entry requires of a save — *"a save carries a seed and never a galaxy."*

**12. Tailwind for styling.** Layout iteration speed on dense surfaces is the thing being bought, and it is
bought at the cost of layout decisions living in the markup, which is accepted.

### Formatting

**13. Prettier at width 100, run as an ESLint rule, with `max-len` beside it.** A decision rather than
taste because it buys a dependency, which decision 1's one-package frugality argues against. The width is
100 because that is what the code already was, read off the source. It runs inside `eslint .` and so inside
`npm run check`, which is what the pre-commit hook and CI run (consequences, below); a violation reports
`file:line:col`. `max-len` covers what Prettier will not — a line long because of a string or a comment
rather than its structure. Markdown is not formatted and authored prose in `content/` is not width-checked;
shell is covered by neither tool. Why, and what it cost, is below.

## Rejected alternatives

- **Python.** The fastest way to write the harness and plot the curve, and the wrong trade overall: the
  playable surface is the thing that produces verdicts (findings §5.4), the game is a browser game, and
  dict/set ordering plus float money would make decision 3 harder rather than easier.
- **Rust or Go.** The strongest determinism guarantees and the fastest run over many seeds, at the highest
  cost per experiment — the wrong direction for a milestone whose content set exists to be rewritten while it
  answers a question.
- **A client/server split, with the engine behind an HTTP API.** Decision 4. It buys nothing a pure in-process
  library does not already give, and it adds a serialisation boundary, a second runtime and a tempting place
  to compute a rule outside the engine.
- **A workspace with a package per consumer.** Decision 1. Three package boundaries to maintain in service of
  one real seam.
- **A terminal surface for hand-play instead of the page.** Cheaper to build and genuinely tempting for the
  first milestone, but the game is read in a browser in every iteration of this project so far, and chunk 8's
  four surfaces side by side is a layout problem a terminal would answer differently and therefore answer for
  the wrong medium.
- **`Math.random` seeded once at startup.** Decision 3. There is no such thing; the global generator cannot be
  seeded in JavaScript, which is why the generator is threaded explicitly.
- **Svelte or Solid.** Decision 9. Both are reasonable and Svelte is the close second; neither wins on the
  axis that decides it, because the axis is ecosystem for table and keyboard work rather than update
  granularity or bundle size.
- **No framework, plain TypeScript rendering.** Decision 9. Defensible if the view were simple; decision 8
  says it is not.
- **Plain CSS with custom properties.** Decision 12. The quieter option, and rejected for iteration speed on
  exactly the surfaces that will be rebuilt most often.
- **Serialising the whole campaign to JSON as the save.** Decision 11. More robust to engine changes
  mid-campaign, and in direct contradiction of a save carrying a seed and never a galaxy.
- **Fixing the layout, keyboard map or the content of chunk 8's surfaces here.** Those are settled by playing
  (CLAUDE.md), and this ADR fixes only the contract that keeps the rules out of them.


## Why Prettier, and why 100

Two things in #10 paid for the dependency. An agent reached for a Prettier that was not installed, got a
downloaded copy at its own defaults, and reverted the file and rewrapped by hand. And `/code-review` spent
attention finding long lines by eye, which became a commit of its own — `83a58fc`, every line of it
structural, which is to say every line of it something a formatter wraps for free.

**The width was measured, not chosen.** Reformatting `src/` at each candidate says how far it is from the
code that already existed:

| `printWidth` | cost to `src/` |
| --- | --- |
| 80 | +72 / -300 |
| 90 | +31 / -103 |
| 100 | +26 / -15 |
| 110 | +99 / -26 |

100 is what the code is written at; the other three are proposals to rewrite it. 272 lines already exceeded
80 and only 15 exceeded 100, which says the same thing from the other side.

**ESLint's own stylistic rules were the other candidate**, and the ticket preferred them for adding no
dependency. ESLint 10 marks every one of them deprecated — "formatting rules are being moved out of ESLint
core" — `max-len` among them, and none of them can rewrap a line; the maintained replacement,
`@stylistic/eslint-plugin`, is a dependency too and still cannot. So the choice was a formatter or nothing.
`max-len` is kept anyway, deprecation and all: it is one rule, its removal would fail `eslint .` loudly on
an unknown rule at upgrade time, and that is cheaper than a third dependency.

**Three things are outside the check**, listed because a check that is quietly hollow is worse than one
that is openly partial:

- **Markdown.** Prettier pads every table to aligned columns — 428 changed lines across the canon, and
  padded rows past 100 columns, since table padding ignores `printWidth`. The canon is prose, hand-wrapped
  by its author at the width each file was written at, and both incidents above were TypeScript.
- **Authored prose in content.** ESLint does not read JSON and Prettier cannot break a string, so the six
  flavour-text lines in `content/walking-skeleton.json` stay long. That is correct: a **tell** is written
  to read well, not to fit a column.
- **Shell.** `.husky/pre-push` has six lines past 100 and nothing checks them: Prettier does not parse
  shell and ESLint does not read it. Accepted rather than solved — the hooks are two files that change
  rarely, and a shell formatter would be a third dependency for them.

## Consequences

- **Overview §6 item 5 is unblocked.** The next artifact is the milestone's spec, and the harness is its
  earliest ticket — written against the seam's signatures before the engine's interior exists, which is what
  forces the queries to expose per-day counts rather than run totals.
- **The harness and the page read the same queries.** Because a policy is `chooseCommand(view) -> command` and
  `view` is the same read models the page renders (decision 10), what the scripted **tourist** measures is
  literally what a player would be exposed to — not a privileged view of the galaxy. That is what makes the
  exposure curves an answer to how plain and vague wants divide the game rather than a census of content.
- **Three things the spec now carries**, settled alongside the stack but soft enough to live in the spec
  rather than here: the harness drives a policy behind that one interface; the first policy is a **tourist**
  that lands, reads everything and departs without trading, so the first curves measure exposure with no
  economic competence mixed in; and the harness writes **one CSV row per day per seed**, leaving plotting
  outside the instrument. A greedy trader is a later ticket behind the same interface.
- **Chunk 8 is built alongside the engine, not after it.** Decision 10 means a surface cannot be added later
  without the query that feeds it, so each surface arrives with its read model or not at all — which is the
  mechanical version of findings §2.5's rule about designing the reading surface at the same time.
- **The engine directory gets a lint rule** denying the globals of decision 2, and the repo gets the
  pre-commit hook findings §5.4 asks for, running what CI runs.
- **A seed-finding script** (findings §5.4) is a Node entry point like the harness, and for the same reason:
  tests whose assertions are about a seeded **draw** need one.
- **Integer money is now an engine-wide invariant**, not a formatting choice, and every price rule the content
  pipeline validates is validated as integer arithmetic.
- **Replay is the save, so an engine change invalidates a campaign in progress.** Accepted for the first
  milestone, where the content set and the rules are both expected to change under the player; it becomes a
  real problem only when a campaign is long enough to be worth preserving across a build.

## Open questions this deliberately leaves

- **Which seeded generator**, and whether its algorithm is part of the save format. Decision 11 makes this
  sharper rather than softer: a save is a seed and a command sequence, so a change of generator rewrites
  history.
- **Whether a terminal surface is worth adding later** for fast hand-play of a single question, once the page
  exists and the cost is known.
- **What the view does when replay fails** — a stored command sequence the current engine rejects. Discarding
  it is the obvious answer and probably right; it is listed because silently discarding a hand-played run is
  the failure decision 11 exists to prevent.
