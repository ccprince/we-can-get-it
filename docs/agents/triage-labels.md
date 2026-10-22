# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

## The rest of the tracker's labels

Three further families, all of them project-specific. Apply them alongside a triage role, not
instead of one.

**`area:*` — the nine chunks of `docs/design-overview.md` §4.** Every issue belongs to one:
`area:campaign`, `area:time`, `area:map`, `area:goods`, `area:demand`, `area:people`, `area:change`,
`area:knowledge`, `area:content`. The chunks are ordered roughly by dependency; campaign and time are
upstream of everything.

**Working method**, from `docs/design-overview.md` §2 and `docs/prototype-findings.md` §5.4:

| Label | Meaning |
| --- | --- |
| `settle-by-playing` | Answerable only by playing. Do not reason it out; a written answer is fiction. |
| `settle-before-building` | Reversing it later is a rewrite, so it is settled first. |
| `milestone` | A playable thing built to answer one named question. |
| `number` | A value to be found by measurement, never by argument. |

**`wayfinder:*`** — `wayfinder:map` for the map issue, and `wayfinder:research` / `wayfinder:prototype`
/ `wayfinder:grilling` / `wayfinder:task` for its child tickets. See `issue-tracker.md`.
