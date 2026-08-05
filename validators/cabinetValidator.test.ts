import { describe, expect, it } from 'vitest';
import { resolveCabinetInput } from '../engine/config.js';
import { CabinetValidationError } from './errors.js';
import { validateCabinetInput } from './cabinetValidator.js';

function validate(overrides: Parameters<typeof resolveCabinetInput>[0]) {
  validateCabinetInput(resolveCabinetInput(overrides));
}

/** Runs `fn`, asserts it throws a CabinetValidationError, and returns its `.code`. */
function codeOf(fn: () => void): string {
  expect(fn).toThrow(CabinetValidationError);
  try {
    fn();
    throw new Error('expected fn to throw');
  } catch (error) {
    return (error as CabinetValidationError).code;
  }
}

describe('validateCabinetInput', () => {
  it('accepts a standard base cabinet', () => {
    expect(() => validate({ width: 600, height: 720, depth: 560, doors: 1, shelves: 2 })).not.toThrow();
  });

  it('rejects a non-positive dimension', () => {
    expect(codeOf(() => validate({ width: 0, height: 720, depth: 560 }))).toBe('INVALID_DIMENSION');
  });

  it('rejects a width below the structural minimum', () => {
    expect(codeOf(() => validate({ width: 100, height: 720, depth: 560 }))).toBe('DIMENSION_OUT_OF_RANGE');
  });

  it('rejects too many doors for the cabinet width (each door would be structurally unstable)', () => {
    expect(codeOf(() => validate({ width: 600, height: 720, depth: 560, doors: 4 }))).toBe('DOOR_WIDTH_UNSTABLE');
  });

  it('rejects a single door spanning too wide a cabinet', () => {
    expect(codeOf(() => validate({ width: 1400, height: 720, depth: 560, doors: 1 }))).toBe('DOOR_WIDTH_UNSTABLE');
  });

  it('rejects too many shelves for the cabinet height', () => {
    expect(codeOf(() => validate({ width: 600, height: 720, depth: 560, shelves: 10 }))).toBe(
      'SHELF_SPAN_TOO_SMALL',
    );
  });

  it('rejects a drawer whose explicit depth exceeds the internal cabinet depth', () => {
    expect(
      codeOf(() => validate({ width: 600, height: 720, depth: 400, drawers: [{ frontHeight: 150, depth: 500 }] })),
    ).toBe('DRAWER_DEPTH_EXCEEDS_CABINET');
  });

  it('accepts a drawer depth that fits within the internal cabinet depth', () => {
    expect(() =>
      validate({ width: 600, height: 720, depth: 560, drawers: [{ frontHeight: 150, depth: 450 }] }),
    ).not.toThrow();
  });

  it('rejects stacked drawer fronts whose total height exceeds the cabinet height', () => {
    expect(
      codeOf(() =>
        validate({
          width: 600,
          height: 300,
          depth: 560,
          drawers: [{ frontHeight: 150 }, { frontHeight: 150 }, { frontHeight: 150 }],
        }),
      ),
    ).toBe('DRAWER_HEIGHT_EXCEEDS_CABINET');
  });

  it('rejects a board thickness that leaves no usable span', () => {
    expect(codeOf(() => validate({ width: 600, height: 720, depth: 560, config: { boardThickness: 400 } }))).toBe(
      'BOARD_THICKNESS_INVALID',
    );
  });
});
