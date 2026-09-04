/**
 * Full-overlay doors: their combined width (minus perimeter/inter-door gaps)
 * always matches the cabinet's outer width, and their height spans the full
 * carcass height. All four edges are visible, so all four are banded.
 */
import type { Part, ResolvedCabinetInput } from '../models/types.js';
import { doorHeight, doorWidth } from './formulas.js';

export function calculateDoors(input: ResolvedCabinetInput): Part[] {
  const { doors, material, config } = input;
  if (doors <= 0) return [];
  const { edgeBandingThickness, boardThickness } = config;

  const nominalWidth = doorWidth(input.width, doors, config);
  const nominalHeight = doorHeight(input.height, config);

  const door: Part = {
    name: 'Ușă',
    length: nominalHeight - 2 * edgeBandingThickness,
    width: nominalWidth - 2 * edgeBandingThickness,
    quantity: doors,
    material,
    thickness: boardThickness,
    edgeBanding: {
      top: edgeBandingThickness,
      bottom: edgeBandingThickness,
      left: edgeBandingThickness,
      right: edgeBandingThickness,
    },
  };

  return [door];
}
