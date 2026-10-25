#!/usr/bin/env bash
# Print a ticket and then its parent milestone, in full: state, labels, blockers,
# body and comments. `gh issue view --comments` prints nothing when piped, so
# this goes through --json. Usage: tools/ticket.sh <number> [--no-parent]
set -eu

n=${1:?usage: tools/ticket.sh <number> [--no-parent]}

show() {
  gh issue view "$1" --json number,title,state,labels,parent,body,comments --jq '
    "#\(.number) \(.title) [\(.state)] labels: \([.labels[].name] | join(", "))",
    (if .parent then "parent: #\(.parent.number)" else empty end),
    "", .body,
    (.comments[] | "", "--- comment by \(.author.login) ---", .body)'
}

show "$n"

parent=$(gh issue view "$n" --json parent --jq '.parent.number // empty')
if [ -n "$parent" ] && [ "${2:-}" != "--no-parent" ]; then
  printf '\n======== PARENT ========\n'
  show "$parent"
fi
