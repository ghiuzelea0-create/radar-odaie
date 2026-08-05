import { describe, expect, it } from 'vitest';
import { buildCabinet } from './cabinetEngine.js';
import { CabinetValidationError } from '../validators/errors.js';

describe('buildCabinet — integration', () => {
  it('assembles cutList, hardwareList and cncOperations for a valid cabinet', () => {
    const output = buildCabinet({
      width: 600,
      height: 720,
      depth: 560,
      doors: 1,
      shelves: 1,
      material: 'PAL Egger U702 ST9',
    });

    expect(output.cutList.length).toBeGreaterThan(0);
    expect(output.hardwareList.length).toBeGreaterThan(0);
    expect(output.cncOperations.length).toBeGreaterThan(0);

    // Total physical pieces: 2 sides + 1 bottom + 2 rails + 1 back + 1 door + 1 shelf.
    const totalPieces = output.cutList.reduce((sum, part) => sum + part.quantity, 0);
    expect(totalPieces).toBe(8);

    expect(output.input.width).toBe(600);
    expect(output.input.material).toBe('PAL Egger U702 ST9');
  });

  it('propagates the same cut-list math as calling the calculators directly', () => {
    const output = buildCabinet({ width: 900, height: 900, depth: 600, doors: 2, drawers: [{ frontHeight: 160 }] });
    const door = output.cutList.find((p) => p.name === 'Ușă')!;
    expect(door.quantity).toBe(2);
    const front = output.cutList.find((p) => p.name === 'Front sertar #1')!;
    expect(front.length).toBe(158); // 160 - 2*1mm banding
  });

  it('throws CabinetValidationError for a structurally invalid cabinet, before computing any output', () => {
    expect(() => buildCabinet({ width: 600, height: 720, depth: 50 })).toThrow(CabinetValidationError);
  });

  it('respects config overrides end-to-end (custom board thickness reflected in cut list and hardware)', () => {
    const output = buildCabinet({
      width: 600,
      height: 720,
      depth: 400,
      doors: 1,
      config: { boardThickness: 16 },
    });
    const side = output.cutList.find((p) => p.name === 'Panou lateral')!;
    expect(side.thickness).toBe(16);
    const minifix = output.hardwareList.find((i) => i.sku === 'HAFELE-MINIFIX-15');
    expect(minifix?.quantity).toBe(12); // depth 400 <= 500 -> 2 per joint * 6 joints
  });
});
