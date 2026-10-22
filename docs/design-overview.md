# Design overview

**Written 2026-10-22, alongside `prototype-findings.md`**, as its companion at a higher altitude. The findings
document says what playing the prototype taught us, mechanism by mechanism. This one says what the game is made of at
the top level, which decisions are upstream of which, and what to settle before building anything.

It exists because "galaxy scale" turned out not to be a question. It was a symptom of a missing level of design: the
findings document is dense at the altitude of mechanisms and the prototype was dense at the altitude of code, and
there was nothing in between — no map of the game's major parts, and no statement of which parts are consequences of
others. This is that map. Like the findings, it carries to the new repo verbatim.

---

## 1. The name

The game is **We Can Get It For You**. The shorter **We Can Get It** is the working form for a repo directory
(`we-can-get-it`), a window title, or anywhere the full phrase is too long.

It is borrowed, deliberately, from Jerome Weidman's *I Can Get It for You Wholesale* (1937; the 1962 musical). The
phrase is a salesman's boast, which is the protagonist's voice: not a commodity trader moving tonnes of ore, but
somebody who knows people, knows what they are after, and says they can lay hands on it. The plural is load-bearing —
it implies a firm, or a crew, which is somewhere for the game to grow.

It is also a promise the game is allowed to break. The boast is the premise; the risk is the play. §2.1 of the
findings establishes that speculation has to be able to lose, and the vague-want row of the four-shape table is that
sentence said hopefully rather than confidently.

The earlier attempt's **Star Trader** named an abstract cargo-trading game and is retired with it. The prototype's
**Schlepper** was a joke about the same abstraction and is retired too.

---

## 2. What to design up front, and what to settle by playing

The working method, stated before the chunks because it is what makes the chunks list usable.

Two prior attempts did a lot of design up front, and it did not help. Two weeks of prototype play produced 475 lines
of conclusions that no amount of writing would have produced, and three fixes for the notification load failed
because each was reasoned out rather than measured. The lesson is not that design is worthless — it is that
**some decisions can only be settled by playing, and designing those in advance is writing fiction.**

**Settle by playing.** Whether vague wants work and what they are for; how plain and vague divide the game; what the
change budget is and how it splits; how warmth tiers feel; what a want shape should pay; whether a shape is
learnable; every number. The findings document is full of these, and nearly every one came out contrary to the
prediction.

**Settle before building, because reversing them is a rewrite.** The chunks in §4 marked *upstream*, the architecture
principles in findings §5.3, and these five, which the findings calls out as inputs from the start rather than
features to add later:

1. **Save, resume and interruption** (findings §2.5). Two play-test runs died to the back button.
2. **The galaxy-wide reference surface** — the trade guide. "Not UI polish; it is the organ that carries
   aliveness" (§2.2).
3. **Per-run shuffling of what is hidden**, and holding more content than one run can see (§2.5).
4. **A reading surface for every system the design wants the player to reason about** (§2.5). The player will not keep
   records out of game.
5. **The content pipeline** — validator at load, and a tool that lists the cross-product for a writer to judge
   (§2.4, §5.3).

**The cadence.** Each milestone is a playable thing built to answer a named question; instrument before redesigning;
write down what came of it, including what is closed. That is findings §5.4, and it is the part of the prototype that
worked best.

**The trap for this attempt.** The findings document is good *because it was written from play*. The risk now is
reading its quality as evidence that more documents are the answer, and producing a beautiful forty-page design for a
game nobody has played. This document and that one should be the whole of the up-front writing.

---

## 3. Settled: the shape of a campaign

**Settled 2026-10-22 in `docs/adr/0004-the-shape-of-a-campaign.md`.** This section was the first design
job, and it was the right one: it was the most consequential open question and the one unexamined
assumption carried out of the prototype, because the prototype's sixteen-jump *run* was scaffolding that
every other part of the design was quietly scaled to.

The ADR holds the decision in full, with its rejected alternatives and the numbers it hands to
measurement. In brief:

- **The unit of play is a campaign**, one continuous winnable game taking many **sittings**. *Session* is
  retired as a word: it was ambiguous between the two. **Nothing resets inside a campaign** — accumulated
  access is the best thing in the game, so episodic feel comes from **acts** that gate what the galaxy
  offers next, never from runs that reset.
- **The win is a delivery**: a ladder of commissions ending in one final commission that cannot be filled
  without most of the galaxy and most of the player's relationships. Not a balance. Difficulty comes from
  **breadth, depth and distance** — a list, access through people, an awkward route — which pull on
  chunks 4, 6 and 3 respectively.
- **The loss is the patron roster emptying.** Standing *is* the named list of patrons who will still deal
  with the player: failing a commission costs that patron, clearing an act adds patrons, and a **vouch**
  from a very warm character recovers one at the cost of that warmth. Standing gates what is offered and
  nothing else, so failure costs opportunity and never capability and cannot spiral.
- **Variability is drawn once per campaign** from a reserve larger than one campaign can see — including
  who is hidden — and only *state* moves within a campaign. Nothing carries between campaigns but the
  player's own understanding, which must therefore be of the galaxy's grammar rather than its facts.
- **Interruption is free and the day is the beat**, so ten minutes and a long evening are both good ways
  to sit down.

What this unblocks, and what it answered of the five questions this section used to ask: the unit of
play, what persists, what a sitting is, what the goal rewards besides credits, and whether a campaign can
end badly. **Time (chunk 2) is now the blocking question** — a deadline, a wasted jump, passage work and
the daily burn are all denominated in days, and a day does not yet mean anything. The map (chunk 3)
follows it.

## 4. The chunks

Nine top-level parts. Each is a coherent area of design and of build, each has something already settled by the
findings, and the order is roughly one of dependency. Pointers are to sections of `prototype-findings.md`.

### Upstream — everything else is scaled to these

**1. The campaign.** The unit of play, what persists, length, the goal and what it rewards, save/resume and
interruption. **Settled in ADR 0004**; see §3 above. The findings that constrained it all hold in the result: a
monetary-only goal is not enough (§2.5), so the win is a delivery; a single place to settle up must be a deliberate
homecoming and not a positioning tax on the last third (§2.5), so each commission names its own destination at offer
time; interruption is a design input (§2.5), so state commits after every action. What is left here is measurement —
the roster size, the rungs per act, the daily burn — and measurement is play.

**2. Time.** Jumps or days; calendars, weekends, schedules, seasons, shipping cycles. Load-bearing, because the
findings' sharpest diagnosis of "too random" is that **change the player can attribute to a cause reads as a living
world at any volume, and change they cannot reads as dice at any volume** (§2.2) — and the carriers of attribution
are calendars and named local events. A time model richer than "a jump happened" is how aliveness gets bought
cheaply. Open, and now **the blocking question**, because ADR 0004 denominates a commission's deadline, passage work, a
wasted jump and the daily burn in days: the granularity, what a day consists of, and whether travel consumes a
variable amount of it.

### The world's three substances — mutually constrained, and sized by the campaign

**3. The map.** Locations, topology, travel cost and what a journey consumes. This is the chunk that is a real
decision rather than a consequence, and it is underweighted: the most-played shape in the prototype was the
**outbound fill at an intermediate stop** — at A, bound for C, stopping at B — and it was never designed (§2.1).
That shape *is* topology. Five effectively fully-connected locations produced no intermediate stops and no wasted
jumps, which is also why the dump, the stock race and the split never fired. A map with routes, distances and detours
hands you route-shaped sub-goals and a wasteable jump for free. Settled: route-shaped sub-goals should be designed
deliberately, not left to fall out of the map (§2.1); a jump must be able to be unproductive, watching the overbuying
habit while making it so (§2.1).

**4. Goods and matching.** The catalogue, the tag system, match tiers, and what an offer is worth. Settled, and these
are strong: **an offer is a function of the good's worth and the quality of the match**, never a per-want constant
(§2.1) — fix it in the rules, because content discipline will not survive several hands; every tag needs a *tell* in
the prose (§2.4); 1–4 tags per good, bonus and refusal tags on 2–4 goods each, two-way quality tags, origin tags only
where the origin matters, idiosyncratic tags rationed (§2.4, §5.2).

**5. Demand and supply.** Wants, orders and the four want shapes on one side; lots, stock, prices, restocking and the
stock race on the other. Settled: **an order is the primary transaction and states its price** (§2.1), the
dependable floor under speculation's ceiling; all four want shapes are valid, with the specific-desire/vague-voice
cell used sparingly (§2.1); the match should be revealed by something the player *does*, not computed on arrival
(§2.1); finite specific goods are load-bearing and restocking must be designed against the stock race (§2.1); demand
must be thinned, so that holding the wrong thing can mean a long trip, a bad price, or carrying it to the end (§2.1).
Open, and the first content set should be built to answer it: how plain and vague wants divide the game now that
orders carry a price (§4).

### Cross-cutting — each of these touches all of the above

**6. People.** Buyers and characters, warmth, access, introductions and leads, calling on someone, asking a question.
The standout of the prototype: **access is the reward the player notices; money is the one they don't** (§2.3).
Settled: relationship payoff leans on access, information and story, with credits as the scorekeeper; better prices
from warmth come back, but only with a legible handle — say the tier, say what the next one gives, show a price *as* a
relationship price (§2.3); warmth rises once per want fully met, not per delivery and not per unit (§2.3);
information is ungated and intimacy is earned, with the want reaching the player by landing where the buyer lives and
the character's own wording earned by calling on them (ADR 0002). Open and live: give the visit something only a
visit can yield, or it becomes a formality (§2.3).

**7. Change.** The budget, the generators, the weights, and attribution. Settled, and the most transferable work in
the prototype: **budget the change galaxy-wide, for every generator** — volume and split are each one number and
neither moves when the content grows (ADR 0001, §2.2); **announce what the player counted on, not what changed**, so
the announcement load stops climbing with the player's knowledge (§2.2); **aliveness scales with discovered change
and noise scales with announced change**, so budget preferentially toward what the player finds (§2.2); the
three-beat absence works, and the buyer leaves the market, not the want (§2.2). Hard constraint: **the notification
layer must never answer the player's riddle** (§4).

**8. Knowledge and its reading surfaces.** Contacts and last-known, the trade guide, the ledger, watch and the other
forms of plan declaration, the announcement feed. Treat this as a top-level chunk or it gets built last and badly:
the trade guide is the organ that carries aliveness (§2.2), the one surface showing what a load had cost was reached
for on almost every sale (§2.5), and **plan declaration should be first-class and plural**, with an accepted job as
its strongest form and watch, a standing order, a manifest or a route plan as the lighter ones (§2.2). Nothing is
hidden by relevance filtering; everything known stays as last known, and landing corrects it.

**9. The content pipeline.** The validator, the cross-product tool, the writing order, and who writes what. Settled:
content is data the engine receives and never imports, rejected at load for an unknown tag or an unsatisfiable want
(§5.3); write the content from goods, buyers and characters with their own quirks and let the combinations fall out,
rather than filling a grid (§2.4); tags and wording will disagree and nobody will catch it by reading at scale, so
the cross-product needs a tool and an in-fiction escape hatch — a character turning down a particular item in their
own words (§2.4); give every shape 2–4 instances before judging it (§2.4).

---

## 5. Galaxy scale is a consequence, not a decision

Worked through here because it is the example that produced this document, and because the same move applies to the
next thing that feels like one big question.

Unpacked, almost every part of "how big is the galaxy" is derived from something upstream:

- **How many goods** is set by the tag ratio. The lever for vague wants is many goods per kind-tag, and the prototype
  failed at **27 tags across 24 goods**, where a vague want asks only "is there anything at all that fits?" (§2.4).
  Choose a target — say six to eight goods per usable kind-tag — and the catalogue size falls out of how many kinds
  the galaxy wants.
- **How much demand** is set by the thin-demand decision: more goods than wants, so that some goods are wanted by
  nobody at the moment (§2.1). A ratio, not a count.
- **How many locations** is set by how much of the galaxy one campaign should see, since the galaxy must hold more
  content than one campaign can visit and shuffles what is hidden at campaign start (§2.5, ADR 0004).
- **How many people per location** is set by the change budget and by what makes landing somewhere worth the stop.
- **How far apart things are** is set by the time model and by the decision that a jump can be wasted.

What is left after the derivations is the **topology** (chunk 3) — and that is a genuine design decision, not an
arithmetic one.

So the questions actually worth sitting down with are: what is a campaign (§3, settled), what is the tag
structure, how much does one campaign see, and what does the map look like. Scale is arithmetic afterwards.

---

## 6. How to use this

Read the findings document for what is known. Read this one for what is undecided and in what order. The next three
things, in order:

1. ~~**Settle the campaign** (§3).~~ **Done**, 2026-10-22: ADR 0004, the shape of a campaign.
2. **Settle the time model** (chunk 2) — the blocking question, because ADR 0004 denominates deadlines, passage work
   and the daily burn in days — then **the topology** (chunk 3) and **the four upstream parameters** in §5.
3. **Build the first playable milestone against the named question** — a galaxy at real scale with thin demand,
   orders as the backbone, and a content set written to answer how plain and vague wants divide the game — with the
   measurement harness built first (§5.4).

Anything that is not one of those three is probably a number, and numbers are found by playing.
