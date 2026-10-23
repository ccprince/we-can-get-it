# Glossary

The vocabulary of **We Can Get It For You**. Nearly all of it comes from the `schlepper` prototype,
where it did real work in play; findings §5.2 says to reuse these words rather than reinvent them.

Each entry cites its source so the evidence behind it can be read: `findings` is
`docs/prototype-findings.md`, `overview` is `docs/design-overview.md`.

Terms marked **undecided** are named deliberately and have no settled meaning yet. Don't invent one.

**Do not use the word *session*.** It was ambiguous between the unit of play and a stretch at the keyboard;
those are **campaign** and **sitting**; where older text says *session* of the unit of play, it
means the **campaign** (ADR 0004).

## The campaign

| Term | Meaning |
| --- | --- |
| **campaign** | The unit of play: one whole winnable game, from the start to the last commission delivered. Continuous — nothing resets inside it — and long enough to take many sittings (overview §3). |
| **sitting** | One real-world stretch at the keyboard, of which a campaign takes many. Any number of days long; interruption is free, and the design cares only that a short sitting still feels finished (findings §2.5, overview §3). |
| **act** | A tier of the **ladder**, holding several commissions at one level of ambition. Clearing it unlocks the next tier — bigger patrons, further places, goods previously out of reach — and adds patrons to the roster. Several rungs per act and not one, because a shape needs 2–4 instances before it can be judged (findings §2.4, ADR 0004). Distinct from an **action**, which is a thing the player does in a day. |
| **run** | Prototype history only: one sixteen-jump pass against a debt. Deliberately not a unit of the full game, so its scale cannot come back in with the word (findings §6). |
| **jump** | The traversal of one **lane**: a move from a location to the location that lane joins it to. Its *unit of time* sense is prototype history only — the clock is **days**, and a journey's length follows from the lane's **distance** and the ship's **speed** (ADR 0005, ADR 0006). |

## Time

| Term | Meaning |
| --- | --- |
| **day** | The unit of time and the beat of play: an integer index with nothing underneath it — no hours, no parts of a day. A day grants an allowance of **actions** and ends with a **digest** (ADR 0005). |
| **calendar** | The single galaxy-wide reckoning of days into **weeks**, **months** and **years**, perfectly regular — a month a whole number of weeks, a year a whole number of months, no leap days — so weekday follows from the day index and date arithmetic can be done in the head. Authored as content and checked at load. A **month** gives a date a sayable name and carries no mechanics; the **week** carries closures and billing. No local calendars, no local days, no time zones: differing orbits are scenery (ADR 0005). |
| **season** | A stretch of one location's year, asserted by that location's own content over the day index. Local and authored, never a unit the calendar has (ADR 0005). |
| **action** | Something the player does that spends part of a day; the day grants an allowance of them, and where the player is determines what is on offer — people and the road at a location, the ship and their own work in transit. **Trade is not an action**: looking, buying and selling are free within the day. Time is spent on people and on distance, never on shopping. Distinct from **act**, a tier of the ladder (ADR 0005). |
| **command sequence** | The engine's deterministic input log — the engine is deterministic for a given content set, seed and command sequence. Every **action** is a command, and so is buying a lot, which is not an action (ADR 0003 as amended by ADR 0005). |
| **wait** | Ending the day without going anywhere, chosen one day at a time. There is no waiting for a stated span and no engine-side condition that breaks a wait: the player decides again tomorrow with the **digest** in front of them. Sitting on a rock is meant to be mildly tiresome (ADR 0005). |
| **digest** | What the day boundary hands the player: the **counted-on** change that reached them. One surface everywhere — current news at a location, near-silence in transit, the whole span on landing after a long haul — and what makes a ten-minute sitting feel finished rather than truncated (ADR 0004, ADR 0005). |
| **transit** | The days spent on a route. A place like any other for the purposes of a day: its own thin menu of **actions**, its own events, and no changing the destination once underway (ADR 0005). |
| **out of contact** | The default in **transit**: galaxy news does not reach the ship and lands as a span in the arrival **digest**, so distance costs knowledge as well as days. Partial contact is purchasable as a **standing arrangement** (ADR 0005). |
| **as-of date** | The date a known fact was learned, carried by every fact the player holds and shown on every reading surface. Nothing is hidden or greyed for being old; the player judges what counts as stale (ADR 0005). |
| **schedule** | A published, repeating rhythm that is simply true and always was — a weekly closure, an annual festival, a shipping cycle. Costs nothing from the **change budget**, can be planned against, and is the part of the galaxy's *grammar* that survives between campaigns while its particulars are redrawn (ADR 0005). |
| **rumour** | The first beat of a coming delay: undated, uncertain, and it may come to nothing. Read off the **trade guide** rather than announced, which is what makes paying attention a skill rather than a lookup (ADR 0005). |
| **notice** | The second beat: the delay firms into a dated fact, and can therefore be routed around. **Nothing takes a day from the player without naming its date first** — an unannounced lost day is the one kind of change that reads as dice and can reach the loss condition (ADR 0005). |

## The map

| Term | Meaning |
| --- | --- |
| **chart** | The reading surface for the map, and common knowledge from day one: which locations exist, what **lanes** join them, and what each lane costs. It shows the numbers already converted for the player's ship — days, **fare**, and whether their **range** reaches at all — rather than the raw **distance** (ADR 0006). |
| **location** | A place on the **chart**, and an atomic node: one action menu, no interior geography and no distance inside it. A place never leaves the chart, though it can go dark or become unreachable (ADR 0006). |
| **lane** | The only way between the two **locations** it joins, with a **gate** at each end. Symmetric, and carrying a single authored number, its **distance**. Travel is along lanes and nowhere else, which is what makes a place *on the way* (ADR 0006). |
| **route** | A planned sequence of **lanes** from where the player is to where they mean to end up. A plan the player holds, not a thing the engine commits to. |
| **leg** | One **lane** of a **route**, flown as one departure. Its cost in days and in **fare** is fixed when the player departs, and the destination cannot be changed once underway (ADR 0005, ADR 0006). |
| **distance** | The single authored number a **lane** carries. Days and **fare** are both derived from it, so the chart and the content each hold one number per lane (ADR 0006). |
| **range** | The largest **distance** the ship can fly in one **leg**. A lane beyond it cannot be flown at any price, and range bought with credits is the **only** gate on the map — further places are a wall with a price on it, never a wall locked by an **act** (ADR 0006). |
| **speed** | **Distance** per day: a leg takes `ceil(distance / speed)` days, never fewer than one. A faster ship cuts days but not **fare** (ADR 0006). |
| **fare** | What a **leg** costs in credits: the **distance** times one galaxy-wide rate, quoted before departure and paid at departure. Not a burn — nothing accrues, and nothing is charged while the player sits still. In fiction it is access to the **gate** (ADR 0005 decision 14, ADR 0006). |
| **gate** | What makes a **lane** flyable, one at each end. An on-ramp and not a teleport: the crossing still takes days in **transit**. Its operator is who can close a lane or surcharge it, which is what makes such a change attributable rather than dice (ADR 0006). |
| **motif** | An authored fragment of topology with a named shape and typed **slots**, assembled per campaign to build the map. The map's grammar is the motifs and their invariants, which survive between campaigns; which locations fill them does not (ADR 0006). |
| **slot** | A hole in a **motif**, typed in **tag** vocabulary — an extractor at a **spur** end, a market at a **chokepoint** — and filled from the reserve at campaign start. Some slots are deliberately **untyped**, so a region's grammar has exceptions in it (ADR 0006). |
| **spur** | A **motif** shape: a dead end that must be flown out and back, so the journey there can be wasted. |
| **chokepoint** | A **motif** shape: a **location** every route through a region passes. The most interesting thing a **rumour** can be about. |
| **region** | A cluster of **locations** placed by one **motif**, with an economic grain running through it — raw out of the **spur**, finished out of the junction — so trade has a direction over the topology (ADR 0006). |
| **system** | A name several **locations** share, drawn together on the **chart**. Prose and legibility only: it carries no mechanics, and every **lane** inside one still costs at least a day (ADR 0006). |
| **standing character** | What a **location** is known to trade in, stated in **tag** vocabulary and published on the **trade guide** from day one. It tells the player where to start looking; what is actually in stock, at what price and who is there to want it is discovered and carries an **as-of date** (ADR 0006). |

There is no fuel in the model. **Fuel** is prose — a **tell** for the **fare** and for **range** — and never a
tracked quantity, a refuelling chore, or anything that competes with the **hold** (ADR 0006).

## Commerce

| Term | Meaning |
| --- | --- |
| **good** | A tradeable item in the catalogue, carrying 1–4 tags (findings §2.4). |
| **lot** | A quantity of a good on sale at a shop, finite and depletable (findings §2.1, §5.2). |
| **hold** | The ship's cargo space, and the constraint a full load runs into (findings §5.2). |
| **want** | Something a buyer is after. Classified on two axes — how specific the desire, how specific the voice — giving the four want shapes (findings §2.1). |
| **order** | A want a buyer states plainly **with the price they will pay**. The game's primary transaction and the dependable floor under speculation's ceiling; an accepted order is also the strongest form of plan declaration (findings §2.1). |
| **accepted job** | An order the player has taken on. The same thing as an accepted order, named for the commitment rather than the offer (findings §2.1, §2.2). |
| **commission** | An order of the largest kind: a patron's job, stating what is wanted, where, by when and for what. Not a sibling of **order** but a subtype of it, so there is one transaction path. The rungs of the ladder a campaign is won by climbing; accepting one stakes **standing**. Several stand on offer at once with visible windows and may be **withdrawn** by the galaxy before they are taken, while only one at a time can be accepted — so the decision is which of these is worth the slot (ADR 0004). |
| **ladder** | The finite, uncounted series of commissions a campaign offers, ending in one final commission that cannot be filled without most of the galaxy and most of the player's relationships. Delivering it is the win. |
| **breadth**, **depth**, **distance** | The three axes a commission's difficulty is designed against, and price is not one of them. **Breadth** is a list ("one of every kind of X"), leaning on tags. **Depth** is access — the holder won't deal with a stranger, so the job is three introductions long. **Distance** is a route the map makes awkward. They pull on goods, people and the map respectively; the final commission demands all three (ADR 0004). |
| **passage work** | A class of **order** defined by its terms — **paid in advance, cargo supplied** — covering **passengers** and **mail**. Not a mechanism of its own: its cost in days is simply the journey, and it has a destination and a date like any other order. The reason there is no stranded state: being broke costs **days**, not the campaign (ADR 0004, ADR 0005). |
| **mail** | The worst-paid **passage work**: a consignment of negligible size, always on offer at every location within the baseline ship's capacity. The actual floor under the promise that the player can never be stranded — a guarantee resting on passenger berths would strand a ship that had none. **Passengers** pay better but need berths, which is a reach upgrade where volume makes bad work worth doing. Freight supplied by someone else and paid on delivery does not exist (ADR 0005). |
| **standing arrangement** | A service bought on a **daily rate billed a week in advance** — a broker on retainer, a held berth, an information service that reaches the ship in **transit** — which reduces friction and never supplies cargo or access. Quoted daily so burn is comparable to a haul or a deadline; charged weekly and **prepaid**, so nothing ever accrues against the player: non-payment lapses it with an attributable notice, cancelling ends renewal rather than ending the week, and a mid-week purchase is pro-rated (ADR 0005). Distinct from a **service**, a one-off bought per use — a courier for one delivery, a message carried, a load held. Both are purchased, never managed: the player is the one doing things. |
| **offer** | What a buyer will pay for a particular good against a particular want. A function of the good's worth and the quality of the match, never a per-want constant (findings §2.1). |
| **reaction** | What a buyer says when shown a good — the in-fiction form of the match tier (findings §5.2). |
| **match tier** | How well a good answers a want: **refused**, **acceptable**, or **great** (findings §5.2). |
| **thin demand** | The content rule that there are more goods than wants, so some goods are wanted by nobody at the moment. What makes speculation able to lose (findings §2.1). |
| **outbound fill** | "I'm leaving here, what can I carry out?" — the most-played shape in the prototype and the one never designed. Its common form is the intermediate stop: at A, bound for C, stopping at B (findings §2.1). |
| **picked over** | A lot whose quantity drops without the player buying it, down to selling out. The galaxy competing with the player (findings §2.2, ADR 0001). |
| **reserve** | Content held back from play — pool lots awaiting arrival, and more broadly the galaxy holding more than one unit of play can see (findings §2.5, ADR 0001). |

## Tags and content

| Term | Meaning |
| --- | --- |
| **tag** | A property of a good that wants match against. A tag means one thing everywhere; tags no buyer uses are noise (findings §2.4). |
| **tell** | The kind of words a good's description uses to signal a tag it carries — `alcohol` → brewed, distilled, proof; `pungent` → reek, ripe. The player never sees tags, so every tag needs one (findings §2.4). |
| **bonus tag** | A tag that improves a particular buyer's offer. Should land on 2–4 goods, so it is a learnable pattern rather than a one-off answer (findings §2.4). |
| **refusal tag** | A tag that makes a particular buyer say no. Same 2–4 goods rule; the best quality tags work both ways, a bonus for one buyer and a refusal for another (findings §2.4). |
| **vague want** | A want whose voice is oblique — "I'm feeling nostalgic." The risky, characterful row of the four-shape table, and the subject of the one open question carried forward (findings §2.1, §4). |
| **steady want** | A standing want that does not expire; the prototype's dump buyers had them (findings §2.4, ADR 0001). |
| **wording** | How a want reaches the player. **Own** is the character's voice, earned by calling on them; **plain** is the composed form that arrives by landing where they live; **withheld** is the retired prototype state (ADR 0002). |

## People

| Term | Meaning |
| --- | --- |
| **buyer** | Someone who wants something. A **character** has their own voice and quirks and leans vague; a **minor** buyer is placing an order and talks plainly (findings §2.4). |
| **contact** | A buyer the player knows of, held in the contacts list as last known. Nothing is hidden by relevance filtering; landing corrects what is stale (findings §2.2). |
| **lead** | A pointer to a want or a buyer the player has been told about (findings §5.2). |
| **introduction** | A character's own line naming another buyer and a want of theirs. The standout mechanic of the prototype: a pure travel sub-goal whose payoff is access rather than credits (findings §2.3). |
| **quest** | A non-transactional undertaking: **no price**, no standing at stake, free to decline, paid purely in access, information or warmth. One errand or a chain of them; the absence of a price is what defines it, not the presence of steps. Covers the favour, and is the road to a **vouch** (ADR 0004). |
| **warmth** | How well a buyer knows the player. Pays in access, information and story, with credits as the scorekeeper; rises **once per want fully met**, not per delivery and not per unit (findings §2.3). |
| **standing** | How far the galaxy still takes the player at their word — and mechanically, the **patron roster** itself: the named list of patrons who will still deal with him. Failing a commission costs that patron; clearing an act adds patrons; a **vouch** recovers one. Its entire effect is which commissions are offered, never the player's capability, so failure costs opportunity and cannot spiral: with a long list he picks the commission that fits his plans, and as it shortens the commissions drive his choices instead. An **empty roster ends the campaign** — the one loss condition (ADR 0004). |
| **patron** | Whoever a commission comes from, and a name on the **standing** roster. Authored content with a voice, while a commission's *substance* is composed by the engine from this campaign's own galaxy, so a rung can surprise the designer. A patron whose job is dropped drops the player, in his own words — which is what makes the loss attributable rather than dice (findings §2.2, ADR 0004). |
| **vouch** | A warm character staking their own name on the player, restoring one step of **standing**. Askable only of the very warm, once per person ever, and it spends that warmth. The only upward movement standing has, and it is paid for out of the spine of progression. |
| **quiet spell** | A stretch during which a buyer has left the market. Three beats — warn, go quiet, come back — with the buyer's identity and unsatisfied wants preserved across it. The buyer leaves, not the want (findings §2.2). |
| **wind-down** | The warning beat that opens a quiet spell, landing two or three jumps ahead of it (findings §2.2, §5.2). |

## Change and knowledge

| Term | Meaning |
| --- | --- |
| **change budget** | The galaxy-wide number of changes **per day**, plus weights over event kinds. Volume and split are each one number and neither moves when the content grows. It runs everywhere and at all times, including while the player is in **transit**, so a long haul is days of change they did not watch. Spent on one-off **events**, never on **schedules**. Every generator gets one (ADR 0001 as re-denominated by ADR 0005, findings §2.2). |
| **counted-on** | A thing the player had reason to rely on: cargo that fits a want they know of, a want an introduction named, a want they have sold to, or something they are watching. Only counted-on change is announced (ADR 0001). |
| **watch** | The player saying in so many words that their plan runs through this buyer or this lot. The lightest form of plan declaration; an accepted job is the strongest (findings §2.2). |
| **trade guide** | The always-current, galaxy-wide reference surface. Not UI polish — the organ that carries aliveness, because aliveness scales with *discovered* change while noise scales with *announced* change (findings §2.2). |
| **ledger** | The record of everything bought and sold, with what was paid and received. The player will not keep records out of game, so every system they are meant to reason about needs its reading surface (findings §2.5). |

## The nine chunks

The top-level parts of the design, used as area names in the issue tracker (overview §4):
**campaign** (formerly *session*), **time**, **map**, **goods and matching**, **demand and supply**, **people**,
**change**, **knowledge and its reading surfaces**, **the content pipeline**.

## Names to avoid

- **Star Trader** — the first attempt's name, retired with it.
- **Schlepper** — the prototype's name, retired with it.

The game is **We Can Get It For You**; **We Can Get It** is the working short form (overview §1).
