#!/usr/bin/env bash
# Merge a stacked PR, and every open PR below it, through GitHub's asynchronous
# merge API, then wait for the result (docs/agents/workflow.md, "Merging").
#
#   tools/merge-stack.sh <pr> [deadline-seconds]
#
# Pass the top PR to merge the whole stack, or one PR at a time for bottom-up.
# The request is pinned to the PR's head as it stands now, so a push made after
# it cancels the merge rather than slipping into it.
#
# Prints the final status JSON. Exits 0 on merged, 1 on failed, 2 on a timeout
# or a request GitHub refused.
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "usage: tools/merge-stack.sh <pr> [deadline-seconds]" >&2
  exit 2
fi
pr=$1
deadline=$((SECONDS + ${2:-600}))
repo=repos/ccprince/we-can-get-it/pulls/$pr/merge-async
api=(gh api -H "X-GitHub-Api-Version: 2026-03-10")

sha=$(gh pr view "$pr" --json headRefOid --jq .headRefOid)
echo "merge-stack: requesting a rebase merge of #$pr at $sha" >&2

if ! request=$("${api[@]}" -X PUT "$repo" \
  -f merge_method=rebase -f merge_action=direct_merge -f sha="$sha"); then
  echo "merge-stack: GitHub refused the request: $request" >&2
  exit 2
fi
uuid=$(jq -r '.details.uuid // empty' <<<"$request")
if [ -z "$uuid" ]; then
  echo "$request"
  [ "$(jq -r .status <<<"$request")" = merged ] && exit 0
  exit 2
fi

status=$request
until [ $SECONDS -ge $deadline ]; do
  status=$("${api[@]}" "$repo/$uuid" 2>/dev/null || true)
  case $(jq -r '.status // empty' <<<"$status" 2>/dev/null) in
    merged) echo "$status"; exit 0 ;;
    failed) echo "$status"; exit 1 ;;
  esac
  sleep 10
done

echo "merge-stack: no result before the deadline; last status: $status" >&2
exit 2
