# Cross-product report: content/walking-skeleton.json

Over the content set as written. Pass `--seed` to report over a drawn galaxy as well.

## Problems

Mistakes. Each fails the load or the draw.

- none

## Reports from the load

Suspicions, for a writer to judge. Never a reason to fail.

- **judge** `calendar` a year is 8 months, 48 weeks, 288 days
- **judge** `goods` goods per kind: 3 goods — cloth, ore, tools

## Motif Slots

How many reserve locations can fill each slot. Having enough matters, not which ones.

### `crossing`

- `east` (processor): 4 locations
- `gate` (market): 4 locations
- `west` (untyped): 12 locations

### `loop`

- `landing` (market): 4 locations
- `pits` (extractor): 4 locations
- `yard` (untyped): 12 locations

### `spur`

- `approach` (processor): 4 locations
- `dead-end` (extractor): 4 locations
- `junction` (market): 4 locations
- `roads` (untyped): 12 locations

### Locations by archetype

- extractor: cinder, hollow, lament, tithe
- market: bellwether, caravel, quay, tallow
- processor: anvil, kestrel, shoals, spindleworks

## Motif layouts

Each motif's worst distortion, worst first, and each lane's drawn length against its distance.

### `spur`: worst distortion 1.07

- `approach` to `junction`: distance 5, drawn 5.16
- `dead-end` to `junction`: distance 16, drawn 17.12
- `junction` to `roads`: distance 3, drawn 3.05

### `crossing`: worst distortion 1.00

- `east` to `gate`: distance 9, drawn 9.01
- `gate` to `west`: distance 4, drawn 4.00

### `loop`: worst distortion 1.00

- `landing` to `pits`: distance 10, drawn 10.00
- `landing` to `yard`: distance 6, drawn 6.00
- `pits` to `yard`: distance 7, drawn 7.00

## As written: goods per kind

- 3 goods: cloth, ore, tools

## As written: goods per role tag

- none

## As written: prose missing the tells of a tag the good holds

- none

## As written: prose carrying the tells of a tag the good does not hold

- none
