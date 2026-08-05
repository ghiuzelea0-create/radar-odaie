/**
 * Default manufacturing constants for the parametric cabinet engine.
 *
 * Figures follow common European 32mm-system / Blum frameless-cabinet
 * practice and are meant as reasonable, overridable defaults for a
 * general-purpose engine — DE VERIFICAT against the actual hardware
 * catalog (Blum/Häfele/Egger) before using them for production cut
 * lists or CNC programs.
 */
import type { CabinetConfig } from '../models/types.js';

export const DEFAULT_CONFIG: CabinetConfig = {
  boardThickness: 18,
  backPanelThickness: 8,
  edgeBandingThickness: 1,
  railWidth: 100,
  backPanelGrooveDepth: 8,
  doorGap: 3,
  shelfSideClearance: 2,
  shelfFrontSetback: 20,
  drawerRunnerSetback: 15,
  includeHandles: true,
};

/** Physical/structural bounds used by the validator. */
export const LIMITS = {
  MIN_WIDTH: 150,
  MAX_WIDTH: 1500,
  MIN_HEIGHT: 200,
  MAX_HEIGHT: 2400,
  MIN_DEPTH: 150,
  MAX_DEPTH: 800,
  MIN_DOOR_WIDTH: 200,
  MAX_DOOR_WIDTH: 600,
  MAX_DOOR_HEIGHT: 2400,
  MIN_SHELF_CLEAR_SPAN: 150,
};

/** System 32 shelf-pin / adjustable-hole grid. */
export const SYSTEM32 = {
  HOLE_SPACING: 32,
  FIRST_HOLE_FROM_FRONT: 37,
  FIRST_HOLE_FROM_BOTTOM: 100,
};

export const HINGE = {
  CUP_DIAMETER: 35,
  CUP_DEPTH: 12,
  /** Distance from the door's hinge-side edge to the cup hole center. */
  CUP_EDGE_INSET: 22.5,
  /** Distance kept between the top/bottom door edge and the nearest hinge center. */
  EDGE_SETBACK: 100,
  SKU: 'BLUM-71B3550',
  NAME: 'Balama Blum CLIP top BLUMOTION 110°, cupă 35mm',
};

/** Door-height breakpoints (mm, inclusive upper bound) mapped to hinge count. Blum-style rule of thumb. */
export const HINGE_COUNT_BREAKPOINTS: Array<{ maxHeight: number; count: number }> = [
  { maxHeight: 900, count: 2 },
  { maxHeight: 1600, count: 3 },
  { maxHeight: 2000, count: 4 },
  { maxHeight: 2400, count: 5 },
];

export const MINIFIX = {
  DIAMETER: 15,
  /** Distance from the panel's top/bottom edge to the minifix hole center. */
  EDGE_SETBACK: 34,
  /** Distance from the panel's front/back face edge to the minifix hole center. */
  FACE_SETBACK: 8,
  SKU: 'HAFELE-MINIFIX-15',
  NAME: 'Minifix 15, set complet (corp + excentric)',
  DOWEL_SKU: 'DOWEL-8X30',
  DOWEL_NAME: 'Diblu lemn 8x30mm',
};

/** Minifix connectors used per corner joint; more are used on deeper panels. */
export function connectorsPerJoint(depth: number): number {
  return depth > 500 ? 3 : 2;
}

export const SHELF_PIN = {
  DIAMETER: 5,
  DEPTH: 10,
  SKU: 'SHELF-PIN-5MM',
  NAME: 'Suport polița metalic, cap 5mm',
};

/** Standard nominal drawer-slide lengths available from stock (mm). */
export const STANDARD_SLIDE_LENGTHS = [270, 300, 350, 400, 450, 500, 550, 600];

export const HANDLE = {
  SKU: 'HANDLE-STD-128',
  NAME: 'Mâner standard, interax 128mm',
};
