# ADR 0007: A tag declares its class, and the engine derives the match

**Status:** accepted, 2026-10-22
**Context:** `docs/design-overview.md` §4 chunk 4, §5 (the question this settles), §6 item 4;
`docs/prototype-findings.md` §2.1, §2.3, §2.4, §4, §5.2, §5.3; ADR 0002, ADR 0003, ADR 0004, ADR 0006

## Context

ADR 0006 moved the blocking question off the chunks and onto **the four upstream parameters of §5**, and
named the tag structure as the first of them — because decision 4 there had just given tags a second
customer. Tags now type the map's **motif slots** and carry a location's published **standing character**,
as well as matching goods to wants. A third customer was already waiting: ADR 0004's **breadth** axis asks
a commission for "one of every kind of X", which is a sentence about tags.

The pressure comes from one counted failure. Vague wants were the most promising idea in the prototype's
content and went nearly unused across three runs, and the content explains why arithmetically: **27 tags
across 24 goods**, the largest tag covering five goods. At a near-1:1 ratio a vague want asks *"is there
anything at all that fits?"*, which is strictly harder than a plain want and pays no more for the trouble
(findings §2.4). The designer's own reading is the fix and it is a structural one: **many goods per
kind-tag is the lever**, plus a premium for the oblique read and a way to ask questions.

That diagnosis cannot be acted on, though, until the engine knows which tags are *kinds*. "Goods per
usable kind-tag" is the one number the whole chunk turns on, and in a flat vocabulary of undifferentiated
strings it is not a computable quantity. So the first decision below is the one that makes the rest
measurable.

Two further constraints shaped this. Findings §2.4 found that **tags and wording will disagree, and at
scale nobody will catch it by reading** — balloon silk is `cloth` and is not warm — and asked for a
cross-product tool plus an in-fiction escape hatch the prototype's engine could not express. And findings
§2.1 fixes the offer as a function of the good's worth and the quality of the match, "never a per-want
constant", explicitly because content discipline will not survive several hands.

Settled on 2026-10-22 in five rounds of questions. Every number in this ADR is either a **declared
content-set bound** (decision 15) or a **sizing estimate** (decision 16). None of them is a finding.

## Decision

### What a tag is

**1. A tag declares its class, and there are four.** Every tag in a content set names itself as a
**kind**, a **quality**, an **origin** or a **quirk**. Findings §2.4 already talked about all four in
different voices — `alcohol` and `cloth`; `pungent` and `warm`; origin tags "only where the origin makes
a difference"; Bob's `blue`, rationed to two or three galaxy-wide — but the distinction lived in a
writer's head, where the validator could not reach it and the measurement harness could not count it.
Making the class first-class is not tidiness: it is what makes *goods per usable kind-tag* a number the
engine can report.

**2. A good carries exactly one kind-tag, and kinds are flat.** The kind is mandatory, there is no
hierarchy — no `spirit` under `alcohol` — and the remaining tags are quality, origin and quirk. A
hierarchy is the obvious way to let a vague want sit broad while a shop's character sits narrow, and it
was rejected for a specific cost: the headline ratio stops being one number, since counting a parent's
descendants is a choice; a breadth commission has to pick a level; and the untested depth lands squarely
on the one lever findings §2.4 identified. Breadth comes instead from the *count* of goods under a kind.
Exactly one kind makes "a good belongs somewhere" true by construction, which is what a slot's supply set
and a breadth list both need. If this is wrong, it shows up as vague wants still dead at a good ratio,
which is a measurable failure rather than a silent one.

**3. Kind-tags are public vocabulary; the other three classes are never named.** ADR 0006 decision 17
publishes the kinds traded at a place on the trade guide from day one, and ADR 0004's breadth axis asks a
commission to list kinds — both need a word the player can read. Findings §2.4 says the player never sees
tags. Both hold if visibility splits by class: a kind may be named on the trade guide, in a commission's
list and in a location's character, and the player may learn to say it; a **quality, origin or quirk tag
is named nowhere** and is reached only through its tell. The riddle is intact where it matters — knowing
a place deals in `spirits` says where to start looking and nothing about whether this bottle is what the
nostalgic woman meant.

**4. A tag declares its tell, and the tell is checked but not enforced.** For every invisible tag the
**tell** *is* the tag (findings §2.4: `alcohol` → brewed, distilled, proof; `pungent` → reek, ripe). Each
tag's content declares its tell words, and the loader can mechanically check whether a good's prose
contains any of them. That check reports for a writer's judgement and never fails the load: a missing
tell word is overwhelmingly a writer finding a better word than the tag table predicted, and failing
would train writers to pad prose with keywords, which is the opposite of what a tell is for. What **does**
fail the load is a tag declared with no tell at all, and a tag no want anywhere uses — findings §2.4's
"tags no buyer uses are noise", now checkable. An origin tag that no want uses is exactly that case, which
is how "only where the origin makes a difference" stops being advice.

**5. A kind-tag is *usable* when it carries a declared floor of goods, and only a usable kind may be the
subject of a vague want.** Overview §5's lever is goods per **usable** kind-tag, and the word is
load-bearing: a kind carrying one good cannot host a vague want, because "is there anything at all that
fits?" has one answer. Left undefined, the ratio is fudgeable — eight-per-kind on average while half the
kinds are singletons is the prototype's failure with a better mean. So usability is a validated property
of a kind. Unusable kinds stay legal as a location's character or a plain want's subject; the validator
refuses a **vague** want pointed at one. The report states the **distribution** of goods per kind, never
the mean, per CLAUDE.md.

### What a want is

**6. A want names a conjunction of tag terms, or one good by identity.** A term is a tag or a negated
tag — `cloth and warm`, `spirits and not martian` — and there is no disjunction. A want for "brandy or
whisky" is a want for the kind above them, which is what flat kinds with many goods each are *for*;
allowing disjunction would let a writer fake breadth the kind vocabulary should be carrying. Negation
stays, because a refusal stated in the **want** differs from one attached to the buyer: "something warm,
but god not another fur" is the want, not the person. The alternative to identity — expressing the
four-shape table's specific-desire row as a tag conjunction narrow enough to select one good — was
rejected because it quietly breaks decision 5 by forcing near-unique tags into existence. The validator
checks that a named good exists and can be reached in the drawn galaxy.

The second reason conjunction matters is decision 9: a conjunction has a **count of satisfied terms**,
which is the only thing that makes a tier between refused and acceptable derivable rather than authored.

**7. Bonus and refusal are roles held on the buyer, not classes of tag.** Findings §2.4's stated ideal is
a tag that works both ways — `martian` a bonus at three buyers and a refusal at two — which settles it:
the role is a property of the buyer's relationship to a tag. Content holds them on the buyer (*this one
pays more for `x`, refuses `y`*), and the spread bound of decision 15 attaches to **a tag as used in a
role**: if any buyer treats a tag as a bonus or a refusal, that tag must sit on enough goods to be a
learnable pattern. A tag used only as a plain kind is exempt from the spread bound.

**8. A quirk is rationed in count and bound like any role tag in spread.** What makes `blue`
idiosyncratic is that **one buyer cares about it**, not that one good carries it. It still has to sit on
enough goods to be a pattern the player could have found, or Bob's quirk is a one-off answer that could
only ever have been learned by being told. Exempting quirks from the spread bound would make them the
hole through which unlearnable content enters. The ration — two or three in the galaxy — is a declared
bound on the *number of quirk tags*.

### What the engine computes

**9. There are four match tiers, and the engine derives them.** `refused`, `grudging`, `acceptable`,
`great`:

- every term satisfied, plus a bonus tag at this buyer → `great`
- every term satisfied → `acceptable`
- some but not all positive terms satisfied → `grudging`
- no positive term satisfied, or a negated term violated, or a refusal tag present → `refused`

Grudging is reachable only for a want specific in more than one way, which is what earns it: a single-tag
vague want stays binary, so the risk in the vague row is untouched. It also puts findings §2.4's own
example into the rules — `cloth and warm`, and the silk is cloth and is not warm — rather than leaving it
to the hand-authored escape hatch of decision 14.

**10. The engine exposes which term failed.** Grudging prose has to be able to say *why*: "pretty, but not
really warm" is the tell doing the work, and a reaction that cannot name the gap is only a worse
`acceptable`. So the match result carries the failed term, and the view says it in the buyer's words. This
is a requirement on the seam, not on the content.

**11. Grudging belongs to speculation, and never to an order.** Two different transactions were being run
together here: a **delivery against a contract** the player accepted, with stated terms and a stated
price, and a **sale to somebody who happens to want something**, where the buyer makes an offer. Grudging
is a property of the second only.

So on an **order**, no tier below `acceptable` authorises a transaction at all. The player who walks in
holding `cloth` against a `cloth and warm` order is declined: no credits change hands, and **the order
stays open and unchanged** until it is filled at `acceptable` or better or its stated date passes. They
have lost the trip and nothing else. A **commission**, being a subtype of order, behaves the same, and
showing up with the wrong thing costs **no standing** — standing is staked on the **date** passing, which
is what keeps the loss attributable: the patron drops the player for missing a deadline, in their own
words, and never for a bad afternoon. This is findings §2.1's "dependable floor under speculation's
ceiling" cutting both ways; a contract dischargeable by a near-miss at a reduced price is not a floor but
a negotiation, and what the player was promised on accepting the job was a price for a *named thing*.

On a **speculative want**, a grudging sale happens and **closes the want**, remainder of a quantified want
included. Warmth rises *once per want fully met* (findings §2.3) and a grudging sale does not meet it, so
no warmth falls out rather than being added — and the closure is the other half of the cost: taking the
grudging price **spends** the better price and the warmth that going and finding the right thing would
have paid. The rejected alternative is the want persisting so the player can return with something better,
which makes grudging strictly free money — dump every near-miss on the way past, keep the want, come back
for the full price — removing the decision grudging exists to create, and making the buyer a fool.

The player's reading, which is the test this is designed to pass: *"it's the best I've got, so a crummy
sale is better than nothing"*, or *"you're right, this isn't good enough — I'll go and find something
better."* Both are live, several times a campaign, and the want staying open for as long as the player
keeps holding out is what makes the second one a real option rather than a regret.

**12. Worth is one authored number per good, and it is not a tag.** The offer is a function of worth and
match quality (findings §2.1), so worth has to come from somewhere. Deriving it from tags — a `luxury`
tag implying a high number — sounds tidy and is a trap: it couples the matching vocabulary to the price
scale, so adding a tag for match reasons silently moves money, which is precisely the drift findings §2.4
says nobody will catch by reading. Worth is the galaxy-wide anchor an offer is computed against, not a
price: what a shop charges and what a place pays vary by location and by stock, which is chunk 5's
business.

**13. The offer is worth, tier and the want's *voice*, applied by the engine.** Findings §2.4's fix is
two-part — many goods per kind-tag, *plus a reward premium for the oblique read*. The tier derivation of
decision 9 reads only the desire side of the four-shape table, so the voice enters here: a vague-voiced
want pays a premium at the same tier, because the player solved something. Letting writers put the
premium in each want's price is the per-want constant findings §2.1 already rejected. This makes the four
shapes **mechanically** real rather than a descriptive taxonomy, and it means the open question the first
content set is built to answer — how plain and vague wants divide the game — is answerable by moving one
number. The premium cannot ride on an **order**, which states its own price; orders occupy the plain row,
so the premium is the speculative row's pay, which is the division the open question is about.

**14. One authored exception: a per-buyer, per-good override, with prose, at any tier.** Findings §2.4
asked for an in-fiction escape hatch — *Ilse turns down the silk as pretty, but not really warm* — for
disagreements between tags and wording. An override names a buyer, a good and a tier, and may set **any**
tier, not only `refused`: `refused` with a line is the Ilse case, and `acceptable` or `grudging` with a
grudging line is the more useful one, letting a writer fix a pairing that is merely wrong without
deleting the sale. The override **is** the fiction, so an override without its own prose fails the load.
The cost accepted: the cross-product report must show which pairings are overridden, or overrides become
the place drift hides.

### Content-set bounds and the pipeline

**15. The bounds are declared content-set parameters, never engine constants.** *1–4 tags per good* and
*bonus and refusal tags on 2–4 goods* were found at 24 goods, and CLAUDE.md voids every tuned prototype
number — these two included, though the glossary stated them as rules. A content set declares its own
`tagsPerGood` range, its `goodsPerRoleTag` range, the usability floor of decision 5 and the quirk ration
of decision 8; the validator enforces what the content set declared; the engine hardcodes none of it.
Growing the catalogue is then a config edit rather than an argument, which is the point — both bounds are
expected to widen as the catalogue grows. What transfers from the prototype is not the numbers but the
**reason** for the lower bound: a role must be a learnable pattern, so more than one good.

**16. Sizing estimates are a named, separate tier of number.** A *tuning* number cannot be reasoned out.
A *sizing* number has to exist before a content set can be written at all, and writing the first content
set is the only way to measure anything — so overview §5 already made this move once ("Choose a target —
say six to eight goods per usable kind-tag — and the catalogue size falls out"). A sizing estimate is
stated as an order of magnitude with the derivation it came from, is labelled **void on first
measurement**, and is evidence of nothing. Because §5's chain is arithmetic, only two seeds need
estimating:

| Seed | Sizing estimate | Why |
| --- | --- | --- |
| Goods per usable kind-tag | 6–8 | Overview §5. The prototype's largest tag covered five goods at near-1:1 and failed (findings §2.4). |
| Number of kinds | 20–30 | What it takes to give regions an economic grain worth reading (ADR 0006 decision 4). |

Everything else falls out and is recorded as arithmetic, not judgement: a catalogue of order **10²
goods** (~140, against the prototype's 24); live wants **fewer than goods** by the thin-demand rule
(findings §2.1), so order 10² and below it; quality tags in the low tens; origin tags about ten; quirk
tags two or three — a vocabulary of order 80 tags across order 140 goods, inverting the prototype's
27-across-24. The first content set declares bounds in the same tier: `tagsPerGood` one kind plus up to
four others, `goodsPerRoleTag` from three to about eight.

**17. A location's standing character is an enumerated *character* that declares kind sets.** ADR 0006
types motif slots by writing `extractor`, `processor`, `market` — a short enumerated vocabulary — while
decision 17 there publishes "the kinds of thing traded at a place", which is kinds, not archetypes. Both
layers are therefore already demanded. So: a content set enumerates a short list of **characters**, each
declaring which kinds it **supplies** and which it **demands**; a location is authored with one; a motif
slot types against the character *name*, which is what ADR 0006 already wrote and is cheap to validate;
the trade guide publishes the expanded kinds, which is what the player needs in order to know where to
start looking. A free supply/demand pair per location was rejected as both too expressive and likely to
collapse into a handful of patterns anyway — and if the enumeration *is* a handful, nothing is lost,
because it was written down deliberately instead of emerging as an accident of who got authored first. A
location may name extra supplies or demands beyond its character, so ADR 0006 decision 4's untyped
exception stays available per location rather than needing a bespoke character.

The economic grain ADR 0006 wanted — raw out of the spur, finished out of the junction — is now literally
two characters' kind sets disagreeing along a lane, which is also what makes the **outbound fill at an
intermediate stop** constructible rather than lucky (findings §2.1).

**18. The cross-product tool is the loader in a reporting mode.** It owes four jobs: tag-versus-wording
disagreements (findings §2.4), which locations can fill which slots (ADR 0006), which pairings are
overridden (decision 14), and the distribution of decision 5. That is too much to build twice, so it is
not a separate tool: **one content model and one loader, with two verdict modes** — *fail* for a content
mistake, *report for a writer to judge* for everything merely suspicious. ADR 0003 already has content as
data the engine receives and a validator rejecting mistakes at load; this makes the writer's tool the same
code path, which is the only way the report cannot drift from what the engine actually believes. It reads
content and never game state, so it stays outside the rules seam.

## Rejected alternatives

- **A flat vocabulary of undifferentiated tags, with the four classes as writer discipline.** The usual
  and lighter choice, and it makes the chunk's headline number uncomputable: without a declared class the
  engine cannot say which tags are kinds, so *goods per usable kind-tag* — the one lever findings §2.4
  names — cannot be measured, only estimated by hand. Rejected by decision 1.
- **Hierarchical kinds.** Rejected in decision 2, with its costs stated there. Worth recording that it
  remains the obvious fix if flat kinds cannot serve both a vague want's breadth and a location's
  specificity.
- **Disjunction in a want's predicate.** Rejected in decision 6: it lets a writer fake the breadth that
  the kind vocabulary is supposed to be carrying, which hides the very failure decision 5 exists to
  detect.
- **A specific desire expressed as a narrow tag conjunction** rather than a named good. Forces
  near-unique tags into the vocabulary and so corrupts the ratio (decision 6).
- **A free supply/demand tag pair per location**, with no character enumeration. Rejected in decision 17.
- **Worth derived from tags.** Rejected in decision 12: it couples the match vocabulary to the price scale.
- **The oblique-read premium stated in each want's price.** This is findings §2.1's per-want constant,
  rejected there and again in decision 13.
- **A grudging delivery discharging an order at a reduced price**, and **a want surviving the grudging
  sale made against it**. Both rejected in decision 11: the first dissolves the order's dependability,
  the second makes grudging free money.
- **Grudging as an authored override only**, keeping the prototype's three tiers. The played vocabulary
  was three tiers (findings §5.2), so this was the conservative option; it was rejected because
  conjunction makes grudging *derivable* (decision 9), and leaving the Ilse case to hand-authored
  overrides means the commonest content mistake in the galaxy is fixed one pairing at a time.
- **Failing the load on a missing tell word.** Rejected in decision 4: it trains writers to pad prose with
  keywords.
- **Exempting quirk tags from the spread bound.** Rejected in decision 8.

## Consequences

- **The next blocking question is the draw**, and it is handed a constraint: the reserve must satisfy
  every **character** the motifs demand, at the draw size, *with this campaign's hidden locations
  excluded* (decision 17, ADR 0006 decisions 4 and 16). That is ADR 0008's inherited job, in the shape
  ADR 0005 handed route-length to ADR 0006. Overview §6 item 4 is then half done.
- **Kinds being public is a reversible decision, and here is what reversing it costs.** If decision 3
  turns out wrong, the trade guide states a location's character in prose rather than in listable words,
  and a breadth commission names goods rather than kinds. Nothing in the engine changes; two reading
  surfaces and ADR 0004's breadth axis do.
- **The validator gains jobs** (chunk 9), on top of ADR 0006's list: the declared bounds of decision 15;
  usability, and vague wants pointed only at usable kinds (5); a tell declared for every tag and no unused
  tags (4); a named good that exists and is reachable (6); prose on every override (14); every motif slot
  fillable by some character (17).
- **The report gains the cross-product** in the same code path (18), and it must show overridden pairings
  (14) and distributions rather than means (5).
- **The engine's match result grows a field**: the failed term (10). This is the first thing the seam
  carries purely so that prose can be written against it.
- **The four want shapes become mechanical** (13), which makes the one open question carried out of the
  prototype — how plain and vague wants divide the game — a thing the first content set can actually be
  built to answer, by moving the voice premium.
- **Chunk 4 is now settled as structure**, and what is left in it is measurement: the two seeds of
  decision 16, the tier multipliers, the voice premium, the grudging multiplier, the declared bounds, and
  the size of the character enumeration.
- **`GLOSSARY.md` changes rather than only grows.** **bonus tag** and **refusal tag** lose their 2–4 and
  become roles with a reason; **match tier** gains a fourth tier; **good** loses its hard 1–4; **standing
  character** gains **character**; **tag** gains its class.

## Open questions this deliberately leaves

- **A way to ask questions.** Findings §2.4's fix was three-part and only two parts are here: the ratio
  (decisions 2, 5) and the premium (13). The third — that the match should be revealed by something the
  player *does*, not computed on arrival (findings §2.1) — belongs to chunk 6, because the thing the
  player does is call on somebody. It is also where the hard constraint bites: **the notification layer
  must never answer the player's riddle** (findings §4).
- **What a grudging sale does to a quantified want's remainder.** Decision 11 closes the whole want, which
  is the simple rule and the one with no exploit in it, but it may read badly at scale: forty metres of
  cloth wanted, ten sold grudgingly, and the entire need evaporates. The narrow fix if it grates is to
  close only what was filled and shut the remainder to grudging thereafter. This is a thing to notice in
  hand-play rather than decide now, and the play-test write-up should raise it if it bites.
- **Whether kinds should stay public**, per the consequence above.
- **Whether the character enumeration is the right granularity**, which only authoring at scale will say.
  If every location ends up naming extra supplies and demands beyond its character, the enumeration is
  too coarse and the honest answer is more characters rather than a free pair.
- **What a quality tag's two-way ideal costs at scale.** Findings §2.4 wants the best quality tags working
  as a bonus for one buyer and a refusal for another; whether that holds across a vocabulary of this size,
  or decays into tags used in one direction only, is a thing to measure rather than mandate.
