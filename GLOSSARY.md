# Glossary

The vocabulary of **We Can Get It For You**. Nearly all of it comes from the `schlepper` prototype,
where it did real work in play; findings §5.2 says to reuse these words rather than reinvent them.

Each entry cites its source so the evidence behind it can be read: `findings` is
`docs/prototype-findings.md`, `overview` is `docs/design-overview.md`.

Terms marked **undecided** are named deliberately and have no settled meaning yet. Don't invent one.

## The session

| Term | Meaning |
| --- | --- |
| **session** | The unit of play — a run, a campaign, or a campaign made of runs. **Undecided**, and the first thing to settle; everything else is scaled to it (overview §3). |
| **run** | One pass through the game, from start to settling up. In the prototype a run was sixteen jumps against a debt; that scale is void, the word is not (findings §5.2, §6). |
| **jump** | A move from one location to another, and the prototype's unit of time. Whether the full game runs on jumps or on days is open, and the answer carries attribution with it (overview §4, chunk 2). |

## Commerce

| Term | Meaning |
| --- | --- |
| **good** | A tradeable item in the catalogue, carrying 1–4 tags (findings §2.4). |
| **lot** | A quantity of a good on sale at a shop, finite and depletable (findings §2.1, §5.2). |
| **hold** | The ship's cargo space, and the constraint a full load runs into (findings §5.2). |
| **want** | Something a buyer is after. Classified on two axes — how specific the desire, how specific the voice — giving the four want shapes (findings §2.1). |
| **order** | A want a buyer states plainly **with the price they will pay**. The game's primary transaction and the dependable floor under speculation's ceiling; an accepted order is also the strongest form of plan declaration (findings §2.1). |
| **accepted job** | An order the player has taken on. The same thing as an accepted order, named for the commitment rather than the offer (findings §2.1, §2.2). |
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
| **warmth** | How well a buyer knows the player. Pays in access, information and story, with credits as the scorekeeper; rises **once per want fully met**, not per delivery and not per unit (findings §2.3). |
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
**session**, **time**, **map**, **goods and matching**, **demand and supply**, **people**,
**change**, **knowledge and its reading surfaces**, **the content pipeline**.

## Names to avoid

- **Star Trader** — the first attempt's name, retired with it.
- **Schlepper** — the prototype's name, retired with it.

The game is **We Can Get It For You**; **We Can Get It** is the working short form (overview §1).
