# ADR 0011: The chart's layout

**Status:** accepted, 2026-10-25
**Context:** ADR 0006 (the map), ADR 0008 (the draw), ADR 0003 (the engine seam), ADR 0009 decision 3
(derived order)

## Context

The prototype's travel was a jump to anywhere for one tick, so it never needed a map. ADR 0006 replaced
that with a sparse graph of **lanes** of different **distances**, and the **chart** has so far shown it
as text: a list of lanes, each naming its two ends. Even at the walking skeleton's size, nobody can
picture the map from that list. A place *on the way*, a **chokepoint** and the long way round a **ring**
are the shapes ADR 0006 assembles the map to produce, and the player can use them only if they can see
them.

So the chart draws the map as a graph of nodes and edges. That raises three questions. How faithful
must the drawing be? Who decides where things go? And when is it decided? One fact about the code makes
the answers cheaper than they look: the draw joins each **motif** only to the motif placed before it
(`joinMotifs`), so the motifs form a tree and every **inter-motif lane** is a bridge. Rings only ever
sit inside a motif.

## Decision

**1. The chart draws the map as a graph, and the draw fixes its layout.** Each **location** gets
**layout coordinates**, and together they make the **layout**. The layout is part of the **drawn
galaxy**, so like everything else the draw makes, it is rebuilt from the content set and seed and never
written to a save (ADR 0008 decision 18). It is fixed for the campaign. Nothing during play moves a
location on the chart: a closed lane or a dark location is drawn where it always was.

**2. Every lane is drawn roughly to its distance.** One unit in the layout is one unit of **distance**.
The layout keeps lengths true, and fitting the drawing onto a screen is the page's job.

**3. No two lanes cross, and the map is planar by rule.** This is a rule about the map, not just a goal
for the drawing. Because motifs are joined as a tree, a crossing-free map comes down to every motif's own
lanes being drawable without crossings. That constrains the draw from now on: **a change to how the draw
joins motifs, such as a ring between motifs, must keep the map planar.**

**4. A motif's interior is laid out once, at load, from its authored distances.** It depends on the motif
alone and draws nothing from the rng, so a motif is the same shape in every campaign it is placed in. A
spur looks like a spur and a ring like a ring each time, which keeps the map's grammar learnable across
campaigns while its facts are redrawn (ADR 0006 decision 3). The load-time pass refuses a motif whose
layout has two lanes crossing, or puts a location within the **minimum gap** of a lane that doesn't
touch it. The refusal names the motif. The minimum gap is a fraction of the motif's shortest lane,
declared by the content set (ADR 0007 decision 15).

**5. Lengths are best effort, and distortion is reported, never refused.** Some sets of distances cannot
be drawn exactly, for example a triangle of 1, 1 and 5. The layout comes as close as it can. The
**cross-product report** gives each motif's worst distortion (the largest ratio between a lane's drawn
length and its distance, either way round) and the stretch of each inter-motif lane in the drawn
galaxy. There is no limit on distortion until play shows one is needed. A writer whose motif draws badly
reads it in the report.

**6. The draw arranges the motifs as its last stage.** Each motif after the first is placed at the far
end of the inter-motif lane joining it to the layout so far, turned and flipped. The draw tries
orientations in an order it draws from the rng. If none fits without a crossing or a breach of the
minimum gap, it draws the lane longer, step by step, until one fits. Placing each motif outward along a
tree always fits eventually, so this stage never fails and never re-rolls. **Motifs are never shrunk or
bent to fit**: only inter-motif lanes stretch, so decision 4's fixed shapes hold. The stage runs last,
after people, even though it reads only the map. The rng is threaded straight through the cascade, so a
stage after the map would shift every later draw. Running last leaves every galaxy the draw already
makes exactly as it is.

**7. Layout coordinates carry no rules, and are computed reproducibly.** Nothing reads them but the
chart. No "nearby" is worked out from them and no distance is taken from them; travel is the lane's
distance and nothing else. Because the layout is still part of a deterministic draw (ADR 0003), it uses
only `+ − × ÷`, `Math.sqrt` and the seeded rng, all of which give the same result in every JavaScript
engine. No `Math.sin`, `Math.cos`, `Math.atan2` or `Math.random`. The same seed draws the same chart in
every browser.

## Rejected alternatives

- **Authored coordinates on each motif.** That would give each lane a second number next to its
  distance, which ADR 0006 decision 8 rules out: one number per lane, in the content and on the chart.
  The two would disagree, and nobody would notice by reading.
- **One force-directed layout of the whole galaxy, fresh each campaign.** It guarantees nothing about
  crossings, so it would need a check afterwards and a retry when it failed. It would also draw the same
  motif a different shape every campaign, which throws away decision 4's learnable shapes.
- **Laying the map out in the page.** The page would recompute the layout on every render or keep it
  somewhere of its own. It couldn't be checked at load or appear in the report, and it would put a fact
  about the drawn galaxy outside the engine.
- **A layout stage straight after the map.** It is the natural place, but it would change every galaxy
  every existing seed draws, and every pinned test with them.
- **Refusing distortion above a limit.** The limit would be a number nobody has measured. The report
  makes distortion visible, which is enough until play says otherwise.
- **Shrinking placed motifs to make room.** It would break decision 4. Stretching the inter-motif lane
  costs proportion only on the lanes that are already the long hauls.

## Consequences

- **A motif can now fail to load for how it draws.** A planar motif whose computed layout still crosses
  is refused, so the layout algorithm's limits become a content constraint. The writer's fix is to
  adjust distances or slots. If this comes up often, the algorithm is what improves.
- **The draw can no longer join motifs freely.** Decision 3 holds the draw to a planar map. Today's
  chain satisfies it trivially.
- **The report gains two distributions**: motif distortion and inter-motif stretch.
- **The chart becomes a picture first.** The list of departures stays below the graph for now.

## Open questions this deliberately leaves

- **Interacting with the chart**, such as clicking a location to depart or planning a **route** on it.
  It is expected to be wanted soon, and it waits for play to say what shape it takes.
- **Systems.** The glossary says a **system**'s locations are drawn together on the chart. Nothing
  draws systems yet. When something does, the natural home is inside a motif, where decision 4 already
  fixes the shape.
- **Scale.** Inter-motif lanes are where the long hauls live, so drawing to proportion may make motifs
  small beside them. Whether that reads badly is for hand-play to judge, not for argument.
