# Parametric Cabinet Engine

Single source of truth for a rectangular cabinet carcass (e.g. a standard
base cabinet): takes parametric dimensions in and produces a millimeter-precise
cut list, hardware BOM, and CNC drilling map — no manual re-entry between
design, costing, and production.

## Usage

```ts
import { buildCabinet } from './engine/index.js';

const cabinet = buildCabinet({
  width: 600,
  height: 720,
  depth: 560,
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

## Folder structure

- `models/` — shared TypeScript types only (`CabinetInput`, `Part`, `HardwareItem`, `CncOperation`, ...). No logic.
- `validators/` — `validateCabinetInput` and `CabinetValidationError`. Read-only checks against `engine/constants.ts` limits.
- `engine/` — calculators (`panels.ts`, `doors.ts`, `shelves.ts`, `drawerFronts.ts`, `hardware.ts`, `cnc.ts`), shared `formulas.ts`, `constants.ts` for defaults, and `cabinetEngine.ts` as the single entry point.

## Construction convention (open-top base cabinet)

- **Sides**: full height, banded on the front (visible) edge only.
- **Top**: two rails (front + back stretchers), not a full panel — leaves
  the top open for a worktop/sink cutout, per the brief's "Top/Bottom rails".
- **Bottom**: one full panel, banded on the front edge.
- **Back**: let into an 8mm groove routed near the rear of the sides,
  rails and bottom; sized to the internal opening plus twice the groove
  depth so it engages the groove on every side.
- **Doors / drawer fronts**: full overlay, banded on all four edges.
- **Drawer boxes**: modeled as a pre-fabricated steel system (e.g. Blum
  TANDEMBOX) — a hardware BOM line, not a cut panel. Only the front is cut
  from board.

## Assumptions / DE VERIFICAT

All manufacturing constants (edge gaps, groove depth, hinge-count
breakpoints, minifix setback, system-32 spacing, standard slide lengths)
live in `engine/constants.ts` as overridable defaults following common
European 32mm-system / Blum practice. They are reasonable engine defaults,
**not** a specific supplier's published spec — verify against the actual
Blum/Häfele catalog before using engine output for production cut lists or
CNC programs.
