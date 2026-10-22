# Prototype findings

**Written 2026-10-22, at the end of the `schlepper` prototype**, as the thing that survives it. The prototype is being
discarded: the engine, the page, the content set, the harnesses and the `.scratch/` specs and tickets all go. Nothing
below depends on them, and nothing below should have to be rediscovered by playing.

What the prototype was: a browser text-and-buttons space-trading game, five locations, 24 goods, 21 buyers, 52 wants,
a debt of 1,500 credits to clear in 16 jumps, a run taking 10–15 minutes. Built over two weeks, hand-played eight
times and driven headlessly under a scripted policy for the measurements. It was built to answer two questions by
playing, and it answered them.

This document has six parts: the two verdicts, the settled design conclusions, the dead ends, the open questions, what
we carry across, and what we leave behind.

---

## 1. The two questions it was built to answer

**Is matching satisfying?** *Yes, unreservedly.* Finding the right good at the right shop for the right buyer was
compelling from the first buy-and-sell run — *"finding the shop that sells blasting charges and remembering that the
buyer on Dock Nine wants some was already exciting"* — and it held up across every session after. The model of
finding things and bringing them to people is the game.

**Does the galaxy feel alive?** *Yes, after a rebuild of how it changes, and only at the right volume.* The first
mechanism (per-want expiry and recreation, rolled per entity per jump) worked and was far too loud: four sessions in a
row reported three or four messages on every landing. Three attempts to fix it failed. The fourth — a galaxy-wide
change budget plus a relevance filter — worked, and the designer's verdict on the bracketing runs was **"alive at 4,
two reads closer to dead than to calm."** The mechanism is a keeper; the number is content.

Everything else in this document is a by-product of answering those two, and most of it is more valuable than the
answers.

---

## 2. Settled conclusions

Each of these is a premise for the full game, not a question for it. Evidence first, implication second.

### 2.1 Commerce and transactions

**The order is the primary transaction, and it carries a price.**
*The decision, 2026-10-22.* The prototype's player could know everything about a sale except what it would pay:
*"for all the information I look at when making a sale, every sale is still done on spec. Even when I know exactly
which good a buyer wants, I don't know what price I'll get for it until I'm standing there."* This gated one sub-goal
shape outright (recognising a bargain needs a reference price) and weakened three more (the opportunistic sale, the
split, the funding gap). Of the five unknowns a player resolves when they commit credits — the buyer, the good, the
timing, the stock, the price — four were live and interesting and the fifth did not exist.

The resolution is to make **a job accepted** the game's central transaction: an order from a buyer, stating what they
want and what they will pay for it. It does not make sense for an order to omit the price. This closes the price gate
by construction rather than by bolting a price-estimate system onto a world of guesses, and it gives
plan-declaration — see 2.2 — its most natural form, because an accepted job *is* the player saying where their plan
runs.

It does not make speculation go away, and must not. **Orders are the floor, not the ceiling**: the known-price,
known-buyer trade is the dependable business the player can always do, and the speculative trade is the one that pays
better and can fail. The design job is to keep both live at once, with orders as the backbone and speculation as the
upside.

**Speculation has to be able to lose, and in the prototype it could not.**
Three built mechanics — the dump, the stock race and the split — were never once used in play. The first guess was
that hold space is never scarce; the designer's own Valhalla flour run disproves it, because the hold *did* bind and
nothing changed. The real root: **no jump was ever wasted.** Every location had something worth carrying out, so a
second trip cost a turn and nothing more, and a full hold was a scheduling detail rather than a loss. On top of that,
pocket-sized goods took no hold space at all and every good in the content set was wanted somewhere, which made a
spec purchase on a pocket good *a bet that could not be lost.*

Two levers, and the full game should pull both:

- **Thin the demand.** Either some goods are wanted by nobody at the moment, or the galaxy is large enough that
  everything is wanted *somewhere* but by very few people — so that holding the wrong thing means a long trip, a bad
  price, or carrying it to the end. (The prototype's own content rule, never implemented, was "more goods than
  wants".)
- **Let a jump be unproductive.** Scarcer outbound cargo, a jump that costs more than a turn, or stock that won't
  wait for a second trip. The moment a jump can be wasted, three built-but-inert shapes switch on at once.

**The warning, though:** always-productive jumps were also the pressure valve that made the designer's overbuying
habit *fun*. These trade directly against each other, and sharpening one blunts the other. Pull the levers on
purpose and watch the overbuying habit while doing it.

**The most-played shape in the game was never designed.**
The *outbound fill* — "I'm leaving here, what can I carry out?" — was the most frequently executed shape in play,
named by the designer's winning run as the thing done right (*"being sure to pick something up for the next stop"*),
and it was not on the designer's own list of shapes. Its common form is the intermediate stop: at A, bound for C,
stopping at B, so buy whatever at A sells at B rather than deadhead. **The galaxy answered "what should I do here?"
much better than "what should I do next?"** Route-shaped sub-goals should be designed deliberately, not left to fall
out of the map.

**A want's price must scale with the good that answers it.**
In the prototype a want had one price whatever good filled it, with a fixed multiplier for a great match. So a cheap
acceptable good could earn more *profit* than a dear great match: the player saw the bigger offer on the great match
and the cheap good was the better trade. That attacks the first play-test question directly. It was patched in
content — *"goods that can answer the same want are priced within about three times of each other"* — and that
discipline will not survive a large galaxy written by several hands. **Fix it in the rules.** An offer should be a
function of the good's worth and the quality of the match, not a per-want constant.

**Four want shapes, and all four are valid.**
Two independent axes, found by the designer on 2026-10-20: how specific the *desire* is, and how specific the *voice*
describing it is.

| | Says it plainly | Is vague about it |
| --- | --- | --- |
| **Wants a specific thing** | "Bring me three cases of Venusian blue ale." | "I'm feeling nostalgic" — and only blue ale will do. |
| **Wants a category** | "I need to restock the bar; I'll take all the alcohol you can bring." | "I'm feeling nostalgic for home" — anything Venusian, or anything drinkable from Venus. |

The specific-desire/vague-voice cell is the frustrating one and should be used sparingly, with warmer relationships
improving the hints — but it is also the cell that can produce the game's best story, where the player brings thing
after thing, gets closer each time, and finally hits it. Orders (2.1) naturally occupy the plain-voice row, which is
another reason they make a good backbone: they free the vague row to be the interesting, risky, characterful one.

**The drama of a transaction sits in the wrong place by default.**
*"Immediately seeing that the cargo in the hold matches their want feels a little anticlimactic — it's as if they're
waiting for me at the dock and rummaging through the hold before I do anything else."* The match should be revealed by
something the player *does* — offer a good, show a sample, describe what you're carrying, ask what they're after — not
by a readout computed on arrival. The designer's parked idea belongs here: an action to put a question to a contact
(*"I've got a line on some Venusian ale, want some?"*), which is also the natural way to make a vague want askable
and, with warmth, answerable.

**Finite, specific goods are load-bearing, and restocking is dangerous.**
Nothing restocked in the prototype, and that quietly did a lot of work: buying was a commitment, immediate resale at
the same location was harmless rather than an exploit (*"because of limited supplies, it's not like the player will be
able to exploit it as an infinite money loop"*), and stock depletion read as its own warning when watched (*"Co-op
Stores is down to 10 units"*, then 5). A longer game cannot have a world that only ever empties, so restocking has to
exist — but it must be designed against the stock race, or buying-because-it-won't-be-there-later dies.

### 2.2 The living galaxy

**Budget the change, galaxy-wide, for everything.**
*ADR 0001 generalised, and the designer's direction of 2026-10-22: apply it to every system that makes something
happen.* The old mechanism's volume was a product of content size — `buyers × wants per buyer × chance per jump` — so
a rate tuned for five locations is wrong for thirty, and the per-entity chance low enough to keep a big galaxy quiet
is low enough that an individual thing effectively never changes, which deletes the feature by another route. The
budget form is `changesPerJump` plus weights over event kinds: **volume and split are each one number, and neither
moves when the content grows.**

Measured on the prototype: the old mechanism generated 5.1 events a jump and 81.8 a run; the budget at 4 generates
80.4 a run — about the same amount happening — while the player hears 16.4 announcements instead of 28.9, and 8% of
landings carry three or more instead of 28%.

This applies in the full game to wants, orders, stock, prices, rumours, who is hidden, NPC movement, weather,
anything. Every generator gets a budget and weights, and the budget is the tuning surface.

**Announce what the player counted on, not what changed.**
The prototype's second half of the fix, and the most transferable single idea in it. A change is announced only when
it changes something the player had reason to count on: cargo in the hold that fits a want they know of, a want an
introduction named, a want they have already sold to, or something they are explicitly watching. Everything else
happens unannounced and is theirs to find.

The crucial property: **the announcement load stops climbing with the player's knowledge of the galaxy.** The old
mechanism's load grew from 0.25 to 2.65 announcements a landing over a run, not because the galaxy got busier but
because the *audience* grew — the filter was a diff of the contacts list, so knowing more meant hearing more. Three
fixes failed because they treated this as a contacts problem; it was a volume problem with an audience-shaped filter
on top.

Nothing is *hidden* by this. Everything the player knows stays in their contacts as **last known**, and landing
corrects it. Information decaying with distance is in the grain of this kind of game; it was the news display that
fought it.

**Let the player declare their plan, and make the declaration a verb.**
`watch` — the player saying in so many words that their plan runs through this buyer or this lot, capped at five —
earned its place in a single session. It was the only route by which good news could reach the player at all, the
only route for "they're buying again" and "that lot is being bought out", and the cap was hit in both bracketing runs
without the refusal reading as a wall. The designer's own best moment with it: *a hold full of wheat, a watch set on
the galley that had gone dark, and a sale made when it reopened.*

In the full game, plan-declaration should be first-class and plural: **an accepted job is the strongest form of it**
(see 2.1), with watch, a standing order, a manifest or a route plan as the lighter forms. This is what lets a
relevance filter work without guessing, and it is the answer to "a bigger game will overload the player": budget the
volume, filter by what they count on, and let them say what they count on.

**Aliveness scales with *discovered* change; noise scales with *announced* change.**
The sharpest finding of the rebuild, and it was an accident. Half the change budget went to the supply side — lots
arriving, lots being picked over by someone other than the player — and almost none of it was announced. It turned
out to be *"the quietest-working part of the whole change"*: eight to twelve lots appearing over a run and six to
fifteen being bought out from under the player, all of it read off a live, galaxy-wide trade guide, with nothing
shouted. Meanwhile announced change skewed heavily to bad news — **5.3 doors closing for every door opening** — and
was the complaint for four sessions running.

Two consequences. First, **a strong, always-current, galaxy-wide reference surface is not UI polish; it is the organ
that carries aliveness**, and the full game should budget change preferentially toward things the player *finds*
there. Second, a lot selling out to someone else is the only event in a pure-commerce game where the galaxy
*competes* with the player, which is the strongest aliveness signal commerce can produce on its own.

**"Too random" is a causality problem as much as a volume problem.**
Volume matters: at a budget of 2 the galaxy read closer to dead than calm, and at 4 it read alive. But the other half
is this, on buyers going quiet: *"Some of both, actually. The timing is pretty clearly random, which feels
mechanical, and there really isn't any justification for the absence."* **Change the player can attribute to a cause
reads as a living world at any volume; change they cannot reads as dice at any volume.** The designer's own fix is
the right one: if the full game runs on days rather than jumps, shops have weekends, and an absence can be given a
reason — *"Old Marta is taking a week to breathe in the Venusian haze."* Calendars, schedules, seasons, shipping
cycles and named local events should be the *carriers* of the change budget, not abstract event kinds.

**The three-beat absence works, and the race it creates is proven.**
Warn, go quiet, come back — with the buyer's identity and their unsatisfied wants preserved across the spell, the
warning landing two or three jumps ahead, and the buyer saying it in their own voice. All three messages earned their
place (*"All three messages serve a purpose, if I care about that buyer"*), and want identity surviving the spell
*"feels more like continuity than unnecessary information."* The timed risk it creates was the one piece of the
changing-needs machinery that never needed a revision: all three outcomes were seen in play — a want written off, a
risk taken that paid, and a risk taken that left cargo to carry. **Granularity matters: the buyer leaves the market,
not the want.** Per-want churn was both noisier and less legible than per-person absence.

### 2.3 People

**Access is the reward the player notices; money is the one they don't.**
Introductions and leads were the standout mechanic of the entire prototype, in every session, with *none ever
missed* once written as the character's own line carrying a named want: *"the introductions, especially the
multi-level ones, really worked nicely."* An introduction creates a pure travel sub-goal whose payoff is access
rather than credits, and it was the best-working thing in the game. Relationship payoff should lean on **access,
information and story**, with credits as the scorekeeper.

**Better prices from warmth come back — but only with a legible handle.**
*Revised 2026-10-22; the prototype listed this as a dead end.* The prototype's finding was that warming's price
effect *"is there, but it isn't what the player notices"*, because it could not be seen without out-of-game
recordkeeping, and the shape could not be aimed at: the visible reward (a new introduction) seemed to come out of the
blue and the invisible one could not be planned for. It was also gameable — selling one unit at a time walked a
character up the levels quickly.

That is a legibility failure, not a design failure, and the full game should keep the motivator and fix the
legibility: say what tier a relationship is at and what it is worth, say what the next tier gives, show a price *as*
a relationship price when it is one, and let the player see the difference against what someone else would pay. The
anti-gaming rule from the prototype is already right and should carry: **warmth rises once per want fully met, not
per delivery and not per unit.** Orders help here too — a stated price is a place to show "and this is the friend's
rate".

**Information wants to be ungated; intimacy should be earned.**
Gating a buyer's *wants* behind a visit failed outright. The premise was that an overwhelmed player would stop
visiting rather than collect more notifications; play proved it false — the player visited every buyer as fast as
possible regardless, so the gate delayed the flood without shrinking it, and in the meantime not knowing those wants
*"felt like I was missing something important."* The replacement (ADR 0002) splits it: **the want reaches the player
by landing where the buyer lives, said plainly; the character's own wording is earned by calling on them.** The
designer's verdict on playing it: *"an interesting experiment, and maybe not quite the right solution"* — kept as
proof-of-concept, with the shape of the answer right and the details open.

Its stated risk is live and unresolved: **with nothing else withheld, calling on someone may come to feel like a
formality.** Give the visit something only a visit can yield — the question-asking action, a better hint on a vague
want, a price only offered in person, a story beat.

### 2.4 Content

**Invert the tag-to-good ratio, and vague wants start working.**
Vague wants were the most promising idea in the content and went nearly unused across three sessions: *"I don't think
I did much with the vague wants, at all."* The content explains why, countably: **27 tags across 24 goods**, with the
largest tag covering five goods. At a near-1:1 ratio a vague want asks *"is there anything at all that fits?"*, which
is strictly harder than a plain want and pays no more for the trouble. The designer's own reading is the fix:
*"If Bob wants anything with the 'alcohol' tag, and there are a few dozen types, the question becomes less 'can I get
him something' and more 'can I get him the best thing.'"* **Many goods per kind-tag is the lever**, plus a reward
premium for the oblique read and a way to ask questions.

**A tag system needs tells, and the discipline has to be written down.**
The player never sees tags, so every tag needs a *tell*: the kind of words a description uses to signal it (`alcohol`
→ brewed, distilled, proof, hangover; `pungent` → reek, ripe, you'll know it's there). The prototype's tag table,
with a tell per tag, is the single most reusable page of content documentation it produced. The rules that went with
it held up and should carry:

- A tag means one thing everywhere; a good carries 1–4 of them; tags no buyer uses are noise.
- A good carries its origin tag only where the origin makes a difference.
- **Bonus and refusal tags should each land on 2–4 goods**, so they are learnable patterns rather than one-off
  answers.
- The best quality tags work both ways — a bonus for one buyer and a refusal for another. (`martian` was a bonus at
  three buyers and a refusal at two, and that is the ideal.)
- Idiosyncratic one-character tags (Bob's `blue`) are worth having, and worth rationing to two or three in the whole
  galaxy.

**"Supported but unused" usually meant "barely present".**
A corrective before anything is written off as disproven. Of 52 wants in the shipped content set: **3 paid in goods,
3 named an exact item, 2 were steady, 11 were vague, 5 were gated behind warmth.** The relay — a sale paid in goods
whose payment only has a home elsewhere — *"reads as free cargo, not as a lead"* on a sample of three. The dump
buyers were never used, and there were two of them. The content's own rule says a bonus tag needs 2–4 goods *to be a
learnable pattern*; **the same threshold applies to want shapes and transaction shapes.** Give each shape enough
instances to be learnable before judging it.

**Tags and wording will disagree, and at scale nobody will catch it by reading.**
Found by hand while writing the first content set: balloon silk is `cloth`, so it answers a want for something warm,
and it is not warm; anti-rad doses come from Valhalla and so do not answer a want for something from the Jupiter run.
In the prototype these were caught because the content was written *for* the combinations and every pairing was read.
Once goods, buyers and characters are written apart and left to meet, nobody reads every pairing. The full game needs
**a tool that lists the cross-product for a writer to judge**, and an in-fiction escape hatch for what it finds — a
character turning down a particular item with a line of their own (*Ilse turns down the silk as pretty, but not
really warm*), which the prototype's engine could not express.

**Write the content the other way round, and decide the jokes.**
The prototype's set was a play-test set by construction: built so every tag, want shape and chain would turn up, with
a grid to fill. The real content should start from goods, buyers and characters with their own quirks and **let the
combinations and the stories fall out of how they meet**, with a much lighter check (say, that nothing is never
wanted) instead of a grid. Two smaller notes worth keeping: minor buyers are placing *orders* and should talk plainly,
characters are satisfying an *urge* and should lean vague; and how funny each character is should be a decided part of
their personality rather than an accident of who got written first.

### 2.5 Goal structure and the session

**Don't let one place and one deadline own the endgame.**
The debt was payable only at the lender's station, with a hard jump limit, so late in a run every sub-goal was judged
by whether it ended near Dock Nine, and **two of the first four runs were lost exactly there** — *"I was just at the wrong
place"*, at 1,555 credits against a debt of 1,500. An identical transaction was a different decision in the last
three jumps than in the first three. If the full game keeps a single place to settle up, it should be a deliberate
"getting home" act, not a positioning tax on the whole last third.

**A purely monetary goal makes a run summary worthless, and crowds out story.**
Asked whether recording memorable deliveries would make a good end screen, the designer said no: *"after this many
runs the galaxy is known, and with a purely monetary goal the memorable moments are the good prices, not the
deliveries."* That is the structural version of wanting more story-like experiences. **If a run is to be worth
looking back on, the goal has to reward something other than credits** — and a longer game needs that more, not less,
because variety has to beat grinding over dozens of turns rather than sixteen.

**The player will not keep records out of game.**
Stated flatly: *"I find I don't want to keep out-of-game records."* And confirmed from the other side — the one
feature that showed the player what a load had cost was *"reached for every time I sell something, almost without
fail"*, and changed a decision at least once. **Every system the design wants the player to reason about needs its
reading surface designed at the same time**, or it will not be used: profit, depletion, warmth, obligations, time.
The parked ledger idea (everything bought and sold over a run, with what was paid and received) earns its place in a
longer game where routes and buyers can be compared over time.

**Windfalls should be designed, not emergent.**
One character paid about a third of the debt in a single stop, from a pricing formula rather than from an authored
moment. A bigger goal makes a single transaction less able to dominate — which is the main reason this is not carried
forward as an open question — but it says payouts should scale with the scale of the goal, and a run-deciding windfall
should be something the design chose.

**Prospecting died by the fourth run, and the fix is which content is hidden.**
Going somewhere just to find out who is there was strong in the first run and gone by the fourth: *"after this many
runs the galaxy is known."* The per-run shuffle of stock, prices and starting wants was not enough, because *who is
hidden* was fixed by the content — an introduction is authored dialogue naming a particular buyer, so a returning
player knows from the start who is on Ceres. A bigger galaxy delays this and does not solve it. **Shuffle who and
what is hidden per run, and hold more content than one run can see.**

**Interruption is a design input.**
The browser's back button ended two play-test runs outright, because nothing was saved. A longer game needs
save/resume, which means being interrupted and playing across sessions are inputs to the design from the start, not a
feature to add at the end.

---

## 3. Dead ends: do not re-litigate

Each of these was tried, played and recorded. The reason matters more than the verdict.

1. **Reducing notification load by hiding information.** Tried three ways — a rethink of how contacts enter the game,
   gating wants behind a visit, and hiding buyers behind introductions. All three addressed *delivery*; the volume came
   from *generation*. The gate's premise — that an overwhelmed player would stop visiting rather than collect more
   notifications — is tested and false: **the player will always pay attention costs to avoid missing information.**
   Budget the generation and filter by relevance instead. (Hidden buyers were a success on their own terms, as leads;
   they just never touched the volume.)
2. **Tuning per-entity event rates.** Rejected with reasons in ADR 0001: any pair of rates is wrong for the next
   content set, and succeeding on one content set would hide the scaling problem rather than fix it.
3. **An adaptive change split**, where the galaxy favours whichever side the player has been ignoring. Rubber-banding,
   and it makes a mis-set budget indistinguishable from the adaptation.
4. **Relationship warming as a price motivator, in its prototype form.** Not dead as an idea — see 2.3, it comes back
   — but dead as an *invisible* effect the player is expected to infer. An unaimed-at reward is not a reward.
5. **An end screen listing memorable deliveries**, under a purely monetary goal. Nothing to say.
6. **Zero-space goods in a galaxy where everything is wanted.** A bet that cannot be lost.

---

## 4. Open questions carried forward

Short list, deliberately. Four things were owed a deliberate play-test and never got one; three of them are settled or
void.

**Carried forward:**

- **How plain and vague wants divide the game, now that orders carry a price.** The price gate is addressed by making
  the order primary (2.1), and that cascades straight into this: orders occupy the plain row of the four-shape table,
  which frees the vague row to be the risky, characterful one, and changes what a vague want is *for*. The prototype
  never got a clean read on vague wants — partly by design, since the notification work deliberately reduced their
  airtime to stop the game answering its own riddles — and the content explains the rest (2.4). This is the question
  the full game's first content set should be built to answer.

**Closed, with the reasoning:**

- **The price gate** — settled as far as the prototype can settle it, by the decision that an order states its price.
- **Whether one buyer deciding a run is a problem** — an artifact of the prototype's scale. A bigger galaxy and a goal
  scaled to it make a single transaction much harder to dominate. See 2.5 on designing windfalls.
- **The economy at the tuned change budget** — void. The numbers (`changesPerJump: 4`, weights, a debt of 1,500, 16
  jumps, a hold of 40) are all prototype-scale and none transfer. **What transfers is the process for finding them**
  (5.4), which will have to be adapted to the full game's scale anyway.

One hard constraint that any answer to the open question has to respect, because it is a property of the problem and
not of the prototype: **the notification layer must never answer the player's riddle.** Announcing that a buyer with a
vague want wants what is in the hold *is* the answer — the player reads it off the fact of being told, and no
rewording closes it. Vague wants have to reach the player some other way: by being asked about, by being watched, or
by being worked out.

---

## 5. What we carry across

### 5.1 Documents to keep as-is

Move these to the new repo, in `docs/`, as prototype-era decisions that are really full-game decisions:

- **ADR 0001, "Galaxy change is a budget, not per-want rates."** Its mechanism, its arithmetic and its reasons apply
  to every generator in the full game. Its *numbers* do not. Re-read the "Why not tune the rates" and "Why
  announcement is filtered rather than reduced" sections before designing any event system.
- **ADR 0002, "The visit earns the voice, not the want."** The information-ungated/intimacy-earned split, the reason
  ticket 20's withholding criterion is retired, and the unresolved risk that the visit becomes a formality.
- **`design-overview.md`**, this document's companion at a higher altitude, written the same day. It holds the game's
  name, the division between what to design up front and what to settle by playing, the nine top-level chunks the
  game is made of with what each one has already settled here, the demonstration that galaxy scale is a consequence
  rather than a decision, and the one thing to settle before anything else: **the shape of a session**, which is the
  unexamined assumption this document carries out of the prototype. Read it for what is undecided and in what order;
  read this one for what is known.
- **This document.**

### 5.2 Design material to keep as raw material

- **The seventeen sub-goal shapes** from the hunt catalogue, and the three axes that generated them: what generates
  the sub-goal (the player, or the world handing them one); what it is for (profit, space, information, position,
  access); and which unknown the player resolves when they commit credits (buyer, good, timing, stock, price). The
  catalogue should be rebuilt for the full game with each shape marked observed / supported / unbuilt, and with the
  commitment-unknown axis re-checked now that orders close the price one.
- **The four want shapes** (2.1), as the table to design wants against.
- **The tag discipline** (2.4): tags with tells, 1–4 per good, bonus and refusal tags on 2–4 goods each, two-way
  quality tags, origin tags only where the origin matters, rationed idiosyncratic tags.
- **The vocabulary that survived play.** These words did real work and should be reused rather than reinvented: *run,
  jump, hold, lot, good, want, wording (own / plain / withheld), vague want, steady want, buyer (character / minor),
  contact, lead, introduction, warmth, offer, reaction, match tier (refused / acceptable / great), bonus tag, refusal
  tag, trade guide, change budget, counted-on, watch, wind-down, quiet spell, reserve, picked over, outbound fill.*
- **The characters, locations and goods as a cast**, not as a content set. Ines the pump warden, Old Marta, Madame
  Ottilie, Bob and his blue stuff, Teodor, Ilse, Pim; Tharsis Domes, Dock Nine, Venus Low Orbit, Ceres Market,
  Valhalla Station. They are good, and several of them earned their keep in play (Bob's, Marta's and Ottilie's own
  lines were *"much better than the default ones"*). But the *set* was built to fill a grid and the full game's
  content should be written the other way round (2.4), so these come across as people and places to re-write for,
  not as data to port.

### 5.3 Architecture to keep as principles, not as code

The code is a throw-away prototype and is not coming along. These five choices were never the source of a problem in
any session and should be made again from scratch:

1. **One seam: a pure rules engine with no UI**, driven by start-a-run / act / read-only queries, deterministic for a
   given content set, seed and action sequence, never reading the clock.
2. **Content is data the engine receives and never imports.** Hand-written, with clear fields, and separate from the
   rules so content can be revised without touching code.
3. **A content validator that rejects mistakes at load** — an unknown tag, a good with no origin, a want nothing in
   the galaxy can satisfy, a vague want carrying a plain form. Content errors should surface immediately, not
   mid-play. A test should load the real content through it.
4. **Rules belong in the engine, not the view.** The one time news was computed in the page, it was a game rule
   outside the test suite, and moving it into the engine was a prerequisite for fixing it.
5. **Test through the public seam only**, asserting on what a player could observe, with small purpose-built content
   sets and fixed seeds rather than the real content — and with the defaults for a new field in *one* place, so adding
   a field doesn't mean editing fourteen fixtures.

### 5.4 Process to keep, which is worth as much as any mechanic

- **Instrument before redesigning.** Three fixes for the notification load failed, each guessing at a cause. A
  twenty-seed before/after harness named the cause in one pass — generation, not delivery — and the fix held. Build
  the measurement harness *first*, as a throw-away with its own config so the normal test run never picks it up, and
  report generated / announced / per-landing counts and **the curve through a run, not just the mean.** The curve was
  what revealed that the load grew with the player's knowledge rather than with the galaxy's busyness.
- **Two instruments, two jobs.** The scripted policy run gives exact counts and the shape of what happens; it cannot
  give a verdict. *"Alive at 4"* came from hand-play. Bracket a tuning decision with one seed played twice at two
  settings, so the setting is isolated from the content shuffle — and then hand-play it.
- **Write down what came of each play-test.** Every play-test write-up ends with a "what came of these notes" section:
  what it settled, what became a ticket, what was deferred and why, and what is explicitly *closed* so it is not
  picked back up by accident. This practice is the only reason this retrospective could be written, and it is the
  single cheapest thing in the whole prototype. Keep it, along with asking for a short list of questions to watch
  *before* a run rather than relying on recall afterwards.
- **Keep decisions as ADRs at the repo root, and specs and tickets as local markdown with a status.** Also worth
  keeping: a pre-commit hook running the same checks as CI, and a seed-finding script for tests whose assertions are
  about a seeded draw.
- **Name the content-shortage explanation when it applies.** More than once a mechanism looked broken and was starved:
  the late-run news turned bad because the galaxy ran out of wants to hand out, and three shapes looked disproven at
  three instances each. Ask "is there enough of this to judge it?" before redesigning.

---

## 6. What we leave behind

- **All the code** — engine, page, tests, harnesses, scripts. The architecture carries as principles (5.3); the files
  do not.
- **The content set** (`content/galaxy.json`, `content/starter.json`) as content. The cast carries as raw material
  (5.2).
- **Every tuned number**: the change budget and its weights, the watch cap of 5, the debt of 1,500, 16 jumps, a hold of
  40, 300 starting credits, the price bands and margin targets, the warning window. All prototype-scale, all void at
  the full game's size. The *process* for finding them carries (5.4).
- **The specs and tickets** in `.scratch/`. Their findings are in this document; their work items are finished or
  dead.
- **The content-design passes**, except the tag table and the writing rules extracted in 2.4 and 5.2. The pass
  structure itself (premise and tags, locations, goods, characters, minor buyers, shops, numbers, prose) is a
  reasonable order to write content in, and worth remembering as an order rather than a document.
- **The play-test checklist**, as a document. The practice of having one open during a run carries (5.4).
