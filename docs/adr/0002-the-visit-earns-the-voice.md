# ADR 0002: The visit earns the voice, not the want

**Status:** accepted, 2026-10-13 (designer), implemented 2026-10-20
**Context:** `.scratch/changing-galaxy/issues/06-un-gate-the-wants.md` (the ticket this decision settles), `smallest-playable` tickets 20 and 25, stories 30, 31 and 36 of `.scratch/smallest-playable/spec.md`, ADR 0001

_The `.scratch/` specs and tickets cited above went with the `schlepper` prototype and no longer exist; the decision stands on its own._


## Context

Ticket 20 made the visit the gate on everything a buyer had to say: until the player walked in, a buyer was a name on
a door, and their wants reached the player nowhere. The bet was that a player drowning in notifications would stop
visiting rather than collect more of them, so the gate would shrink the flood.

Play-testing (seed 950669, 2026-10-12) proved the premise false. The player visited every buyer as fast as they could
regardless, so the gate delayed the flood without shrinking it, and not having the wants "felt like I was missing
something important."

The volume half of the problem is settled upstream by ADR 0001: change is generated against a budget, and only
counted-on changes are announced. That leaves one question, which is about immersion and not about volume. With the
gate off, the contacts list fills with buyers the player has never met, each speaking a want in their own voice: land
on Dock Nine, jump to Ceres, open the contacts, and all the Dock Nine buyers are talking.

## Decision

**The gate comes off the want and goes onto the voice.**

- A buyer's open wants reach the player **by landing where they live**. No visit, and their wants are in the contacts
  list from then on, as last known.
- An **unmet** buyer's want is reported **plainly** — "needs parts for the pumps" — on their door, in the contacts
  list, and in any announcement about it.
- The character's **own wording** arrives on **calling on them**, and from then on that is what the player is shown.
- The visit keeps its gesture, the "New" pill on the door keeps its meaning, and selling still needs the visit first.

Ticket 20's withholding criterion — "No news of a new, winding-down or expired want reaches the player for a buyer
they haven't visited or been introduced to" — is **retired**. What play-testing said the player missed was the
**wants**, not the wording, so the wording is the half of ticket 20 worth keeping. It also keeps meeting someone worth
doing now that nothing else is withheld.

## How a plain form is come by

A want's authored `wording` is the character's voice, so the plain form has to come from somewhere else. The ticket
preferred one **composed** from the want's own terms — the buyer, their place, the good or the tags — because it costs
no content work. That route is closed: `content/README.md` and the `Good.tags` comment both say the player never sees
tags, and the only other term, a want's `item`, names the answer outright. Composing from the buyer's name and place
alone says no more than "there is a want here."

So the plain form is **authored, one per want**: an optional `plainly` on a want, written as the buyer's side of the
sentence ("wants a drink", "needs plate metal for the dome ribs"), so it reads on a line of its own and inside a
notice. Every non-vague want in `content/galaxy.json` and `content/starter.json` has one.

**A vague want can't have one, and the content checks refuse it.** A vague want ("Old Marta's been homesick lately")
describes a situation and names no category; any plain statement of what would do is exactly the working out story 36
reserves for the player, and ticket 09 already keeps the announcement machinery from doing it for them. The honest
plain form for a vague want is that there **is** a want, named by the buyer, with the wording withheld until the
visit — which is what a want with no `plainly` gets.

## Consequences

- `Want` gains optional `plainly`; a vague want with one is a content error. A non-vague want **without** one is not:
  it falls back to the withheld form, which is well defined, and the engine's test content leans on that. The cost of
  forgetting one is a buyer who says nothing until the player calls, which `content/README.md` warns about rather than
  the checks refusing.
- A want the player knows of is carried as a `Wording`: `own` (heard by calling), `plain`, or `withheld`. The page
  words all three; the engine composes no prose of its own beyond choosing between them.
- `contacts` now lists buyers the player has only landed on. `Lead` — the unmet shape — keeps `introducedBy` only
  where a character made the introduction, and the page marks the rest "Not met".
- A buyer's door carries their wants said plainly, along with the name and the "New" pill. Their flavour, their own
  wording and whether anything in the hold fits still wait for the player to walk in.
- The counted-on filter reaches further: a buyer the player has landed on can now be counted on, so news about them is
  announced, in the plain form. A hidden buyer nobody has told the player about is still unknown, having no door.
- The new-want draw's 3:1 weight toward "a buyer the player knows of" now follows **where the player has been**
  rather than who they called on, which is the same intent on a wider set.
- The risk: with wants reaching the player from landing alone, calling on a buyer may come to feel like a formality.
  The play-test checklist asks after it directly.
