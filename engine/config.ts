import type { CabinetInput, ResolvedCabinetInput } from '../models/types.js';
import { DEFAULT_CONFIG } from './constants.js';

/** Merges user-supplied input with default config/quantities into a fully-resolved shape. */
export function resolveCabinetInput(input: CabinetInput): ResolvedCabinetInput {
  return {
    width: input.width,
    height: input.height,
    depth: input.depth,
    cabinetType: input.cabinetType ?? 'base',
    doors: input.doors ?? 0,
    shelves: input.shelves ?? 0,
    drawers: input.drawers ?? [],
    material: input.material ?? 'PAL',
    config: { ...DEFAULT_CONFIG, ...input.config },
  };
}
