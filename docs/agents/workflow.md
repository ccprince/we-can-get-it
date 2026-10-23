# Running a ticket

**The default end of a ticket is a stack of open PRs**, one per slice, not a commit on `main`. Branch
before the first commit; the pre-commit hook refuses code on `main` and will catch it late if you
forget.

A **decision** — an ADR, a glossary change, the canon — is not a ticket and goes straight to `main`.
Every ADR in the log landed that way.

## Sizing a ticket

A ticket is one session's work, and the gate is **files written**. #10 and #9 bracket it:

| | #10 | #9 |
| --- | --- | --- |
| Acceptance criteria | 10 | 10 |
| Files written | 12 | 38 |
| Insertions | 1601 | 3768 |
| Fit one session, review and PR included | yes, at 229k | no — it would have ended near 274k |

**A ticket writes at most about twelve source files and sixteen hundred insertions** — #10's shape,
which landed clean in 41 minutes. Both tickets carried ten criteria, so **criteria count does not
discriminate**: cap a ticket at **five or six** as the cheap check to run first, but the files are
what decide. A ticket that crosses content → loader → validator → read model → command → view is a
vertical slice; keep it thin at each layer, or split it by layer rather than by feature.

Read the curve, not the peak. Across eighteen sessions in this repo the context **floor is 39k** —
the canon, the skills and the system prompt, before a single file is read — and orientation ends
between **85k and 138k, median 101k**. Implementation costs **7–11k a slice**. Review, findings, PR
and merge cost about **70k** after the last slice passes; `/code-review`'s two agents run
context-fresh on the diff, so the review adds little beyond their reports.

Two things follow:

- **A ticket is too large when its slices will not fit in the middle.** Criteria that each want their
  own content set and seed are cheap and count lightly; criteria that each add a stage the next stage
  reads are dear — #9's first slice cost 14k because content, loader and validator moved together.
- **Splitting is not free — each half pays the floor and the orientation again.** #9's two sessions
  cost 203k and 108k, 311k in all, where #10 went end to end in one at 229k. Split for headroom, when
  a ticket would otherwise finish with none left for a wrong turn; not to reduce the total work,
  which it increases.

The **review** budget is the other constraint, and the tighter one: 400 production insertions across
15 production files per PR, enforced by `.husky/pre-push` (**ADR 0010**). It does not size the
ticket — a slice is the review unit, so a ticket of any size satisfies it by stacking — but a ticket
whose slices each blow the budget is a ticket whose slices are too coarse.

Orientation scales with the repo, so these numbers go stale as the canon grows — the 110k this table
first recorded held for exactly one ticket. Re-measure rather than trust them: the transcripts under
`~/.claude/projects/` carry the token usage per turn, and **#32** holds both distributions and the
reading that produced them.

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
