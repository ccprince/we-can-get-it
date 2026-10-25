# Running a ticket

**A ticket ends in a stack of open PRs**, one per slice, not a commit on `main`. Invoking a skill on
a ticket authorises the push and the PR for each slice: do them without asking. A skill that ends
at "commit to the current branch" is describing one step of the loop below, not the finish.

Branch before the first commit; the pre-commit hook refuses code on `main` and will catch it late if
you forget. A **decision** — an ADR, a glossary change, the canon — is not a ticket and goes straight
to `main`.

Planning a ticket or deciding where to split it: `docs/agents/sizing.md`.

## The sequence, per slice

**A slice is the review unit** (ADR 0010). The session stays whole — orientation is paid once — but
each slice is pushed and reviewed as its own PR, stacked on the one before. That way a slice you have
already reviewed can be read while the next is being built.

Commit, review, push, PR, then the next slice. A slice with no PR is not done, and the next slice
does not start until it has one.

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

5. **Link the PRs as a GitHub stack** once the last slice's PR is open, numbers bottom to top. A
   stack is fixed once created: it cannot be extended or deleted through the API. If a slice is
   added after linking, open its PR on the right base, leave it outside the stack, and tell the
   human. Step 4
   already made each PR's base the head of the one below, which is what the call checks:

   ```
   gh api -X POST repos/ccprince/we-can-get-it/stacks -H "X-GitHub-Api-Version: 2026-03-10" \
     -F 'pull_requests[]=<first>' -F 'pull_requests[]=<second>'   # one -F per slice
   ```

   A `201` is the stack; a `422` names the base that does not match. A one-slice ticket has no stack.

6. **Stop when the stack is up.** The stack is the deliverable. Merging is the human's call unless
   they ask.

If a slice fails the budget, it is two slices. Split it rather than reaching for `SIZE_EXEMPT=1`,
whose value is that it stays rare (ADR 0010).

## Merging, when asked

Step 5 linked the slices as a **GitHub stack**, and `gh pr merge` refuses a PR in one: a stacked PR
merges only through the asynchronous merge API, which takes a request and runs the merge in the
background.

**Merge the whole stack in one call, on the top PR**: `tools/merge-stack.sh <top>`, run in the
background. A merge request on a stacked PR also merges every open PR below it; #33's two-slice
stack merged in one request. The script pins the request to the PR's head as it stands, so a push
made after it cancels the merge rather than slipping into it. It passes `rebase`, since this repo
keeps a linear log, then polls with a ten-minute deadline (a second argument changes it) and
prints the final status. Exit `0` is merged; `1` is failed, with GitHub's message saying why; `2`
is a refused request or the deadline.

**Fall back to bottom-up**, `tools/merge-stack.sh` on one PR at a time, when the one-call merge
fails or when only part of the stack should land. #12's two-slice stack merged this way. After each
parent merges, GitHub retargets the child onto `main` and **rebases it itself**, so the child's head
SHA changes. Before merging the child, `git fetch` and confirm that `git diff <the tip you pushed>
origin/<child>` is empty. The rebase should not change the tree, and that check is what tells you
it didn't. Then run the script on the child, which pins to its new head.

**Treat the local side as unfinished until checked.** #12's merge removed both remote branches on
its own, even though `delete_branch_on_merge` is off. Check rather than assume:
`git ls-remote --heads origin <branches>`. Then `git fetch --prune`, confirm `origin/main`'s tree
matches the tip you pushed, fast-forward local `main`, and delete the local branches.

Afterwards, verify in **separate short commands** rather than one chain — `git log`, then
`gh pr view`, then `gh issue view`. A compound command run straight after a merge reads as a merge to
the permission classifier and gets denied whole, which costs more round-trips than the checks do.
