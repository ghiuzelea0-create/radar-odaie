import { describe, expect, it } from 'vitest';
import { assembleCabinetRun } from './cabinetRun.js';
import { CabinetValidationError } from '../validators/errors.js';

describe('assembleCabinetRun', () => {
  it('builds every cabinet in order and returns its labeled output', () => {
    const run = assembleCabinetRun([
      { label: 'Corp 1', input: { width: 600, height: 720, depth: 560, doors: 1 } },
      { label: 'Corp 2', input: { width: 800, height: 720, depth: 560, doors: 2 } },
    ]);

    expect(run.cabinets.map((c) => c.label)).toEqual(['Corp 1', 'Corp 2']);
    expect(run.cabinets[0].output.input.width).toBe(600);
    expect(run.cabinets[1].output.input.width).toBe(800);
  });

  it('merges identical parts across cabinets by summing quantity, instead of duplicating entries', () => {
    const run = assembleCabinetRun([
      { label: 'Corp 1', input: { width: 600, height: 720, depth: 560 } },
      { label: 'Corp 2', input: { width: 600, height: 720, depth: 560 } },
    ]);

    // Both cabinets are identical, so every part name should appear once with doubled quantity.
    const sides = run.cutList.filter((p) => p.name === 'Panou lateral');
    expect(sides).toHaveLength(1);
    expect(sides[0].quantity).toBe(4); // 2 sides x 2 cabinets

    const bottoms = run.cutList.filter((p) => p.name === 'Fund');
    expect(bottoms).toHaveLength(1);
    expect(bottoms[0].quantity).toBe(2);
  });

  it('keeps parts with the same name but different cut dimensions as separate cut-list entries', () => {
    const run = assembleCabinetRun([
      { label: 'Corp îngust', input: { width: 400, height: 720, depth: 560 } },
      { label: 'Corp lat', input: { width: 900, height: 720, depth: 560 } },
    ]);

    const bottoms = run.cutList.filter((p) => p.name === 'Fund');
    expect(bottoms).toHaveLength(2);
    expect(bottoms.map((p) => p.length).sort((a, b) => a - b)).toEqual([364, 864]); // 400-36, 900-36
  });

  it('merges the hardware BOM across cabinets by SKU', () => {
    const run = assembleCabinetRun([
      { label: 'Corp 1', input: { width: 600, height: 720, depth: 560, doors: 1 } },
      { label: 'Corp 2', input: { width: 600, height: 720, depth: 560, doors: 1 } },
    ]);

    const hinges = run.hardwareList.filter((i) => i.name.includes('Blum CLIP'));
    expect(hinges).toHaveLength(1);
    expect(hinges[0].quantity).toBe(4); // 2 hinges/door x 1 door x 2 cabinets
  });

  it('throws CabinetValidationError (and consolidates nothing) when any cabinet in the run is invalid', () => {
    expect(() =>
      assembleCabinetRun([
        { label: 'Corp valid', input: { width: 600, height: 720, depth: 560 } },
        { label: 'Corp invalid', input: { width: 600, height: 720, depth: 50 } },
      ]),
    ).toThrow(CabinetValidationError);
  });
});
