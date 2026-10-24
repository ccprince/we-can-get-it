# Running a ticket

**The default end of a ticket is a stack of open PRs**, one per slice, not a commit on `main`. Branch
before the first commit; the pre-commit hook refuses code on `main` and will catch it late if you
forget.

A **decision** — an ADR, a glossary change, the canon — is not a ticket and goes straight to `main`.
Every ADR in the log landed that way.

## Sizing a ticket

A ticket is one session's work, and the gate is **files written**. #10 and #9 bracket it, and #11
is the first measured under per-slice review (ADR 0010):

| | #10 | #11 | #9 |
| --- | --- | --- | --- |
| Acceptance criteria | 10 | 7 | 10 |
| Files written | 12 | 20 | 38 |
| Production insertions | 1601 | 868 | 3768 |
| Slices, each reviewed and pushed | 1 | 5 | 2 |
| Fit one session, review and PRs included | yes, at 229k | yes, at 332k | no, over two sessions |

**A ticket writes at most about twelve source files and sixteen hundred insertions** — #10's shape,
which landed clean in 41 minutes. A ticket that crosses content → loader → validator → read model →
command → view is a vertical slice; keep it thin at each layer, or split it by layer rather than by
feature.

**Criteria count does not discriminate**, and three tickets now say so: #9 and #10 carried ten each
and sat on opposite sides of the line, and #11 carried seven and finished comfortably. The cheap
check is worth keeping only as a loose filter — **eight or nine**, not five or six — and the files
are what decide. A cap of five or six would have split #11, which did not need splitting.

Read the curve, not the peak. Across eighteen sessions the context **floor is 39k** — the canon, the
skills and the system prompt, before a single file is read — and orientation ends between **85k and
138k, median 101k**; #11 paid 64.7k for it and was oriented at 105k.

**On the ceiling: #11 ended at 332k**, against the 274k this table once called too much. Either the
limit moved or that judgement was conservative, but do not read 274k as a wall. What a session
cannot afford is finishing with no headroom for a wrong turn, and #11 had headroom at 332k.

Implementation is what varies, and it varies by slice **size** rather than slice count: #11's five
slices cost 15.3k, then 47.7k for two of them together, then 55.5k, then 5.0k. The 7–11k a slice
this table used to quote holds only for slices the size of #11's first. A slice that moves one
seam is cheap; a slice that adds a stage and migrates thirteen test files is not.

Two things follow:

- **A ticket is too large when its slices will not fit in the middle.** Criteria that each want their
  own content set and seed are cheap and count lightly; criteria that each add a stage the next stage
  reads are dear — #9's first slice cost 14k because content, loader and validator moved together.
- **Splitting is not free — each half pays the floor and the orientation again.** #9's two sessions
  cost 203k and 108k, 311k in all, where #10 went end to end in one at 229k. Split for headroom, when
  a ticket would otherwise finish with none left for a wrong turn; not to reduce the total work,
  which it increases.

Orientation scales with the repo, so every number here goes stale as the canon grows — the 110k this
table first recorded held for exactly one ticket, and the 70k it quoted for review held for none.
Re-measure rather than trust them: the transcripts under `~/.claude/projects/` carry the token usage
per turn, **#32** holds the distributions and the reading that produced them, and the comment on
**#11** holds the review split below and how it was taken.

## What review costs, measured

`/code-review` was run once per slice through #11, four times in one session, and the cost splits in
two:

| | diff reviewed | green → both reports in | reports → findings committed |
| --- | --- | --- | --- |
| slice 1 | 120 prod ins | 7.9k | 7.7k |
| slices 2+3 | 430 prod ins, one review | 6.5k | 16.6k |
| slice 4 | 243 prod ins | 8.4k | 21.5k |
| slice 5 | 0 prod ins, 162 test ins | 8.1k | 19.2k |

**Receiving two reports costs 6.5–8.4k, and it is flat.** Across diffs of 120, 430, 243 and 0
production insertions the spread is under 2k and does not track size at all — the two agents run
context-fresh on the diff, so what the session pays is the reports and not the reading. That is
**half** the 14k #9 suggested, which was two reports plus the reading around them.

**Taking the findings is the real cost, and it is not per-invocation**: 7.7k to 21.5k, tracking how
much the review found. That is a property of the code, and a bundle would have paid it too —
arguably more of it, since a finding on a slice already reviewed cannot be found twice.

So the overhead a stack pays over a bundle is the report receipt, N times instead of once: for #11,
**31k against 8k, about 23k for the whole ticket**. Less than one slice's implementation.

**Review cost is therefore not what sizes a ticket.** Size on implementation and orientation. What
per-slice review buys for that 23k is worth more than it: #11's slice-4 review found a hard breach
of ADR 0009 decision 3 — four places where something the player sees was decided by `Map` insertion
order or by the order content happened to be written in — in the first green commit, and its slice-5
review found an assertion that could not fail. Neither is cheap to fix from a PR comment.

The **400-insertion budget** is the live constraint, and it binds on the **slice**: 400 production
insertions across 15 production files per PR, enforced by `.husky/pre-push` (**ADR 0010**). It does
not size the ticket — a slice is the review unit, so a ticket of any size satisfies it by stacking.
It is the thing that will actually stop you: #11's second slice came to 428 and had to be split
mid-flight, while no slice ever came close to exhausting the context. **Count a ticket's slices by
what fits 400 insertions, and let the count fall out of that** — five, for #11.

## The sequence

**A slice is the review unit** (ADR 0010). The session stays whole — orientation is paid once — but
each slice is pushed and reviewed as its own PR, stacked on the one before. That way a slice you have
already reviewed can be read while the next is being built.

1. **Branch per slice**, before the first commit, each named for its slice rather than the number:
   `git checkout -b reads-lanes-as-content`. The first slice branches off `main`; every later one
   branches off the slice before it, in step 4. If you have already committed on `main`:
   `git branch <name> && git reset --hard origin/main && git checkout <name>`.
2. **Take the slice to green, and commit it.** The hook runs `npm run check` on every commit, so a
   commit that lands is a commit that typechecks, lints and passes its tests. One commit per slice
   unless the findings in step 3 add one.
3. **Review the slice before its PR, not after**: `/mattpocock-skills:code-review <the slice's base>`,
   then take the findings in their own commit. The skeleton's review found a documented breach and a
   real bug, and both were cheaper to fix on the branch than in a PR comment.
4. **Push the slice, open its PR, then branch the next slice off it.** The base is `main` for the
   first slice and the previous slice's branch after that:

   ```
   git config branch.<slice>.prBase <parent>   # the hook's base, until the PR exists
   git push -u origin <slice>
   gh pr create --base <parent> --title "<slice subject> (#<n>)" --body-file <path>
   git checkout -b <next-slice>                # and back to step 2
   ```

   The body is what the `pr` skill's template asks for. Put `Closes #<n>` on the **last** slice's PR
   only — the ticket is not done until the stack is. Once a PR exists the hook reads its base from
   `gh`, so `prBase` matters only in the window before the PR is opened.

5. **Stop when the stack is up.** The stack is the deliverable. Merging is the human's call unless
   they ask.

If a slice fails the budget, it is two slices. Split it rather than reaching for `SIZE_EXEMPT=1`,
whose value is that it stays rare (ADR 0010).

## Merging, when asked

`gh pr merge <n> --rebase --delete-branch`. This repo allows all three methods and keeps a linear
log; `delete_branch_on_merge` is off on the remote, so `--delete-branch` is what removes the branch.

**A stack merges bottom-up**, one PR at a time, oldest first. GitHub retargets each child onto `main`
as its parent merges, so the children need no edit — and because the hook reads the base from `gh`,
a child pushed after that retarget is measured against `main`, which by then is the right base.

`--delete-branch` removes the branch only if the command reaches its local steps. PR #30's merge
went through on the remote and then aborted, leaving local `main` behind `origin/main` and the branch
alive on both sides. Treat the local side as unfinished until checked: `git fetch`, confirm
`origin/main`'s tree matches the branch tip you pushed, then `git reset --hard origin/main` and
delete the branch yourself if it is still there.

Afterwards, verify in **separate short commands** rather than one chain — `git log`, then
`gh pr view`, then `gh issue view`. A compound command run straight after a merge reads as a merge to
the permission classifier and gets denied whole, which costs more round-trips than the checks do.
