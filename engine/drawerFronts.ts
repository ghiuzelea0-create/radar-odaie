/**
 * Drawer front panels. The drawer box itself is a pre-fabricated steel
 * system (see engine/hardware.ts), so only the visible front is a cut part —
 * banded on all four edges, same as a door.
 */
import type { Part, ResolvedCabinetInput } from '../models/types.js';

export function calculateDrawerFronts(input: ResolvedCabinetInput): Part[] {
  const { drawers, material, config } = input;
  if (drawers.length === 0) return [];
  const { doorGap, edgeBandingThickness, boardThickness } = config;

  const nominalWidth = input.width - 2 * doorGap;

  return drawers.map((drawer, index) => ({
    name: `Front sertar #${index + 1}`,
    length: drawer.frontHeight - 2 * edgeBandingThickness,
    width: nominalWidth - 2 * edgeBandingThickness,
    quantity: 1,
    material,
    thickness: boardThickness,
    edgeBanding: {
      top: edgeBandingThickness,
      bottom: edgeBandingThickness,
      left: edgeBandingThickness,
      right: edgeBandingThickness,
    },
  }));
}
