import type { Part, ResolvedCabinetInput } from '../models/types.js';
import { calculateCarcassParts } from './panels.js';
import { calculateDoors } from './doors.js';
import { calculateShelves } from './shelves.js';
import { calculateDrawerFronts } from './drawerFronts.js';

/** Aggregates every panel calculator into the cabinet's full cut list. */
export function calculateCutList(input: ResolvedCabinetInput): Part[] {
  return [
    ...calculateCarcassParts(input),
    ...calculateDoors(input),
    ...calculateShelves(input),
    ...calculateDrawerFronts(input),
  ];
}
