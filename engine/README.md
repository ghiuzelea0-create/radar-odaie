# Parametric Cabinet Engine

Single source of truth for a rectangular cabinet carcass (e.g. a standard
base or wall cabinet): takes parametric dimensions in and produces a
millimeter-precise cut list, hardware BOM, and CNC drilling map — no manual
re-entry between design, costing, and production. Multiple cabinets can be
assembled into one consolidated shop order.

## Usage

```ts
import { buildCabinet, assembleCabinetRun } from './engine/index.js';

const cabinet = buildCabinet({
  width: 600,
  height: 720,
  depth: 560,
  cabinetType: 'base', // or 'wall'
  doors: 1,
  shelves: 1,
  material: 'PAL Egger U702 ST9',
});

cabinet.cutList;        // Part[]
cabinet.hardwareList;   // HardwareItem[]
cabinet.cncOperations;  // CncOperation[]
```

`buildCabinet` throws `CabinetValidationError` (see `validators/errors.ts`)
when the input violates a physical/structural constraint — e.g. a door too
wide to be stable, a drawer deeper than the cabinet, or too many shelves for
the available height.

### A whole project at once

```ts
const kitchen = assembleCabinetRun([
  { label: 'Corp chiuvetă', input: { width: 900, height: 720, depth: 560, doors: 2 } },
  { label: 'Corp sertare', input: { width: 600, height: 720, depth: 560, drawers: [{ frontHeight: 200 }, { frontHeight: 300 }] } },
  { label: 'Corp suspendat', input: { width: 600, height: 350, depth: 320, cabinetType: 'wall', doors: 1 } },
]);

kitchen.cabinets;      // per-cabinet { label, output } in input order
kitchen.cutList;       // merged across the run — identical parts summed, not duplicated
kitchen.hardwareList;  // merged across the run, by SKU
```

`assembleCabinetRun` validates every cabinet before merging anything; the
first invalid cabinet throws `CabinetValidationError`, same as `buildCabinet`.

## Folder structure

- `models/` — shared TypeScript types only (`CabinetInput`, `Part`, `HardwareItem`, `CncOperation`, ...). No logic.
- `validators/` — `validateCabinetInput` and `CabinetValidationError`. Read-only checks against `engine/constants.ts` limits.
- `engine/` — calculators (`panels.ts`, `doors.ts`, `shelves.ts`, `drawerFronts.ts`, `hardware.ts`, `cnc.ts`), the shared `joints.ts` (minifix joint plan used by *both* the hardware BOM and the CNC map, so they can't drift apart), shared `formulas.ts`, `constants.ts` for defaults, `cabinetEngine.ts` as the single-cabinet entry point, and `cabinetRun.ts` for multi-cabinet consolidation.

## Cabinet types

- **`base`** (default) — open-top construction: front/back top rails, no
  full top panel, leaving room for a worktop or sink cutout.
- **`wall`** — closed box: a full top panel (mirroring the bottom), plus a
  wall-mounting bracket set added to the hardware BOM.

## Construction convention

- **Sides**: full height, banded on the front (visible) edge only.
- **Top**: two rails for `base` cabinets; one full panel for `wall`
  cabinets. Either way, banded the same as the bottom when it's a full panel.
- **Bottom**: one full panel, banded on the front edge.
- **Back**: let into an 8mm groove routed near the rear of the sides, top
  and bottom; sized to the internal opening plus twice the groove depth so
  it engages the groove on every side.
- **Doors / drawer fronts**: full overlay, banded on all four edges.
- **Drawer boxes**: modeled as a pre-fabricated steel system (e.g. Blum
  TANDEMBOX) — a hardware BOM line, not a cut panel. Only the front is cut
  from board.
- **Minifix joints** (`engine/joints.ts`): a `base` cabinet has 3 named
  joints per side (bottom, front rail, back rail) — the bottom spans the
  full depth so its connector count scales with `connectorsPerJoint(depth)`,
  while each rail (narrow) gets a single connector. A `wall` cabinet has 2
  joints per side (bottom, top), both full panels, both scaling with
  `connectorsPerJoint(depth)`.

## Assumptions / DE VERIFICAT

All manufacturing constants (edge gaps, groove depth, hinge-count
breakpoints, minifix setback, system-32 spacing, standard slide lengths)
live in `engine/constants.ts` as overridable defaults following common
European 32mm-system / Blum practice. They are reasonable engine defaults,
**not** a specific supplier's published spec — verify against the actual
Blum/Häfele catalog before using engine output for production cut lists or
CNC programs.
