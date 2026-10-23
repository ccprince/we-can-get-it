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

## 3. Settled

### 3.1 The shape of a campaign

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
end badly. What it left blocking was time, which §3.2 settles.

### 3.2 The time model

**Settled 2026-10-22 in `docs/adr/0005-the-time-model.md`.** ADR 0004 left this blocking and said why: a
commission's deadline, passage work, a wasted jump and the daily burn are all denominated in days, and a
day did not yet mean anything. The ADR holds nineteen decisions in full; in brief:

- **The day is atomic** — an integer index with nothing underneath it — on **one galaxy-wide calendar** of
  years, months and weeks, perfectly regular and authored as content. Months give a date a sayable name
  and carry no mechanics; the week carries closures and billing. Seasons are local and authored. No time
  zones. Everything dated is stated as an **absolute date**.
- **A day grants an allowance of `action`s, and where the player is supplies the menu** — one loop, with
  no special case for travel. **Trade is not an action**: time is spent on people and on distance, never
  on shopping. Waiting is ending the day, chosen a day at a time, so the engine holds no interrupt
  conditions. One **digest** at every day boundary.
- **A journey costs a route-dependent number of days, fixed at departure**, and transit is a place —
  played day by day, with a thin menu that events can add to, and **out of contact**, so galaxy news lands
  as a span on arrival and distance costs knowledge as well as days. The change budget re-denominates to
  **per day** and runs everywhere, including in the black; every fact the player holds carries its
  **as-of date**.
- **Pressure is dated, never metered.** No baseline burn: arrangements are quoted daily and billed a week
  in advance, prepaid, so nothing accrues against the player. A commission fails at the end of its stated
  day and never before. **Nothing takes a day without naming its date first** — rumour, notice, effect —
  while **schedules** are a separate always-true tier the player can learn and exploit, which is the best
  answer available to ADR 0004's demand that cross-campaign knowledge be the galaxy's grammar rather than
  its facts. **Passage work** is a class of order — paid in advance, cargo supplied — covering passengers
  and mail, with mail the floor under the promise that nobody is ever stranded.

Deliberately left open there: transit events in full, and with them whether a journey's length can ever
move and whether an event may take cargo; and whether the rumour tier over-warns things that ought to be
sudden. **The map (chunk 3) is now the blocking question**, and it inherits a job: route length in days is
a property of topology, so the map is where a wasteable jump and ADR 0004's distance axis are built.

### 3.3 The map

**Settled 2026-10-22 in `docs/adr/0006-the-map.md`.** ADR 0005 left this blocking and handed it a job:
route length in days is a property of topology, so the map is where a wasteable jump and ADR 0004's
**distance** axis actually get built. The ADR holds twenty decisions in full; in brief:

- **The map is a sparse graph of authored lanes**, not a complete graph with a distance matrix. Travel is
  along a **lane** and nowhere else, which is what makes a place *on the way* — and the fully-connected
  five is exactly the arrangement that cannot produce the **outbound fill at an intermediate stop**.
- **Identity is authored; position is generated.** A location's name, voice and prose are written by hand
  and drawn from a reserve with a hidden subset; where it sits in the graph is rolled per campaign. The
  graph itself is assembled from authored **motifs** — spur, chokepoint, cluster, ring, three-world system
  — with **slots typed in tag vocabulary**, so a region has an economic grain, plus untyped slots so the
  grammar has exceptions in it. Invariants are validated at load.
- **A lane carries one number, its distance.** The ship converts it: **speed** into days, one galaxy-wide
  rate into a **fare** quoted and paid at departure, **range** into whether the lane is flyable at all.
  The fiction is **gates and lanes** — the fare is gate access, and a gate is an on-ramp rather than a
  teleport, so transit stays days long and played day by day. No tracked fuel anywhere, and **mail must
  always pay its own fare**.
- **The chart is common knowledge from day one**, as is each location's **standing character**; what is
  in stock, at what price and who is there is not. **Range is the only gate on the map** — acts move the
  patrons, not the walls — everything drawn is visitable, and the campaign starts at a market hub.
- **The map participates in change.** Lanes carry rumours and notices and bind only at departure; a place
  never leaves the chart but a lane can close, dated and usually bounded; tolls are events rather than
  geography. The **chart** becomes a first-class reading surface that shows converted numbers.

Deliberately left open: research as an action and the on-board computer, parked with two constraints
recorded; whether a lane closure may disconnect the drawn map mid-campaign; whether the gate operator has
any mechanics; and ADR 0005's transit events, inherited whole. **What blocks next is no longer a chunk but
the four upstream parameters of §5** — the tag structure first, which ADR 0006 has just given a second
customer, since tags now type the map's slots as well as matching goods to wants.

### 3.4 The tag structure

**Settled 2026-10-22 in `docs/adr/0007-the-tag-structure.md`.** ADR 0006 moved the blocking question off
the chunks and onto the four upstream parameters of §5, naming the tag structure first because decision 4
there had given tags a second customer. The ADR holds eighteen decisions in full; in brief:

- **A tag declares its class** — **kind**, **quality**, **origin** or **quirk** — because *goods per
  usable kind-tag*, the one lever findings §2.4 names, is not a computable quantity in a flat vocabulary
  of strings. A good carries **exactly one kind**, and kinds are **flat**. **Kinds are the only public
  class**: a kind may be said on the trade guide, in a commission's breadth list and in a location's
  archetype, while quality, origin and quirk are named nowhere and reached only through **tells**.
- **A kind is *usable*** when it carries a declared floor of goods, and **only a usable kind may be the
  subject of a vague want** — which is what stops the prototype's failure recurring behind a healthy
  mean. The ratio is reported as a distribution.
- **A want is a conjunction of tag terms** with optional negation, or one named good; no disjunction,
  because breadth is the kind vocabulary's job. **Bonus and refusal are roles held on the buyer**, not
  classes of tag, and any tag used in a role must spread far enough to be learnable.
- **The engine derives the match, content supplies only the pieces.** Four tiers —
  `refused`/`grudging`/`acceptable`/`great` — with **grudging** derived from partial satisfaction of a
  conjunction, which puts findings §2.4's own balloon-silk example into the rules. **Grudging belongs to
  speculation**: it pays no warmth and **closes the want it is sold against**, so the better price is
  forgone, while on an order no tier below acceptable is a transaction at all — the buyer declines, the
  order stays open, and standing is staked on the date rather than on a bad afternoon. The player's
  reading is the test: *the best I've got*, or *go and find something better*. The **offer** is
  **worth × tier × voice premium**, so the four want
  shapes are mechanically real and the open question of §4 is answerable by moving one number.
- **Every number is either a declared content-set bound or a labelled sizing estimate.** The prototype's
  1–4 tags per good and 2–4 goods per role tag are void as values and kept as reasons; two seeds are
  estimated (six to eight goods per usable kind, twenty to thirty kinds) and the rest is arithmetic.
- **A location's standing character is an enumerated *archetype*** declaring the kinds it supplies and
  demands, which is what a motif slot types against — so ADR 0006's economic grain is two archetypes'
  kind sets disagreeing along a lane. The **cross-product tool is the loader in a reporting mode**, one
  content model with two verdicts: fail for a mistake, report for a writer to judge. (ADR 0007 called
  this an enumerated *character*; ADR 0008 renamed it, because **character** is a person.)

Deliberately left open: **a way to ask questions** — the third part of findings §2.4's fix, which belongs
to chunk 6 because the thing the player does is call on somebody; whether kinds should stay public;
whether the archetype enumeration is the right granularity.

### 3.5 The draw

**Settled 2026-10-22 in `docs/adr/0008-the-draw.md`.** The last of the four upstream parameters of §5,
and the last thing between the canon and the first playable milestone. ADR 0007 handed it a job: the
reserve must satisfy every archetype the motifs demand, at the draw size, with this campaign's hidden
locations excluded. The ADR holds twenty decisions in full; in brief:

- **The draw is an ordered cascade, and the map goes first** — motifs, locations, kinds, goods, people,
  patrons, each stage conditioned on the one above. Six independent rolls would produce buyers with no
  home and ladders that cannot be composed. It is a **single roll at campaign start**: no act, and
  nothing else, ever adds content afterwards, and **the reserve leaves no trace** inside a campaign —
  an undrawn location does not exist this time, rather than being unreachable or greyed out.
- **There is one dial, and it is the motif count.** Motifs are drawn from a reserve of them, may repeat,
  and **join by lanes rather than sharing locations**, so each keeps its shape and the location count is
  the sum of those placed — free inside a validated range rather than fixed. A motif shape gets its 2–4
  instances **across campaigns**, since motifs are the grammar that persists while the facts are redrawn.
- **The reserve's adequacy is stated per archetype**, never as one draw-to-reserve ratio: enough
  candidates for the most simultaneous slots of that archetype any legal assembly can demand, plus a
  surplus. **People are hidden per person**, so a drawn location is still a fresh question about who is
  there — the prototype's prospecting died because *who is hidden* was fixed by the content. **Goods are
  hidden within a kind down to its floor, or the kind is dropped entire**, so hiding can never leave a
  vague want pointed at a kind with one good. Every drawn location carries a floor of people, or it is a
  dead node with a fare attached.
- **Patrons are drawn last and the ladder is composed against the galaxy**, not the galaxy fitted to the
  ladder; the ladder's *shape* is drawn while a rung's *substance* is composed at offer time. Generalised:
  **what is authored is the voice, and what is composed is the reference** — an introduction is a
  relationship between two drawn people, which is the rest of the payment on findings §2.5.
- **Every content bound is a property of the drawn galaxy**, not only of the content set, so the
  validator gains a draw-time pass; a failed invariant **re-rolls the narrowest pass, bounded**, and a
  content set that exhausts the bound fails loudly at load rather than starting a broken campaign. The
  draw lives **inside the engine** as a pure function of content set and seed, so a save carries a seed
  and never a galaxy — and the loader calls the same function, one code path and two modes.
- **ADR 0007's figures describe the drawn galaxy**, with the reserves above them, and the usability
  **floor** is a lower number than the 6–8 **target**. The sizing estimates, in ADR 0007 decision 16's
  tier: four to six motifs a campaign (the dial), sixteen to twenty-four drawn locations, reserves of
  order fifty locations and order 10² each of people and goods, about a third of people and goods hidden.

Deliberately left open: how inter-motif lanes are chosen; whether the hidden fractions should differ
between people and goods; whether dropping a whole kind reads as variety or as a hole; whether the
per-location people floor should vary by archetype; whether the motif reserve needs weighting. **Nothing
in the canon now blocks code**: what is next is §6 item 5, the first playable milestone, with the
measurement harness built first.

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

**2. Time.** Days, not jumps; the calendar, schedules, seasons, what a day consists of and what a journey consumes
of it. **Settled in ADR 0005**; see §3.2 above. The finding that drove it holds in the result: **change the player can
attribute to a cause reads as a living world at any volume, and change they cannot reads as dice at any volume**
(§2.2), and the carriers of attribution are calendars and named local events — so the calendar is a published,
exploitable tier rather than decoration, and nothing takes a day from the player without naming its date first. What
is left here is measurement: actions per day, days per journey, deadline lengths, the week's length, what mail pays.

### The world's three substances — mutually constrained, and sized by the campaign

**3. The map.** Locations, topology, travel cost and what a journey consumes. **Settled in ADR 0006**; see
§3.3 above. The findings that made this chunk urgent hold in the result: **no jump was ever wasted** and
three built mechanics stayed inert because of it (§2.1), so a lane now costs days *and* a fare and a spur
can be flown for nothing; the most-played shape was the **outbound fill at an intermediate stop** and
*that shape is topology* (§2.1), so the graph is sparse and motifs place places on the way deliberately;
route-shaped sub-goals are designed rather than left to fall out of the map (§2.1), which is what typed
motif slots are for. What is left here is measurement: the distance scale and the spread between the
shortest and longest lane, the fare rate, baseline range, speed and hold, and how many spurs and
chokepoints the invariants should demand. The draw size is now **ADR 0008**'s one dial — how many motifs
a campaign is assembled from — and is measured along with them.

**4. Goods and matching.** The catalogue, the tag system, match tiers, and what an offer is worth. **Settled in ADR
0007**; see §3.4 above. The findings that drove it hold in the result: **an offer is a function of the good's worth
and the quality of the match**, never a per-want constant (§2.1), so worth, tier and the voice premium are all
engine-side and content states no price except an order's; every tag needs a *tell* in the prose (§2.4), so a tag
with no tell fails the load; two-way quality tags, origin tags only where the origin matters and idiosyncratic tags
rationed (§2.4, §5.2) are now classes with rules rather than habits. The prototype's *1–4 tags per good* and *bonus
and refusal tags on 2–4 goods* are void as numbers and kept as reasons: they become bounds a content set declares,
and both are expected to widen as the catalogue grows. What is left here is measurement: the two seeds of §5, the
tier multipliers, the voice premium, the declared bounds, and the size of the archetype enumeration.
ADR 0008 clarifies that §5's figures describe the **drawn galaxy**, with the reserves above them, and
that the usability floor is a lower number than the six-to-eight target.

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
  the galaxy wants. **Settled 2026-10-22 in ADR 0007**, which makes *usable* a validated property of a kind so the
  ratio cannot be met on average while half the kinds are singletons, and records both the target and the kind count
  as **sizing estimates** — void on first measurement. ADR 0008 adds that these describe the **drawn galaxy**, so
  the catalogue held in reserve is larger by the hidden fraction.
- **How much demand** is set by the thin-demand decision: more goods than wants, so that some goods are wanted by
  nobody at the moment (§2.1). A ratio, not a count.
- **How many locations** is set by how much of the galaxy one campaign should see, since the galaxy must hold more
  content than one campaign can visit and shuffles what is hidden at campaign start (§2.5, ADR 0004).
  **Settled 2026-10-22 in ADR 0008**, which makes even this not quite a count: the one dial is how many **motifs**
  a campaign is assembled from, and the location count falls out of that inside a validated range.
- **How many people per location** is set by the change budget and by what makes landing somewhere worth the stop.
  ADR 0008 turns the second half of that into a validated **floor**, checked after the draw, since a location drawn
  with nobody on it is a dead node with a fare attached to it.
- **How far apart things are** is set by the time model — route-dependent journey lengths in days, fixed at
  departure (ADR 0005) — and by the decision that a jump can be wasted.

What is left after the derivations is the **topology** (chunk 3) — and that is a genuine design decision, not an
arithmetic one. **Settled 2026-10-22 in ADR 0006**, which also moves one of the derivations above: how far apart
things are is now a lane's authored **distance** converted by the ship's **speed**, and how many locations one
campaign sees is the **draw size** over a reserve.

So the questions actually worth sitting down with were: what is a campaign (§3.1), what does the map look like
(§3.3), what is the tag structure (§3.4), and how much does one campaign see (§3.5). **All four are settled**, and
scale is arithmetic afterwards — ADR 0007 decision 16 and ADR 0008 decision 20 make that literal. The chain above
runs off three estimated seeds: goods per usable kind-tag, the number of kinds, and the motif count, with the
catalogue size, the want count, the location count and the reserves falling out of them as arithmetic rather than
judgement. Every one of those seeds is labelled **void on first measurement**, and measurement is §6 item 5.

---

## 6. How to use this

Read the findings document for what is known. Read this one for what is undecided and in what order. The next
things, in order, with the first three now done:

1. ~~**Settle the campaign** (§3).~~ **Done**, 2026-10-22: ADR 0004, the shape of a campaign.
2. ~~**Settle the time model** (chunk 2).~~ **Done**, 2026-10-22: ADR 0005, the time model.
3. ~~**Settle the topology** (chunk 3).~~ **Done**, 2026-10-22: ADR 0006, the map.
4. ~~**Settle the four upstream parameters in §5.**~~ **Done**, 2026-10-22: ADR 0007, the tag structure,
   which also fixed what the remaining parameters *are* — the catalogue size and the rest of §5's chain are
   arithmetic over its two seeds — and ADR 0008, the draw, which settles **how much of the galaxy one
   campaign sees** and adds the third seed. Nothing in the canon now blocks code.
5. **Build the first playable milestone against the named question** — a galaxy at real scale with thin demand,
   orders as the backbone, and a content set written to answer how plain and vague wants divide the game — with the
   measurement harness built first (§5.4).

Anything that is not one of those is probably a number, and numbers are found by playing.
