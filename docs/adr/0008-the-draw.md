# ADR 0008: The draw is an ordered cascade over the reserve, sized by one number

**Status:** accepted, 2026-10-22; decision 11 amended 2026-10-29 (#124): the goods pass spares a role
tag held at a drawn location as it spares a kind's floor; amended again 2026-10-30 (#127): it keeps a
good a buyer at a drawn location wants by name.
**Context:** `docs/design-overview.md` §4 chunk 3, §5 (the question this settles), §6 item 4;
`docs/prototype-findings.md` §2.1, §2.2, §2.3, §2.5; ADR 0002, ADR 0003, ADR 0004, ADR 0006, ADR 0007

## Context

This is the **last** of the four upstream parameters of overview §5, and the last thing between the canon
and the first playable milestone. ADR 0007 handed it a job in the same shape ADR 0005 handed route length
to ADR 0006: **the reserve must satisfy every archetype the motifs demand, at the draw size, with this
campaign's hidden locations excluded.**

Three settled things converge here and had never been put in one room. ADR 0004 decision 18 draws the
cast once per campaign from a reserve larger than one campaign can see — locations, connections, goods in
circulation, people, **who is hidden**, and the patrons the ladder is built from — without saying whether
that is one roll or six. ADR 0006 decision 3 assembles the map from authored motifs with slots typed in
tag vocabulary, which means some of those draws constrain the others. And ADR 0007 decision 17 turned the
slot's type into an enumerated archetype declaring kind sets, which is the thing the reserve has to be
adequate *for*.

The pressure is a counted failure, as usual. **Prospecting died by the fourth prototype run** — "after
this many runs the galaxy is known" — and findings §2.5 is precise about the cause: the per-run shuffle of
stock, prices and starting wants was not enough, because *who is hidden* was fixed by the content. The
example it gives is load-bearing and is answered by decisions 10 and 16 below: *"an introduction is
authored dialogue naming a particular buyer, so a returning player knows from the start who is on Ceres."*
A bigger galaxy delays that and does not solve it. **Shuffle who and what is hidden, and hold more content
than one campaign can see** is therefore not a sizing instruction; it is a structural one, and it reaches
further into the content pipeline than it looks.

Settled on 2026-10-22 in three rounds of questions. Every number in this ADR is either a **declared
content-set bound** or a **sizing estimate** in the tier ADR 0007 decision 16 established. None of them is
a finding.

## Decision

### Vocabulary first

**1. The location archetype is called an *archetype*, and *character* means only a person.** ADR 0007
decision 17 named the enumerated `extractor`/`processor`/`market` vocabulary a **character**, which
collided with the word the prototype earned for a person with their own voice and quirks (findings §2.4,
ADR 0002, `GLOSSARY.md` under **buyer**). This ADR is where the collision becomes load-bearing, because it
has to say *draw a location for this slot, then draw the characters who are there* in one breath. The
person sense is older and irreplaceable; the archetype sense is one day old, so it moves.

**Archetype** rather than a fiction word, because decision 17 only ever shows the player the **expanded
kinds** on the trade guide — the archetype's name is read by the motif slot and the validator and by
nobody else. It is a designer-facing word for a designer-facing thing, and naming it after something the
fiction says would be a promise the fiction never keeps.

### What the draw is

**2. The draw is an ordered cascade, and the map goes first.** Not six independent rolls. Independent rolls
produce a buyer whose home was never drawn, a want pointing at a good nobody in this galaxy stocks, and a
patron whose ladder cannot be composed — and each of those is a campaign that has to be thrown away after
it is built. So: the map is assembled first (motifs → typed slots → locations from the reserve), and every
later stage is conditioned on what the map has already fixed. The order is **motifs, locations, kinds,
goods, people, patrons**, and it is that order because each stage constrains the next: a kind only stays in
circulation if some drawn archetype supplies or demands it (decision 11), a person needs a drawn location
to stand on, and a patron's ladder is composed against everything above (decision 14).

Conditioning is also what makes ADR 0007's inherited constraint a checkable sentence rather than a hope.
"The reserve must satisfy every archetype the motifs demand" only has a meaning once the motifs are chosen
before the locations.

**3. The draw is a single roll at campaign start, and nothing enters the galaxy afterwards.** ADR 0004
decision 18 says drawn once and only *state* moves; ADR 0006 decision 14 says acts move the patrons and not
the walls, and decision 15 says everything drawn is visitable. Stated here as the boundary this ADR
enforces rather than re-decided: clearing an act reveals **no new content**. The patrons an act adds to the
roster were drawn at campaign start and were simply not yet offering; no undrawn location ever becomes
drawn; no hidden person ever surfaces. What an act moves is what is *offered*, which is the whole of ADR
0004 decision 13's job for standing.

**4. The reserve leaves no trace inside a campaign.** An undrawn location does not exist this campaign. It
is not unreachable, not unknown, not greyed on the chart, not hinted at by anybody's dialogue. From inside
the fiction the galaxy is exactly what the chart shows (ADR 0006 decision 5), and it looks generated and
complete. That the reserve exists at all is cross-campaign **grammar** the player learns about the game
(ADR 0004 decision 19), never a fact inside one. A greyed-out place would be a wall with no price on it,
which ADR 0006 decision 14 already rejected in its other form.

### The dial, and the map's share

**5. The draw has one dial, and it is the motif count.** Overview §5's whole method is that scale is a
consequence of something upstream, and the same move applies inside this ADR: a content set declares **how
many motifs a campaign is assembled from** — one number, found by measurement — and every other drawn
quantity is a declared ratio over its own reserve rather than a free dial. One dial means "how much of the
galaxy one campaign sees" has a single answer, and the first measurement has exactly one thing to move.

The count is of motifs **placed**, duplicates included (decision 7), because the dial has to be the thing
the location count is a sum of.

**6. Motifs join by lanes, never by shared locations.** Assembly adds **inter-motif lanes** between whole
motifs; a location belongs to exactly one motif. Overlapping at a shared node is the obvious way to make a
connected graph and it dissolves the thing motifs are for: a chokepoint in one motif doubles as a spur end
in another and neither shape is a shape any more. Keeping them whole also makes the location count a plain
sum of the drawn motifs' sizes, which is what lets decision 8 be stated as a range. The inter-motif lanes
are where the long hauls live, and where ADR 0006 decision 3's far-cluster invariant actually bites.

**7. Motifs are drawn from a motif reserve, may repeat, and need their instances only across campaigns.**
If every campaign assembles from all the authored motifs, the map's *grammar* is identical every time and
only its facts move, which is less than ADR 0006 decision 3 promised — the grammar is meant to survive
between campaigns, not to be exhaustively displayed in each one. So motifs are drawn like everything else,
and a motif **may appear more than once** in one assembly: two spurs filled by different locations is a
legible galaxy. In practice duplicates are rare at the sizes of decision 19; they earn their place when the
invariants force one, as when a content set's only chokepoint shape is needed twice.

The third part of this is what keeps the galaxy from doubling in size. CLAUDE.md's rule that a shape needs
2–4 instances before a verdict is satisfied for motifs **across campaigns**, because a motif is explicitly
part of the grammar that persists while its facts are redrawn. Requiring it within a campaign would force
ten-plus motifs and a map several times larger than anything else in this ADR wants.

**8. The location count is free inside a validated range.** It is not the dial and it is not fixed. A fixed
location count would make every campaign the same size, which is variability spent in the wrong dimension;
a count left entirely free lets an unlucky assembly of small motifs open a nine-location galaxy. So a
content set declares a **range the location count must land in**, checked after assembly, and an assembly
outside it re-rolls the motif selection — the narrowest re-roll available, since nothing downstream has
happened yet (decision 17).

### What is held back

**9. The reserve's adequacy is stated per archetype, never as a global ratio.** "The reserve is three times
the draw" is the easy form and the wrong shape: a reserve three times over can hold one `processor` while
the motifs demand four. So, for **every archetype**: the reserve must hold at least the most simultaneous
slots of that archetype any legal motif assembly can demand, plus a declared surplus, **with this
campaign's hidden locations excluded from the count**. That is ADR 0007's inherited constraint, discharged.
A global draw-to-reserve ratio survives only as a sizing estimate (decision 19) and is never the rule.

The surplus is what stops the drawn galaxy being the same places every campaign at the archetypes where the
reserve is thinnest, which is exactly where sameness would be felt first.

**10. People are hidden per person, independently of their location.** Hiding wholesale by location is
cheaper and reproduces the prototype's failure verbatim: if a drawn Ceres always carries the same cast, the
second campaign knows Ceres, and findings §2.5's "after this many runs the galaxy is known" comes straight
back. An undrawn location necessarily takes its people with it — they have nowhere to stand — but **a drawn
location is a fresh question about who is there.** This is the decision that actually pays findings §2.5's
bill, and decision 16 is the rest of the payment.

**11. Goods are hidden within a kind down to the floor, or a kind is dropped entire.** Keeping the whole
catalogue every campaign hands a returning player every good, every tag and every **tell** on day one,
which is the other half of findings §2.5's complaint — *what* is hidden, not only *who*. But hiding goods
freely can drop `cloth` below its usability floor and leave a vague want pointed at it live and broken,
which is the precise failure ADR 0007 decision 5 exists to prevent. So the draw hides goods and **never
takes a usable kind below its declared floor**; where it wants more variation than that allows, it drops a
**whole kind** out of circulation instead.

Nor does it take a **role tag** held by a buyer at a drawn location below the least its content set
declares (ADR 0007 decision 7). A tag held in a role is a pattern the player learns, and hiding breaks a
pattern as surely as it breaks a kind. Re-rolling the pass (decision 17) does not scale to it: every held
tag must survive the same roll, so the chances of a miss multiply with the tags, and a catalogue grows
more of them as it is written. So the pass draws hidden goods back for a short tag as it does for a short
kind, and the check stays as the net under both. The tags are read off the buyers at drawn locations
because the goods pass runs before the people pass and cannot know who will be hidden. Drawing goods
back hides fewer than the declared rate, so the cross-product report says how many were hidden and
which were drawn back. *(Amended 2026-10-29, #124. Before it, a short role tag re-rolled the pass.)*

Nor does it hide a good that a buyer at a drawn location **wants by name** (ADR 0007 decision 6). A want
that names a good the draw hid is broken, like a vague want at a kind below its floor, and re-rolling
fails for the reason it fails for role tags: every named good must survive the same roll, and a catalogue
gains orders as it is written. So the pass keeps named goods before it counts the role tags, and a good
kept by name counts toward its tags. The check stays as the net under it, and it still catches a named
good whose kind no drawn location supplies. The report names the goods kept this way among those drawn
back. *(Amended 2026-10-30, #127. Before it, a hidden named good re-rolled the pass.)*

Dropping a kind is the large-grained, legible way to vary the galaxy's economic grain, and it is only legal
for a kind no drawn archetype supplies or demands — which is why kinds are drawn after the map and before
the goods (decision 2).

**12. Every drawn location carries a floor of people.** The hiding rate of decision 10 is galaxy-wide and
flat, because that is what makes "who is on Ceres" a fresh question. The binding requirement is overview
§5's: landing somewhere has to be worth the stop, and a location drawn with nobody on it is a dead node
with a fare attached to it. So the rate is declared and the **per-location floor** is checked after the
people pass, re-rolling that pass alone (decision 17) — the map passed its own invariants and should not be
thrown away over a bad cast.

### Patrons, the ladder, and the line between authored and composed

**13. Patrons are drawn last, and the ladder is composed against the galaxy.** Not the other way round.
Drawing patrons first and then biasing the draw to fit their commissions makes the galaxy a backdrop for
the ladder, when ADR 0004's whole claim is that a rung can surprise the designer because its substance is
composed from this campaign's own galaxy. So patrons come after map, kinds, goods and people, and **ladder
composability is the last invariant checked** — the one most likely to force a re-roll, and the right place
for it, since by then everything it depends on exists.

**14. The ladder's shape is drawn; a rung's substance is composed at offer time.** ADR 0004 decision 18
draws which patrons the ladder is built from, and that is where the drawing stops. *What a rung actually
asks for* is composed when it is offered, from the galaxy as it then stands. If the final commission's list
were fixed at campaign start, the galaxy's state would move under it for the whole campaign and it could
become unfillable through no fault of the player — which the one loss condition, an empty roster, is not
supposed to cover. Composed at offer time, it can genuinely demand most of the galaxy and most of the
player's relationships, because it is reading them.

No new content enters by this (decision 3). What is composed is a *demand over content already drawn*.

**15. What is authored is the voice; what is composed is the reference.** The general rule, and the third
time the draw has forced this line — ADR 0006 decision 2 drew it for a location (identity authored,
position generated), decision 14 above draws it for a commission, and findings §2.5 names the case that
makes it compulsory.

An **introduction** is authored dialogue naming a particular buyer, and with people hidden per person
(decision 10) it can now name somebody who is not in this campaign at all. Even when it resolves, it leaks
the cast of a place the player has never been, which is the leak findings §2.5 identifies as the cause of
prospecting dying. So an introduction is a relationship between two **drawn** people, composed at offer
time and spoken in the authored character's own words. The same holds for a **lead**, and for any quest
step that names a person or a place.

The cost is real and lands on chunk 6: a character's lines have to be written with a hole in them where a
name goes, which is harder writing than naming Ines on Ceres. It is paid because the alternative is the one
mechanic findings §2.3 calls the standout of the prototype quietly becoming a lookup table for anyone on
their second campaign.

### Checking the draw, and where it lives

**16. Every ADR 0007 bound is a property of the *drawn galaxy*, not only of the content set.** A content
set can satisfy the usability floor handsomely and still yield a draw in which `cloth` is down to one good.
So usability (decision 5 there), the role-tag spread bound (7), the quirk ration (8), a named good's
existence and reachability (6) and ADR 0006's mail-fare floor (decision 12) are all checked against what
was actually drawn. The content set is checked statically wherever it can be, which is a different and
weaker statement, and both checks are kept.

This changes the validator's character rather than merely lengthening its list: it stops being purely a
load-time pass over content and gains a **draw-time pass over a galaxy**. That is this ADR's largest
addition to the chunk 9 backlog.

**17. A failed invariant re-rolls the narrowest pass, bounded, and a content set that exhausts the bound
fails loudly at load.** Three rules in one. **Narrowest**: a location-count miss re-rolls motif selection
(decision 8), a people-floor miss re-rolls the people pass (decision 12), and nothing upstream is discarded
for a failure downstream. **Bounded**: the retries are counted. **Loud**: exhausting the bound is a content
defect reported with the invariant it could not satisfy, not a campaign that starts anyway. No invariant is
ever weakened to let a draw through.

The rejected third option is backtracking constraint-solving inside a draw, which sounds strictly better and
is not: it reliably produces the one galaxy that squeaks past the constraints, which is the least varied
galaxy the content set can make, every time. The re-rolls are inside the deterministic function of
decision 18, so the same seed still yields the same galaxy, retries and all.

**18. The draw lives in the engine, as a pure function of content set and seed, and the loader calls the
same function.** `(content set, seed) → drawn galaxy`, reading no clock, as ADR 0003 requires of everything
in the engine. A pre-pass outside the engine would mean a save carries the whole drawn galaxy rather than a
seed, and that replay of a command sequence depends on an external tool — both against ADR 0003, and the
second against ADR 0004 decision 20's free interruption.

The writer's tool needs drawn galaxies too, to run the draw-time checks of decision 16 and to show what a
content set actually produces. It gets them by calling this same function: **one code path, two modes**,
exactly the move ADR 0007 decision 18 made for the cross-product, and for the same reason — a report built
on a second implementation of the draw is a report that will eventually disagree with the game.

### The numbers

**19. ADR 0007's figures describe the drawn galaxy, and the reserves sit above them.** Decision 16 there
says "a catalogue of order 10² goods (~140)" without saying which, and the arithmetic forces the question:
20–30 kinds at 6–8 goods each is 150–200 goods before anything is held back. The reading that works is that
ADR 0007's figures are **drawn-galaxy** figures, because the ratio they serve — goods per usable kind — is a
property of what the player can actually encounter, which decision 16 above has just made the rule for
every other bound. The reserve then sits above them by the hidden fraction.

This also separates two numbers ADR 0007 left sitting close enough together to be confused: the **target**
of 6–8 goods per usable kind is not the **usability floor**, which is lower and is the thing the validator
enforces. Recorded here as a clarification of ADR 0007 decision 16, not a change to it.

**20. The sizing estimates.** Same tier as ADR 0007 decision 16: an order of magnitude with the derivation
it came from, **void on first measurement**, evidence of nothing. All of them are declared content-set
parameters per ADR 0007 decision 15; the engine hardcodes none of them.

| Seed | Sizing estimate | Derivation |
| --- | --- | --- |
| **Motifs per campaign** | **4–6** | The dial (decision 5). A motif is a region of 3–5 locations, against a drawn galaxy of order 20. |
| Drawn locations (a validated *range*, not a dial) | 16–24 | ~5 archetypes × 2–4 instances each, so a region's economic grain is a pattern rather than a lookup; plus ADR 0006 decision 4's untyped slots and decision 16's start hub. Sits inside the 12–30 that 4–6 motifs can yield, so decision 8's re-roll is occasional rather than routine. |
| Motif reserve | 15–20 | Five drawn from fifteen is combinatorially ample; below about twelve the grammar starts repeating between campaigns. |
| Location reserve | order 50 | Decision 9 is the binding rule: per archetype, the most simultaneous slots any legal assembly demands (4–6) plus surplus. Two to three times the draw. |
| Hidden fraction, people and goods | about a third | Enough that "who is on Ceres" is a fresh question next campaign; little enough that decision 12's floor rarely re-rolls. |
| People per drawn location (floor) | 2–3 | Landing has to be worth the stop (overview §5), and the 2–4 rule again. |
| People reserve | order 10² (~120) | 20 locations × ~4 present ÷ (1 − ⅓). |
| Goods reserve | order 10² (~200) | ADR 0007's ~140 drawn ÷ (1 − ⅓), per decision 19. |
| Usability floor | 4 | Below the 6–8 target because it is a floor and not the target: at 25 kinds a floor of 6 would demand 150 goods before any variation at all. |

The only one worth defending is the first, because it is the dial. The rest is arithmetic off it and off
ADR 0007's two seeds, which is what overview §5 said scale would be.

## Rejected alternatives

- **Six independent draws**, one per entity type in ADR 0004 decision 18's list. Decision 2. It produces
  buyers with no home, wants pointing at goods nobody stocks and ladders that cannot be composed, and every
  one of those is found only after the galaxy is built.
- **A fixed location count as the dial.** Decision 8. Every campaign the same size is variability spent in
  the dimension that matters least.
- **A rolled draw size** — the dial itself drawn from a range. Rejected because bracketing one seed at two
  settings is CLAUDE.md's method for a tuning decision, and a rolled dial puts a confound inside it.
  Variability comes from *which* content is drawn, which is ADR 0004 decision 18's own claim.
- **Motifs joined at shared locations.** Decision 6. A chokepoint that is also a spur end is neither.
- **Requiring 2–4 instances of each motif shape within one campaign.** Decision 7. It is the right rule
  applied at the wrong scale, and it would multiply the map's size for a verdict that cross-campaign play
  delivers anyway.
- **Hiding wholesale by location.** Decision 10. The prototype's failure with extra steps: a drawn Ceres
  with a fixed cast is a Ceres the second campaign already knows.
- **A global reserve-to-draw ratio.** Decision 9. Satisfiable while the archetype the motifs want most is
  down to one candidate.
- **Hiding goods freely, at the same flat rate as people.** Decision 11. It can drop a kind below its floor
  and leave a vague want pointed at it, which is ADR 0007 decision 5's failure arriving by the back door.
- **The whole catalogue in every campaign.** Decision 11. Cheap, and it hands a returning player every tag
  and every tell on day one.
- **Backtracking constraint-solving inside a draw**, instead of a bounded re-roll. Decision 17. It converges
  on the one galaxy that squeaks past, which is the least varied one available.
- **Relaxing an invariant to let a draw through.** Decision 17. A campaign that starts broken, silently.
- **Patrons drawn first, with the galaxy fitted to their ladder.** Decision 13. It inverts ADR 0004's claim
  that a rung is composed from the galaxy and can surprise the designer.
- **A commission's substance fixed at campaign start.** Decision 14. The final commission can become
  unfillable through no fault of the player, which is not what the loss condition is for.
- **Authored introductions naming a particular buyer.** Decision 15. Named in findings §2.5 as the
  mechanism by which prospecting died.
- **The draw as a pre-pass outside the engine**, producing a drawn galaxy fed in as content. Decision 18. A
  save would carry a galaxy rather than a seed, and replay would depend on a tool outside the seam.
- **Any in-fiction trace of the reserve** — greyed-out places, dialogue about somewhere out there.
  Decision 4.
- **Acts revealing reserve content.** Decision 3, inherited from ADR 0004 decision 18 and ADR 0006
  decision 14.
- **Renaming the person sense of *character* instead of the archetype**, and **naming the archetype
  *trade*.** Decision 1. The person sense is the older word and was earned in play; and *trade* would be a
  fiction word for something the fiction never says, since the trade guide publishes the expanded kinds and
  never the archetype's name.

## Consequences

- **The four upstream parameters of overview §5 are settled, and overview §6 item 4 is complete.** What
  blocks next is no longer a question but a build: item 5, the first playable milestone against the named
  question — how plain and vague wants divide the game — with the **measurement harness built first**
  (findings §5.4, CLAUDE.md). Nothing in the canon is now in the way of code.
- **The validator changes character, and gains a whole pass.** It was a load-time check over a content set;
  it now also runs **at draw time over a drawn galaxy** (decision 16), with a bounded re-roll and a loud
  failure behind it (17). Added to issue #5 as a comment rather than a second issue.
- **The engine gains the draw as its first act** (decision 18), and a save therefore carries a **seed and a
  command sequence**, never a galaxy. This is ADR 0003's determinism doing exactly the work it was written
  for.
- **The content pipeline gains composed references** (decision 15). Introductions, leads and quest steps
  stop being authored dialogue that names somebody and become authored *voice* around a composed name. That
  is a new content shape and harder writing, and it lands on chunk 6.
- **ADR 0007 decision 16 is clarified**: its figures are drawn-galaxy figures, and the usability **floor**
  is a lower number than the 6–8 **target** (decision 19).
- **ADR 0006 decision 3's assembly gains inter-motif lanes** as a thing the generator must choose and the
  invariants must speak about (decision 6) — including the far-cluster invariant, which is now a statement
  about those lanes specifically.
- **`GLOSSARY.md` changes rather than only grows.** **character** is renamed to **archetype**, and the
  entries for **slot** and **standing character** repoint to it; **reserve** stops being a note about pool
  lots and becomes a first-class term; **introduction** and **lead** gain the composed-reference rule; and
  **draw**, **drawn galaxy**, **hidden** and **motif reserve** are new.
- **The numbers this hands to measurement**, none of them decidable here: the motif count itself, which is
  the dial; the hidden fractions; the per-archetype surplus; the people floor; and how often each re-roll
  of decision 17 actually fires, which is the first thing the harness should report, as a curve and not a
  mean.

## Open questions this deliberately leaves

- **How inter-motif lanes are chosen** — which ends of which motifs join, and at what distance. Decision 6
  establishes that they exist and that the far-cluster invariant lives on them; the generator's actual
  policy is a design job for the milestone, and the distances are measurement.
- **Whether the hidden fractions should differ between people and goods.** Decision 20 estimates one number
  for both, on no evidence beyond symmetry. They answer different complaints — who is on Ceres, versus what
  a good's tells are — and may well want different rates.
- **Whether dropping a whole kind reads as variety or as a hole.** Decision 11 makes it the large-grained
  way to vary the economic grain, and it is equally possible that a campaign missing `cloth` entirely just
  feels thin. A hand-play observation, not a thing to decide at a desk.
- **Whether the per-location people floor should vary by archetype.** A market hub with three people and a
  spur-end extractor with three people are not obviously the same galaxy.
- **Whether the motif reserve needs weighting**, so that ADR 0006 decision 3's invariants do not pull the
  same few shapes into every assembly — which would give back the cross-campaign sameness decision 7 is
  trying to avoid.
- **How a composed reference behaves across a quiet spell** (findings §2.2): an introduction composed at
  offer time names a drawn person who may then leave the market. The three beats preserve the buyer's
  identity, so this probably just works, and it is worth watching in hand-play rather than deciding now.
