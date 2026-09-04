import { describe, expect, it } from 'vitest';
import { resolveCabinetInput } from './config.js';
import { calculateHardwareBom, drawerHeightClass, hingeCountForDoorHeight, nearestStandardSlideLength } from './hardware.js';
import { HINGE, MINIFIX, SHELF_PIN, WALL_BRACKET } from './constants.js';

function bomFor(overrides: Parameters<typeof resolveCabinetInput>[0]) {
  return calculateHardwareBom(resolveCabinetInput(overrides));
}

describe('hingeCountForDoorHeight', () => {
  it.each([
    [500, 2],
    [900, 2],
    [901, 3],
    [1600, 3],
    [1601, 4],
    [2000, 4],
    [2001, 5],
  ])('maps door height %imm to %i hinges', (height, expected) => {
    expect(hingeCountForDoorHeight(height)).toBe(expected);
  });
});

describe('nearestStandardSlideLength', () => {
  it('picks the largest standard length that still fits', () => {
    expect(nearestStandardSlideLength(537)).toBe(500);
    expect(nearestStandardSlideLength(270)).toBe(270);
  });

  it('falls back to the shortest standard length when nothing fits', () => {
    expect(nearestStandardSlideLength(50)).toBe(270);
  });
});

describe('drawerHeightClass', () => {
  it.each([
    [120, 'M'],
    [150, 'M'],
    [180, 'K'],
    [220, 'K'],
    [260, 'C'],
  ])('classifies a %imm front as class %s', (frontHeight, expected) => {
    expect(drawerHeightClass(frontHeight)).toBe(expected);
  });
});

describe('calculateHardwareBom', () => {
  it('adds 2 hinges and 1 handle for a single low door, plus corner-joint connectors', () => {
    const bom = bomFor({ width: 600, height: 720, depth: 560, doors: 1 });

    const hinges = bom.find((i) => i.sku === HINGE.SKU);
    expect(hinges?.quantity).toBe(2); // doorHeight = 720 - 2*3 = 714mm -> 2 hinges

    const minifix = bom.find((i) => i.sku === MINIFIX.SKU);
    // Per side: bottom joint (3 connectors, depth 560 > 500) + front rail (1) + back rail (1) = 5; x2 sides = 10
    expect(minifix?.quantity).toBe(10);

    const dowels = bom.find((i) => i.sku === MINIFIX.DOWEL_SKU);
    expect(dowels?.quantity).toBe(10);
  });

  it('uses 2 connectors on the bottom joint for a shallow (<=500mm) cabinet', () => {
    const bom = bomFor({ width: 600, height: 720, depth: 400 });
    const minifix = bom.find((i) => i.sku === MINIFIX.SKU);
    // Per side: bottom joint (2) + front rail (1) + back rail (1) = 4; x2 sides = 8
    expect(minifix?.quantity).toBe(8);
  });

  it('scales hinge quantity with door count and height breakpoint', () => {
    const bom = bomFor({ width: 1200, height: 2100, depth: 560, doors: 2 });
    // doorHeight = 2100 - 6 = 2094mm -> breakpoint > 2000 -> 5 hinges/door
    const hinges = bom.find((i) => i.sku === HINGE.SKU);
    expect(hinges?.quantity).toBe(10);
  });

  it('adds 4 shelf pins per shelf', () => {
    const bom = bomFor({ width: 600, height: 720, depth: 560, shelves: 3 });
    const pins = bom.find((i) => i.sku === SHELF_PIN.SKU);
    expect(pins?.quantity).toBe(12);
  });

  it('omits hinge/handle/shelf-pin lines entirely when there are no doors/shelves', () => {
    const bom = bomFor({ width: 600, height: 720, depth: 560 });
    expect(bom.find((i) => i.sku === HINGE.SKU)).toBeUndefined();
    expect(bom.find((i) => i.sku === SHELF_PIN.SKU)).toBeUndefined();
  });

  it('adds one drawer-box set and one handle per drawer, sized independently', () => {
    const bom = bomFor({
      width: 600,
      height: 720,
      depth: 560,
      drawers: [{ frontHeight: 140 }, { frontHeight: 180 }],
    });
    expect(bom.find((i) => i.sku === 'BLUM-TANDEMBOX-M-500')?.quantity).toBe(1);
    expect(bom.find((i) => i.sku === 'BLUM-TANDEMBOX-K-500')?.quantity).toBe(1);
  });

  it('merges duplicate SKUs (e.g. handles from doors and drawers) into a single line', () => {
    const bom = bomFor({
      width: 600,
      height: 720,
      depth: 560,
      doors: 1,
      drawers: [{ frontHeight: 140 }],
    });
    const handleLines = bom.filter((i) => i.name.toLowerCase().includes('mâner'));
    expect(handleLines).toHaveLength(1);
    expect(handleLines[0].quantity).toBe(2); // 1 door + 1 drawer
  });

  it('omits handles when includeHandles is disabled', () => {
    const bom = bomFor({ width: 600, height: 720, depth: 560, doors: 1, config: { includeHandles: false } });
    expect(bom.some((i) => i.name.toLowerCase().includes('mâner'))).toBe(false);
  });

  it('adds a wall-mounting bracket set for cabinetType "wall" and omits it for "base"', () => {
    const wall = bomFor({ width: 600, height: 720, depth: 560, cabinetType: 'wall' });
    expect(wall.find((i) => i.sku === WALL_BRACKET.SKU)?.quantity).toBe(2);

    const base = bomFor({ width: 600, height: 720, depth: 560 });
    expect(base.find((i) => i.sku === WALL_BRACKET.SKU)).toBeUndefined();
  });
});
