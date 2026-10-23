# Running a ticket

**The default end of a ticket is an open PR**, not a commit on `main`. Branch before the first
commit; the pre-commit hook refuses code on `main` and will catch it late if you forget.

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

Orientation scales with the repo, so these numbers go stale as the canon grows — the 110k this table
first recorded held for exactly one ticket. Re-measure rather than trust them: the transcripts under
`~/.claude/projects/` carry the token usage per turn, and **#32** holds both distributions and the
reading that produced them.

## The sequence

1. **Branch first**, before the first commit, named for the work rather than the number:
   `git checkout -b walking-skeleton`. If you have already committed on `main`:
   `git branch <name> && git reset --hard origin/main && git checkout <name>`.
2. **Commit** as the work settles. The hook runs `npm run check` on every commit, so a commit that
   lands is a commit that typechecks, lints and passes its tests.
3. **Review** before the PR, not after: `/code-review`, then take the findings in their own commit.
   The skeleton's review found a documented breach and a real bug, and both were cheaper to fix on
   the branch than in a PR comment.
4. **Push and open the PR**, with the body the `pr` skill's template asks for:
   `git push -u origin <name>` then `gh pr create --title "<ticket title> (#<n>)" --body-file <path>`.
   Open the body with `Closes #<n>` so the merge closes the ticket.
5. **Stop there.** The PR is the deliverable. Merging is the human's call unless they ask.

## Merging, when asked

`gh pr merge <n> --rebase --delete-branch`. This repo allows all three methods and keeps a linear
log; `delete_branch_on_merge` is off on the remote, so `--delete-branch` is what removes the branch.

`--delete-branch` removes the branch only if the command reaches its local steps. PR #30's merge
went through on the remote and then aborted, leaving local `main` behind `origin/main` and the branch
alive on both sides. Treat the local side as unfinished until checked: `git fetch`, confirm
`origin/main`'s tree matches the branch tip you pushed, then `git reset --hard origin/main` and
delete the branch yourself if it is still there.

Afterwards, verify in **separate short commands** rather than one chain — `git log`, then
`gh pr view`, then `gh issue view`. A compound command run straight after a merge reads as a merge to
the permission classifier and gets denied whole, which costs more round-trips than the checks do.
