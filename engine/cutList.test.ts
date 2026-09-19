import { describe, expect, it } from 'vitest';
import { resolveCabinetInput } from './config.js';
import { calculateCutList } from './cutList.js';

/**
 * Reference cabinet: 600 x 720 x 560mm base cabinet, 1 door, 1 shelf,
 * default config (boardThickness=18, edgeBandingThickness=1, ...).
 * Expected numbers below are hand-derived from the documented formulas.
 */
function referenceInput() {
  return resolveCabinetInput({ width: 600, height: 720, depth: 560, doors: 1, shelves: 1 });
}

describe('calculateCutList — reference base cabinet (600x720x560, 1 door, 1 shelf)', () => {
  const parts = calculateCutList(referenceInput());

  it('produces exactly one entry per distinct part type', () => {
    expect(parts.map((p) => p.name)).toEqual([
      'Panou lateral',
      'Fund',
      'Traversă sus (față/spate)',
      'Spate',
      'Ușă',
      'Poliță',
    ]);
  });

  it('sizes the side panels: full height, depth minus front edge banding', () => {
    const side = parts.find((p) => p.name === 'Panou lateral')!;
    expect(side).toMatchObject({
      length: 720,
      width: 559, // 560 - 1mm banding
      quantity: 2,
      thickness: 18,
      edgeBanding: { top: 0, bottom: 0, left: 1, right: 0 },
    });
  });

  it('sizes the bottom panel: span between sides, depth minus front banding', () => {
    const bottom = parts.find((p) => p.name === 'Fund')!;
    expect(bottom).toMatchObject({
      length: 564, // 600 - 2*18
      width: 559,
      quantity: 1,
    });
  });

  it('sizes the top rails: span between sides, fixed rail width, unbanded', () => {
    const rails = parts.find((p) => p.name === 'Traversă sus (față/spate)')!;
    expect(rails).toMatchObject({
      length: 564,
      width: 100,
      quantity: 2,
      edgeBanding: { top: 0, bottom: 0, left: 0, right: 0 },
    });
  });

  it('sizes the back panel to the internal opening plus groove engagement on all sides', () => {
    const back = parts.find((p) => p.name === 'Spate')!;
    expect(back).toMatchObject({
      length: 700, // (720 - 2*18) + 2*8
      width: 580, // (600 - 2*18) + 2*8
      quantity: 1,
      thickness: 8,
    });
  });

  it('sizes the single door: full width/height minus perimeter gaps and banding on all edges', () => {
    const door = parts.find((p) => p.name === 'Ușă')!;
    expect(door).toMatchObject({
      length: 712, // (720 - 2*3) - 2*1
      width: 592, // (600 - 2*3) - 2*1
      quantity: 1,
      edgeBanding: { top: 1, bottom: 1, left: 1, right: 1 },
    });
  });

  it('sizes the shelf: side clearance applied to length, front setback + banding applied to width', () => {
    const shelf = parts.find((p) => p.name === 'Poliță')!;
    expect(shelf).toMatchObject({
      length: 562, // (600 - 2*18) - 2mm clearance
      width: 531, // (560 - 8 - 20) - 1mm banding
      quantity: 1,
      edgeBanding: { top: 0, bottom: 0, left: 1, right: 0 },
    });
  });
});

describe('calculateCutList — wall cabinet (full top panel, no rails)', () => {
  it('replaces the two rails with a single full top panel matching the bottom panel', () => {
    const input = resolveCabinetInput({ width: 600, height: 720, depth: 560, cabinetType: 'wall' });
    const parts = calculateCutList(input);
    expect(parts.map((p) => p.name)).toEqual(['Panou lateral', 'Fund', 'Panou sus', 'Spate']);

    const top = parts.find((p) => p.name === 'Panou sus')!;
    const bottom = parts.find((p) => p.name === 'Fund')!;
    expect(top).toMatchObject({ length: bottom.length, width: bottom.width, quantity: 1 });
    expect(top.edgeBanding).toEqual(bottom.edgeBanding);
  });
});

describe('calculateCutList — dimension sensitivity', () => {
  it('omits doors/shelves parts entirely when counts are zero', () => {
    const input = resolveCabinetInput({ width: 600, height: 720, depth: 560 });
    const parts = calculateCutList(input);
    expect(parts.map((p) => p.name)).toEqual(['Panou lateral', 'Fund', 'Traversă sus (față/spate)', 'Spate']);
  });

  it('scales all width-dependent parts when width changes, height/depth held constant', () => {
    const input = resolveCabinetInput({ width: 900, height: 720, depth: 560 });
    const parts = calculateCutList(input);
    const bottom = parts.find((p) => p.name === 'Fund')!;
    expect(bottom.length).toBe(864); // 900 - 2*18
    const side = parts.find((p) => p.name === 'Panou lateral')!;
    expect(side.length).toBe(720); // unaffected by width
  });

  it('reduces cut size by exactly the edge banding thickness, per banded edge', () => {
    const thin = resolveCabinetInput({
      width: 600,
      height: 720,
      depth: 560,
      config: { edgeBandingThickness: 0.4 },
    });
    const thick = resolveCabinetInput({
      width: 600,
      height: 720,
      depth: 560,
      config: { edgeBandingThickness: 2 },
    });
    const sideThin = calculateCutList(thin).find((p) => p.name === 'Panou lateral')!;
    const sideThick = calculateCutList(thick).find((p) => p.name === 'Panou lateral')!;
    expect(sideThin.width).toBeCloseTo(559.6, 5); // 560 - 0.4
    expect(sideThick.width).toBe(558); // 560 - 2
  });

  it('reflects a custom board thickness in every carcass part', () => {
    const input = resolveCabinetInput({
      width: 600,
      height: 720,
      depth: 560,
      config: { boardThickness: 22 },
    });
    const parts = calculateCutList(input);
    const bottom = parts.find((p) => p.name === 'Fund')!;
    expect(bottom.length).toBe(556); // 600 - 2*22
    expect(bottom.thickness).toBe(22);
  });

  it('sizes a two-door front so combined width still matches the cabinet width minus gaps', () => {
    const input = resolveCabinetInput({ width: 900, height: 720, depth: 560, doors: 2 });
    const door = calculateCutList(input).find((p) => p.name === 'Ușă')!;
    // nominal per-door width = (900 - 3*3) / 2 = 445.5; cut width = 445.5 - 2*1
    expect(door.width).toBeCloseTo(443.5, 5);
    expect(door.quantity).toBe(2);
  });

  it('adds one drawer-front part per configured drawer, sized from its own frontHeight', () => {
    const input = resolveCabinetInput({
      width: 600,
      height: 720,
      depth: 560,
      drawers: [{ frontHeight: 140 }, { frontHeight: 180 }],
    });
    const fronts = calculateCutList(input).filter((p) => p.name.startsWith('Front sertar'));
    expect(fronts).toHaveLength(2);
    expect(fronts[0]).toMatchObject({ name: 'Front sertar #1', length: 138, width: 592 });
    expect(fronts[1]).toMatchObject({ name: 'Front sertar #2', length: 178, width: 592 });
  });

  it('carries the material label through to every part', () => {
    const input = resolveCabinetInput({ width: 600, height: 720, depth: 560, material: 'MDF vopsit RAL 9010' });
    const parts = calculateCutList(input);
    expect(parts.every((p) => p.material === 'MDF vopsit RAL 9010')).toBe(true);
  });
});
