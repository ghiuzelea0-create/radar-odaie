import { describe, expect, it } from 'vitest';
import { resolveCabinetInput } from './config.js';
import { calculateCncOperations } from './cnc.js';
import { HINGE, MINIFIX } from './constants.js';

function opsFor(overrides: Parameters<typeof resolveCabinetInput>[0]) {
  return calculateCncOperations(resolveCabinetInput(overrides));
}

describe('calculateCncOperations', () => {
  it('places 2 hinge cups for a single low door, symmetric edge setback', () => {
    const ops = opsFor({ width: 600, height: 720, depth: 560, doors: 1 });
    const hinges = ops.filter((op) => op.type === 'hinge-cup');
    expect(hinges).toHaveLength(2);
    expect(hinges.every((op) => op.x === HINGE.CUP_EDGE_INSET)).toBe(true);
    // doorHeight = 714mm; positions at edgeSetback (100) and doorHeight - edgeSetback (614)
    expect(hinges.map((op) => op.y).sort((a, b) => a - b)).toEqual([100, 614]);
  });

  it('places minifix/dowel holes matching the joint plan: 3 on the bottom (deep cabinet) + 1 per rail', () => {
    const ops = opsFor({ width: 600, height: 720, depth: 560 });
    const minifix = ops.filter((op) => op.type === 'minifix-dowel');
    // depth 560 > 500 -> 3 connectors on the bottom joint; 1 each on the front/back rail joints
    expect(minifix).toHaveLength(5);
    for (const op of minifix) {
      expect(op.diameter).toBe(MINIFIX.DIAMETER);
    }
    const xs = minifix.map((op) => op.x).sort((a, b) => a - b);
    expect(xs).toEqual([8, 8, 280, 552, 552]); // bottom joint evenly spaced [8,280,552]; rails at [8] and [552]
  });

  it('places 2 wall-cabinet joint holes (top + bottom, both full panels) evenly spaced across depth', () => {
    const ops = opsFor({ width: 600, height: 720, depth: 400, cabinetType: 'wall' });
    const minifix = ops.filter((op) => op.type === 'minifix-dowel');
    // depth 400 <= 500 -> 2 connectors per joint; 2 joints (top + bottom) -> 4 total
    expect(minifix).toHaveLength(4);
    const ys = [...new Set(minifix.map((op) => op.y))].sort((a, b) => a - b);
    expect(ys).toEqual([34, 686]); // bottomY=34, topY=720-34
  });

  it('places 2 shelf-pin holes per shelf (front + back), evenly spaced up the height', () => {
    const ops = opsFor({ width: 600, height: 720, depth: 560, shelves: 2 });
    const pins = ops.filter((op) => op.type === 'shelf-pin');
    expect(pins).toHaveLength(4);
    // internalHeight = 684mm, spacing = 684/3 = 228; y = 18+228=246, 18+456=474
    const ys = [...new Set(pins.map((op) => op.y))].sort((a, b) => a - b);
    expect(ys).toEqual([246, 474]);
  });

  it('emits no hinge or shelf-pin operations when there are no doors/shelves', () => {
    const ops = opsFor({ width: 600, height: 720, depth: 560 });
    expect(ops.some((op) => op.type === 'hinge-cup')).toBe(false);
    expect(ops.some((op) => op.type === 'shelf-pin')).toBe(false);
  });

  it('every operation references a part name present in the cut list', () => {
    const ops = opsFor({ width: 600, height: 720, depth: 560, doors: 1, shelves: 1 });
    const validParts = new Set(['Ușă', 'Panou lateral']);
    expect(ops.every((op) => validParts.has(op.part))).toBe(true);
  });
});
