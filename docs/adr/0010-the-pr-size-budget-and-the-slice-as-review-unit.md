# ADR 0010: The PR size budget, and the slice as the review unit

**Status:** accepted, 2026-10-23
**Context:** `docs/agents/workflow.md` (sizing a ticket, the sequence), issue #32 (the session curve),
the `snaphunter` project's ADR 0034 (what the budget measures) and ADR 0064 (how a stacked branch is
measured), which this decision ports rather than re-derives

## Context

A ticket is one session's work and ended, until now, in one PR carrying the whole session. #9 showed
what that costs a reviewer: 889 production insertions across 14 files in a single diff. #10, the
ticket before it, was 907 across 7. Both are more than double the budget below, and neither was
reviewable in the sense the review is for.

The session curve was measured first and pointed the wrong way. Across eighteen sessions there is no
measurable degradation from context: the rate of hard tool errors is flat at 5.3–6.6% from 40k to
220k, so a context ceiling is a poor reason to make tickets smaller. What does degrade with diff size
is review, and the `snaphunter` project already found the budget that holds it — **400 production
insertions across 15 production files**, measured over twenty merged PRs, where the largest observed
PR came in at 371 across 13 and nothing was being missed.

The number arrived here with one piece of evidence attached that `snaphunter` could not have: this
repo's commits were already inside it. Measured against its own parent, **every commit in the log but
the walking skeleton's first falls under the budget** — the largest at 330 insertions across 3 files,
the widest at 9 files, against the skeleton's 1039 across 24. The slices this repo already writes are
review-sized. Only the bundle of them was not.

## Decision

**The review unit is the slice, not the ticket.** A ticket is still one session and one branch; each
slice is pushed as its own PR, stacked on the one before, and reviewed on its own. The session does
not end at the first push.

**The budget is 400 production insertions across 15 production files**, enforced by `.husky/pre-push`.
The numbers are `snaphunter`'s and are adopted on its evidence, not re-derived here.

**Production is the default bucket.** A path counts unless it matches `*.test.ts(x)`, `tests/`,
`docs/`, `*.md`, or `package-lock.json`. Enumerating what counts would let a directory nobody
anticipated fall silently out of the budget; enumerating what does not means the failure mode is a
check that is briefly too strict rather than one that is quietly hollow. `content/` counts — a
content set is what the engine is handed, and a mistake in one is the kind the validator exists to
catch.

**Deletions and test insertions are reported, never enforced.** The hook prints both on every push,
including passes. The review burden of a deletion is "is this dead?", which the PR description
answers; and the largest test diff in this repo's log is 202 insertions, well inside any ceiling
worth setting. Reporting keeps both visible, and a ceiling can be added if the risk materialises.

**A stacked branch is measured against the branch it is stacked on.** The parent's insertions are
already under review in the parent's own PR, and counting them again would fail a child for work it
does not contain. The base resolves in order: `PR_BASE=<branch>` in the environment, then
`gh pr view <branch> --json baseRefName`, then `git config branch.<name>.prBase`, then `main`. GitHub
is consulted ahead of local config because it is the only source that stays true as the stack moves,
including the automatic retarget to `main` when a parent merges. A named base that exists nowhere
falls back to `main` with a warning rather than failing the push.

**`SIZE_EXEMPT=1` is the single deliberate escape**, and its frequency is the calibration signal. If
it stays frequent, the threshold is wrong and the response is to change the threshold — not to widen
the escape, whose whole value is being rare.

**Pushes to `main` are not guarded.** A decision belongs on `main`, and the pre-commit hook already
refuses code there.

## Why ported and not re-derived

`snaphunter`'s ADR 0034 rejected raising its number while keeping its measure, on the grounds that at
any threshold tests and ADRs stay the cheapest lines to cut when the check goes red. The measure was
the fix; 400 was never the thing that bound too tightly. Re-deriving a number here would mean
reasoning one out, which this repo does not do, against a sample of two tickets. Porting it means
inheriting twenty merged PRs of calibration and this repo's own sixteen in-budget slices as the check.

## Consequences

- #9 as it was built becomes eight PRs, the largest 275 insertions across 4 files. As one PR it
  measured 889 across 14 — inside the file budget and more than double the line budget.
- The budget binds on lines, not files. #10 measured 907 insertions across just 7 files, and no commit
  since the skeleton has exceeded 9. Only the skeleton itself, at 24 files, would have failed on
  spread.
- Of the four tickets in the log, only #8 would pass as a single PR, at 382 insertions across 9 files.
- Review runs per PR, so a reviewed slice can be read while the next one is being built. This is the
  reason for per-PR over once-over-the-branch, and it is the one benefit a single big PR cannot give.
- A pure-deletion slice measures zero insertions and can only be caught by the file budget. This
  follows from counting insertions only and is accepted.
- The hook makes one `gh` call per push on a branch with an open PR. `gh` missing, unauthenticated or
  offline is not an error; resolution falls through to config, then `main`.
- Orientation is paid once per ticket, not once per PR, because the session is still whole. This is
  what makes the slice affordable as a review unit where a slice-sized *ticket* would not be.
