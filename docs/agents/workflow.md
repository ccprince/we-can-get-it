# Running a ticket

**The default end of a ticket is an open PR**, not a commit on `main`. Branch before the first
commit; the pre-commit hook refuses code on `main` and will catch it late if you forget.

A **decision** — an ADR, a glossary change, the canon — is not a ticket and goes straight to `main`.
Every ADR in the log landed that way.

## Sizing a ticket

A ticket is one session's work. What that costs was measured on #10, the largest so far — nine
acceptance criteria, 1601 insertions across 12 files, landed clean in 41 minutes:

| Through the end of | Context |
| --- | --- |
| Orientation — the ticket, its parent, the ADRs it cites, the code it touches | 110k |
| Seven TDD slices | 159k |
| `/code-review`, two agents | 193k |
| Taking the findings, the PR, the merge | 230k |

Read the curve, not the peak. **Orientation and shipping are close to fixed** — about 110k before the
first test is written, about 70k after the last one passes — and the implementation cost **7k a
slice**. A ticket's own size buys only the middle.

Two things follow:

- **A ticket is too large when its slices will not fit in the middle.** Nine criteria over one pure
  function fit. Criteria that each want their own content set and seed are cheap and count lightly;
  criteria that each add a stage the next stage reads are dear.
- **Splitting is not free — each half pays the fixed cost again.** Two halves of #10 would have run
  about 155k apiece rather than 115k. Split for headroom, when a ticket would otherwise finish with
  none left for a wrong turn; not to reduce the total work, which it increases.

Measure the next one rather than trusting these numbers: the session transcripts under
`~/.claude/projects/` carry the token usage per turn.

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
