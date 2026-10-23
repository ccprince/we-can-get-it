# Running a ticket

**The default end of a ticket is an open PR**, not a commit on `main` — reached across **two
sessions**, one to build and one to review and ship. Branch before the first commit; the pre-commit
hook refuses code on `main` and will catch it late if you forget.

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

These numbers are one session read by hand and will go stale as the canon and the skills grow.
Re-measure rather than trust them: the session transcripts under `~/.claude/projects/` carry the
token usage per turn, and #32 is the open question of whether that reading is worth an instrument.

## The sequence

1. **Branch first**, before the first commit, named for the work rather than the number:
   `git checkout -b walking-skeleton`. If you have already committed on `main`:
   `git branch <name> && git reset --hard origin/main && git checkout <name>`.
2. **Commit** as the work settles. The hook runs `npm run check` on every commit, so a commit that
   lands is a commit that typechecks, lints and passes its tests.
3. **Push, and stop.** `git push -u origin <name>`. The implementing session ends here, with the
   branch pushed and no PR.

   **`/implement` will tell you to review now. In this repo that call belongs to the next session**
   — the skill's last two lines are "call the Skill tool with code-review" and "commit your work to
   the current branch", and the first of them is the 70k this break exists to move. Commit, push,
   and hand back.

4. **Review in a new session**, on the branch: `/mattpocock-skills:code-review main`. It needs the
   fixed point and nothing else — it finds the ticket from the `(#<n>)` in the commit messages and
   `CODING_STANDARDS.md` by searching, which is why a cold session can do this at all.

5. **Take the findings in their own commit, then open the PR** — both in that second session.
   `/code-review` only reports; it does not fix, commit or open anything, so these are the
   session's own jobs and not the skill's. Review before the PR, not after: the skeleton's review
   found a documented breach and a real bug, and both were cheaper to fix on the branch than in a
   PR comment. Then `gh pr create --title "<ticket title> (#<n>)" --body-file <path>`, with the
   body the `pr` skill's template asks for and `Closes #<n>` at the top.

6. **Stop there.** The PR is the deliverable. Merging is the human's call unless they ask.

**Why the sequence breaks at the push.** Reviewing and shipping cost about 70k and need none of the
implementation history: `/code-review`'s two agents already run context-fresh on the diff alone, and
taking their findings needs only the files those findings name. A second session re-orients on a
diff for about 30k, where the implementing session paid 110k to re-orient on the canon — so the
break removes 70k from the full context and adds 30k to an empty one. It also puts a reader on the
diff who has not spent the last hour convincing itself the design was right.

This also splits what `/retro` looks back on. Run it in whichever session holds the material — the
implementing one for how the work went, the reviewing one for what the review caught — or point it
at the other session's log, which is how this rule was written.

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
