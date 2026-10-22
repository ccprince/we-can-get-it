# we-can-get-it

**We Can Get It For You** — a text space-trading game about finding the right good at the right shop
for the right buyer. **We Can Get It** is the short form. Nothing is built yet: a two-week prototype
answered the two questions it was built for and was then discarded on purpose. What survives it is
two documents.

## The canon

- **`docs/prototype-findings.md`** — what is **known**, with the evidence. Settled conclusions, dead
  ends, and the process that produced them.
- **`docs/design-overview.md`** — what is **undecided**, and in what order. The nine chunks the game
  is made of, and what to settle next, in order.
- **`GLOSSARY.md`** — the vocabulary, nearly all of it earned in play. Use these words; don't coin
  synonyms for them.
- **`docs/adr/`** — decisions. ADR 0003 governs code and should be read before writing any.

## No more up-front design documents

This is a rule, not a preference. Two prior attempts designed heavily up front and it did not help;
two weeks of play produced conclusions no amount of writing would have. **The two documents above
are the whole of the up-front writing** (overview §2).

So: a question that can only be answered by playing is answered by playing. Don't reason out a number
— every number in this game is found by measurement. Don't propose a document as the deliverable for
a design question. The output of design work is a playable milestone built to answer one named
question, plus a short write-up of what came of it.

## Do not re-litigate

The first six were tried, played and recorded, with reasons in findings §3; the rest were settled by a
design decision and the reasons are in the ADR's rejected alternatives. Read them before reopening one.

1. **Reducing notification load by hiding information.** Tried three ways; all addressed delivery,
   and the volume came from generation.
2. **Tuning per-entity event rates.** Rejected with arithmetic in ADR 0001.
3. **An adaptive change split** that favours whichever side the player has ignored. Rubber-banding.
4. **Warmth as an invisible price effect.** Comes back, but only with a legible handle (findings §2.3).
5. **An end screen listing memorable deliveries, under a purely monetary goal.**
6. **Zero-space goods in a galaxy where everything is wanted.** A bet that cannot be lost.
7. **A baseline daily burn** — upkeep, food, berth fees the player didn't buy. A slow-acting loan, which
   is the pressure shape ADR 0004 rejected; the burn is a number the player *chose* (ADR 0005).
8. **A calendar that only supplies reasons**, with nothing in it learnable in advance. Throws away the
   best answer available to the requirement that cross-campaign knowledge be the galaxy's grammar rather
   than its facts; schedules are published and exploitable (ADR 0005).
9. **A sub-day clock** — hours, or morning and afternoon. A second time unit on every reading surface,
   for a precision nothing in the design asked for; the day is atomic (ADR 0005).

**Every tuned number from the prototype is void** — the change budget of 4, the watch cap of 5, the
debt of 1,500, 16 jumps, a hold of 40, 300 starting credits, all of it. They were found at
prototype scale and none transfer. Quote one only as history, never as a starting point.

## Architecture

Five principles, stated fully in **ADR 0003**: one seam — a pure rules engine with no UI,
deterministic for a given content set, seed and command sequence, never reading the clock; content is
data the engine receives and never imports; a validator rejects content mistakes at load; rules live
in the engine, not the view; tests go through the public seam only, with fixed seeds and
purpose-built content, and new-field defaults in one place.

## Process

- **Instrument before redesigning.** Three guessed fixes for the notification load failed; one
  measurement harness named the cause in a pass. Build the harness first, as a throw-away with its
  own config, and report **the curve through a run, not just the mean**.
- **Two instruments, two jobs.** A scripted policy run gives counts and shape; it cannot give a
  verdict. Verdicts come from hand-play. Bracket a tuning decision with one seed played twice at two
  settings.
- **Ask "is there enough of this to judge it?"** before redesigning a mechanism that looks broken.
  More than once in the prototype a mechanism was starved, not wrong; a shape needs 2–4 instances
  before a verdict.
- **Write down what came of each play-test**, ending with what it settled, what became a ticket, what
  was deferred and why, and what is explicitly **closed**. Use `docs/playtests/TEMPLATE.md`.

## Agent skills

### Issue tracker

Issues live as GitHub issues in `ccprince/we-can-get-it`, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
