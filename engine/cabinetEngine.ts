import type { CabinetInput, CabinetOutput } from '../models/types.js';
import { validateCabinetInput } from '../validators/cabinetValidator.js';
import { resolveCabinetInput } from './config.js';
import { calculateCutList } from './cutList.js';
import { calculateHardwareBom } from './hardware.js';
import { calculateCncOperations } from './cnc.js';

/**
 * Single entry point of the parametric cabinet engine: resolves defaults,
 * validates the physical constraints, and computes the cut list, hardware
 * BOM and CNC drilling map for one cabinet carcass.
 *
 * Throws `CabinetValidationError` (see validators/errors.ts) if the input
 * violates a structural constraint.
 */
export function buildCabinet(rawInput: CabinetInput): CabinetOutput {
  const input = resolveCabinetInput(rawInput);
  validateCabinetInput(input);

  return {
    input,
    cutList: calculateCutList(input),
    hardwareList: calculateHardwareBom(input),
    cncOperations: calculateCncOperations(input),
  };
}
