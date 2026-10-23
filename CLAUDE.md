# we-can-get-it

**We Can Get It For You** — a text space-trading game about finding the right good at the right shop
for the right buyer. **We Can Get It** is the short form. A two-week prototype answered the two
questions it was built for and was then discarded on purpose; what survives it is two documents. The
code starts at the walking skeleton (#7) and is built chunk by chunk, each a playable milestone.

## The canon

- **`docs/prototype-findings.md`** — what is **known**, with the evidence. Settled conclusions, dead
  ends, and the process that produced them.
- **`docs/design-overview.md`** — what is **undecided**, and in what order. The nine chunks the game
  is made of, and what to settle next, in order.
- **`GLOSSARY.md`** — the vocabulary, nearly all of it earned in play. Use these words; don't coin
  synonyms for them.
- **`docs/adr/`** — decisions. ADR 0003 governs code and should be read before writing any.
- **`CODING_STANDARDS.md`** — read at review time: where the standards live, which are judgement
  calls, and which are already checks.

## No more up-front design documents

This is a rule, not a preference. Two prior attempts designed heavily up front and it did not help;
two weeks of play produced conclusions no amount of writing would have. **The two documents above
are the whole of the up-front writing** (overview §2).

So: a question that can only be answered by playing is answered by playing. Don't reason out a number
— every number in this game is found by measurement. Don't propose a document as the deliverable for
a design question. The output of design work is a playable milestone built to answer one named
question, plus a short write-up of what came of it.

## Do not re-litigate

Nine questions are **closed** — six tried in play, three settled by decision — and so is every tuned
number the prototype found. They are listed with their reasons in **`docs/closed-questions.md`**.
Read it before reopening a settled question or quoting a prototype number.

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

### Finishing a ticket

A ticket ends in an **open PR**, not a commit on `main`; a decision goes straight to `main`. The
sequence, and how this repo merges, is in `docs/agents/workflow.md`.

### Issue tracker

Issues live as GitHub issues in `ccprince/we-can-get-it`, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
