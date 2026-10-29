#!/usr/bin/env bash
# Stop hook: a slice branch with commits must be pushed and have an open PR
# (or a merged one) before the session stops (docs/agents/workflow.md, steps 3-4). Exit 2 sends
# the message back to the agent; exit 0 lets it stop.
set -u

# Already blocked once this turn; let it stop rather than loop.
if [ "$(jq -r '.stop_hook_active // false' 2>/dev/null)" = "true" ]; then
  exit 0
fi

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || exit 0
if [ "$branch" = "main" ] || [ "$branch" = "HEAD" ]; then
  exit 0
fi

# A branch with nothing beyond main has no slice to push.
if [ "$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)" = "0" ]; then
  exit 0
fi

if [ "$(git rev-list --count "origin/$branch..HEAD" 2>/dev/null || echo 1)" != "0" ]; then
  echo "Slice branch '$branch' has commits that are not pushed. Review the slice, push it and open its PR (docs/agents/workflow.md, steps 3-4), then branch the next slice." >&2
  exit 2
fi

# A merged PR is a slice that is done, so only a branch with neither an open nor
# a merged PR is missing one.
if [ -z "$(gh pr list --head "$branch" --state all --json number,state --jq '.[] | select(.state != "CLOSED") | .number' 2>/dev/null)" ]; then
  echo "Slice branch '$branch' is pushed but has no open PR. Open it against its parent (docs/agents/workflow.md, step 4)." >&2
  exit 2
fi
