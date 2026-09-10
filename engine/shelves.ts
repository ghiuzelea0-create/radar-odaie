/**
 * Adjustable shelves, sized to slide in with a small side clearance and set
 * back from the front (handle/door clearance) and from the back groove.
 * Only the front edge is visible once installed, so only it is banded.
 */
import type { Part, ResolvedCabinetInput } from '../models/types.js';
import { internalWidth } from './formulas.js';

export function calculateShelves(input: ResolvedCabinetInput): Part[] {
  const { depth, shelves, material, config } = input;
  if (shelves <= 0) return [];
  const { boardThickness, shelfSideClearance, shelfFrontSetback, backPanelGrooveDepth, edgeBandingThickness } =
    config;

  const nominalWidth = depth - backPanelGrooveDepth - shelfFrontSetback;

  const shelf: Part = {
    name: 'Poliță',
    length: internalWidth(input.width, config) - shelfSideClearance,
    width: nominalWidth - edgeBandingThickness,
    quantity: shelves,
    material,
    thickness: boardThickness,
    edgeBanding: { top: 0, bottom: 0, left: edgeBandingThickness, right: 0 },
  };

  return [shelf];
}
