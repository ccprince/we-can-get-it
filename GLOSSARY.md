# Glossary

The vocabulary of **We Can Get It For You**. Nearly all of it comes from the `schlepper` prototype,
where it did real work in play; findings §5.2 says to reuse these words rather than reinvent them.

Each entry cites its source so the evidence behind it can be read: `findings` is
`docs/prototype-findings.md`, `overview` is `docs/design-overview.md`.

Terms marked **undecided** are named deliberately and have no settled meaning yet. Don't invent one.

**Do not use the word *session*.** It was ambiguous between the unit of play and a stretch at the keyboard;
those are **campaign** and **sitting**, and the overview's "shape of a session" is the shape of a campaign.

## The campaign

| Term | Meaning |
| --- | --- |
| **campaign** | The unit of play: one whole winnable game, from the start to the last commission delivered. Continuous — nothing resets inside it — and long enough to take many sittings (overview §3). |
| **sitting** | One real-world stretch at the keyboard, of which a campaign takes many. Any number of days long; interruption is free, and the design cares only that a short sitting still feels finished (findings §2.5, overview §3). |
| **act** | A tier of the **ladder**, holding several commissions at one level of ambition. Clearing it unlocks the next tier — bigger patrons, further places, goods previously out of reach — and adds patrons to the roster. Several rungs per act and not one, because a shape needs 2–4 instances before it can be judged (findings §2.4, ADR 0004). |
| **run** | Prototype history only: one sixteen-jump pass against a debt. Deliberately not a unit of the full game, so its scale cannot come back in with the word (findings §6). |
| **jump** | A move from one location to another, and the prototype's unit of time. The full game's clock is days; what a day is, and what a journey consumes of it, stays open (overview §4, chunk 2). |

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
| **passage work** | Badly-paid, slow work available for the asking, paid in advance, that will get a broke player off the rock. More of it at busy hubs than at backwater outposts. The reason there is no stranded state: being broke costs **days**, not the campaign. |
| **standing arrangement** | A service bought on a recurring daily cost — a broker on retainer, a held berth, an information service — which reduces friction and never supplies cargo or access. Distinct from a **service**, a one-off bought per use — a courier for one delivery, a message carried, a load held. Both are purchased, never managed: the player is the one doing things. |
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
| **change budget** | The galaxy-wide number of changes per unit of time, plus weights over event kinds. Volume and split are each one number and neither moves when the content grows. Every generator gets one (ADR 0001, findings §2.2). |
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
