/**
 * Pure geometry formulas shared between the validators and the part
 * calculators, so both sides of a constraint (e.g. "door width must fit
 * between 200-600mm") are always computed the exact same way.
 */
import type { CabinetConfig } from '../models/types.js';

/** Clear width between the two side panels. */
export function internalWidth(width: number, config: CabinetConfig): number {
  return width - 2 * config.boardThickness;
}

/** Clear height between the bottom panel and the top rails. */
export function internalHeight(height: number, config: CabinetConfig): number {
  return height - 2 * config.boardThickness;
}

/** Width of a single full-overlay door when `doorsCount` doors share the front. */
export function doorWidth(width: number, doorsCount: number, config: CabinetConfig): number {
  if (doorsCount <= 0) return 0;
  const totalGaps = config.doorGap * (doorsCount + 1);
  return (width - totalGaps) / doorsCount;
}

/** Height of a full-overlay door spanning the whole carcass height. */
export function doorHeight(height: number, config: CabinetConfig): number {
  return height - 2 * config.doorGap;
}

/** Maximum drawer box depth the carcass can physically accept. */
export function maxDrawerBoxDepth(depth: number, config: CabinetConfig): number {
  return depth - config.backPanelGrooveDepth - config.drawerRunnerSetback;
}

/** Even spacing kept between `shelvesCount` shelves distributed in the internal height. */
export function shelfSpacing(height: number, shelvesCount: number, config: CabinetConfig): number {
  if (shelvesCount <= 0) return internalHeight(height, config);
  return internalHeight(height, config) / (shelvesCount + 1);
}
