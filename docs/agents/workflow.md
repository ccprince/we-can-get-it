# Finishing a ticket

**The default end of a ticket is an open PR**, not a commit on `main`. Branch before the first
commit; the pre-commit hook refuses code on `main` and will catch it late if you forget.

A **decision** — an ADR, a glossary change, the canon — is not a ticket and goes straight to `main`.
Every ADR in the log landed that way.

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

Afterwards, verify in **separate short commands** rather than one chain — `git log`, then
`gh pr view`, then `gh issue view`. A compound command run straight after a merge reads as a merge to
the permission classifier and gets denied whole, which costs more round-trips than the checks do.
