# ADR 0003: One seam — a pure rules engine the content is handed to

**Status:** accepted, 2026-10-22
**Context:** `docs/prototype-findings.md` §5.3 (the five choices this decision re-makes), ADR 0001, ADR 0002

## Context

The `schlepper` prototype is discarded and none of its code comes across. Five of its architectural
choices, though, were **never the source of a problem in any sitting** across two weeks of building and
eight hand-played runs, and two of them were load-bearing in fixing the problems that did occur: the
notification rebuild was only measurable because the engine was deterministic and driveable headlessly,
and the one time a game rule was computed in the page it sat outside the test suite until it was moved
in (findings §5.3, §5.4).

They are written down here rather than left in the findings because they are the only decisions in that
document that constrain **code** rather than design, and because they have to hold before the first
milestone is built rather than be recovered afterwards.

This ADR is deliberately stack-neutral. No language, runtime or presentation technology is chosen yet;
every statement below should survive that choice.

## Decision

**1. One seam: a pure rules engine with no UI.** The engine is driven by start-a-run, act, and read-only
queries, and nothing else. It is **deterministic** for a given content set, seed and action sequence, and
it **never reads the clock**. Determinism is not a nicety: the measurement process this project depends on
(findings §5.4) requires the same seed played twice at two settings to differ only in the setting.

**2. Content is data the engine receives, and never imports.** Hand-written, with clear fields, held
separately from the rules, so content can be revised without touching code and so the engine can be driven
with purpose-built content in tests.

**3. A content validator rejects mistakes at load.** An unknown tag, a good with no origin, a want nothing
in the galaxy can satisfy, a vague want carrying a plain form (ADR 0002). Content errors surface at load,
not mid-play, and a test loads the **real** content through the validator.

**4. Rules belong in the engine, not the view.** If the player can observe it and it follows from the
rules, the engine decides it. The view words what the engine returns.

**5. Test through the public seam only.** Assertions are about what a player could observe, using small
purpose-built content sets and fixed seeds rather than the real content — and the defaults for a new field
live in **one** place, so adding a field doesn't mean editing fourteen fixtures.

## Why these and not a fuller architecture

Everything else is downstream of design decisions that aren't made yet — the campaign (overview §3), the
time model, the topology. These five are not: they hold whatever the campaign turns out to be, and each
one would be expensive to retrofit. The rule for anything beyond them is the project's working method
(overview §2): build the thing that answers a named question, and let the structure follow.

## Consequences

- The measurement harness of findings §5.4 is buildable from day one, as a throw-away with its own config
  so the normal test run never picks it up. The engine's public seam is the harness's only interface.
- The content pipeline (overview §4, chunk 9) is a first-class part of the build rather than a late
  addition: the validator is implied by this ADR, and the cross-product tool that findings §2.4 asks for
  reads the same content data.
- A content field added for one want shape costs one defaults site, not fourteen fixtures — which matters
  because the first content set exists to answer an open question and will be revised while it does.
- The deterministic rule forbids the engine reaching for the clock for anything, including shuffling.
  Seeds come in through start-a-run.
