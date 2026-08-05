/**
 * CNC coordinate mapping. Positions are given relative to each part's
 * zero-point (bottom-left corner in face view) on its *finished* (nominal,
 * post edge-banding) size, since banding is applied before drilling.
 */
import type { CncOperation, ResolvedCabinetInput } from '../models/types.js';
import { HINGE, MINIFIX, SHELF_PIN, SYSTEM32 } from './constants.js';
import { hingeCountForDoorHeight } from './hardware.js';
import { doorHeight, internalHeight } from './formulas.js';
import { calculateSideJoints } from './joints.js';

function hingePositions(doorHeightMm: number, count: number): number[] {
  if (count === 1) return [doorHeightMm / 2];
  const span = doorHeightMm - 2 * HINGE.EDGE_SETBACK;
  const step = span / (count - 1);
  return Array.from({ length: count }, (_, i) => HINGE.EDGE_SETBACK + i * step);
}

export function calculateCncOperations(input: ResolvedCabinetInput): CncOperation[] {
  const { height, depth, doors, shelves, config } = input;
  const ops: CncOperation[] = [];

  if (doors > 0) {
    const dHeight = doorHeight(height, config);
    const count = hingeCountForDoorHeight(dHeight);
    for (const y of hingePositions(dHeight, count)) {
      ops.push({
        part: 'Ușă',
        operation: 'drilling',
        type: 'hinge-cup',
        x: HINGE.CUP_EDGE_INSET,
        y,
        diameter: HINGE.CUP_DIAMETER,
        depth: HINGE.CUP_DEPTH,
        note: 'Cupă balama, măsurat de la marginea cu balamale (x=0)',
      });
    }
  }

  for (const joint of calculateSideJoints(input)) {
    for (const x of joint.x) {
      ops.push({
        part: 'Panou lateral',
        operation: 'drilling',
        type: 'minifix-dowel',
        x,
        y: joint.y,
        diameter: MINIFIX.DIAMETER,
        note: `Îmbinare cu ${joint.label}`,
      });
    }
  }

  if (shelves > 0) {
    const spacing = internalHeight(height, config) / (shelves + 1);
    for (let shelfIndex = 1; shelfIndex <= shelves; shelfIndex += 1) {
      const y = config.boardThickness + spacing * shelfIndex;
      for (const [faceLabel, x] of [
        ['față', SYSTEM32.FIRST_HOLE_FROM_FRONT],
        ['spate', depth - SYSTEM32.FIRST_HOLE_FROM_FRONT],
      ] as const) {
        ops.push({
          part: 'Panou lateral',
          operation: 'drilling',
          type: 'shelf-pin',
          x,
          y,
          diameter: SHELF_PIN.DIAMETER,
          depth: SHELF_PIN.DEPTH,
          note: `Suport poliță #${shelfIndex}, ${faceLabel}`,
        });
      }
    }
  }

  return ops;
}
