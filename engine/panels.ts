/**
 * Carcass parts: the two side panels, the bottom, the front/back top rails
 * (open-top base-cabinet construction — no full top panel, to leave room
 * for a worktop or sink cutout), and the back panel.
 *
 * The back panel is let into an 8mm-deep groove routed near the rear edge
 * of the sides, rails and bottom, so it is sized to the internal opening
 * plus twice the groove depth (it engages the groove on every side).
 */
import type { Part, ResolvedCabinetInput } from '../models/types.js';
import { internalHeight, internalWidth } from './formulas.js';

export function calculateCarcassParts(input: ResolvedCabinetInput): Part[] {
  const { height, depth, material, config } = input;
  const { boardThickness, backPanelThickness, backPanelGrooveDepth, railWidth, edgeBandingThickness } = config;

  const spanWidth = internalWidth(input.width, config);
  const depthCut = depth - edgeBandingThickness; // front (visible) edge banded

  const sides: Part = {
    name: 'Panou lateral',
    length: height,
    width: depthCut,
    quantity: 2,
    material,
    thickness: boardThickness,
    edgeBanding: { top: 0, bottom: 0, left: edgeBandingThickness, right: 0 },
  };

  const bottom: Part = {
    name: 'Fund',
    length: spanWidth,
    width: depthCut,
    quantity: 1,
    material,
    thickness: boardThickness,
    edgeBanding: { top: 0, bottom: 0, left: edgeBandingThickness, right: 0 },
  };

  const rails: Part = {
    name: 'Traversă sus (față/spate)',
    length: spanWidth,
    width: railWidth,
    quantity: 2,
    material,
    thickness: boardThickness,
    edgeBanding: { top: 0, bottom: 0, left: 0, right: 0 },
  };

  const back: Part = {
    name: 'Spate',
    length: internalHeight(height, config) + 2 * backPanelGrooveDepth,
    width: spanWidth + 2 * backPanelGrooveDepth,
    quantity: 1,
    material,
    thickness: backPanelThickness,
    edgeBanding: { top: 0, bottom: 0, left: 0, right: 0 },
  };

  return [sides, bottom, rails, back];
}
