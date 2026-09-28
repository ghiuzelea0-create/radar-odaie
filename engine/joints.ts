/**
 * Minifix corner joints between each side panel and the rest of the
 * carcass. This is the single source of truth for both the hardware BOM
 * (connector counts) and the CNC drilling map (connector positions) — so
 * the two can never drift apart.
 */
import type { ResolvedCabinetInput } from '../models/types.js';
import { MINIFIX, connectorsPerJoint } from './constants.js';
import { evenlySpaced } from './formulas.js';

export interface SideJoint {
  /** Joint label, e.g. "fund", "traversă față", "panou sus". */
  label: string;
  /** Vertical distance from the side panel's bottom edge (mm). */
  y: number;
  /** Horizontal connector positions, from the side panel's front edge (mm) — one per minifix. */
  x: number[];
}

/**
 * Joints for a `base` cabinet: the bottom panel spans the full depth (its
 * connectors scale with `connectorsPerJoint`, front-to-back), while each
 * rail is narrow enough to need only a single connector.
 */
function baseJoints(depth: number, topY: number, bottomY: number, frontX: number, backX: number): SideJoint[] {
  return [
    { label: 'fund', y: bottomY, x: evenlySpaced(frontX, backX, connectorsPerJoint(depth)) },
    { label: 'traversă față', y: topY, x: [frontX] },
    { label: 'traversă spate', y: topY, x: [backX] },
  ];
}

/** Joints for a `wall` cabinet: both the top and bottom are full panels spanning the full depth. */
function wallJoints(depth: number, topY: number, bottomY: number, frontX: number, backX: number): SideJoint[] {
  const positions = evenlySpaced(frontX, backX, connectorsPerJoint(depth));
  return [
    { label: 'fund', y: bottomY, x: positions },
    { label: 'panou sus', y: topY, x: positions },
  ];
}

export function calculateSideJoints(input: ResolvedCabinetInput): SideJoint[] {
  const { height, depth, cabinetType } = input;
  const frontX = MINIFIX.FACE_SETBACK;
  const backX = depth - MINIFIX.FACE_SETBACK;
  const topY = height - MINIFIX.EDGE_SETBACK;
  const bottomY = MINIFIX.EDGE_SETBACK;

  return cabinetType === 'wall'
    ? wallJoints(depth, topY, bottomY, frontX, backX)
    : baseJoints(depth, topY, bottomY, frontX, backX);
}

/** Total minifix connectors across both side panels. */
export function totalConnectorCount(joints: SideJoint[]): number {
  const perSide = joints.reduce((sum, joint) => sum + joint.x.length, 0);
  return perSide * 2; // two side panels
}
