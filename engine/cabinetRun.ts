/**
 * Multi-cabinet run assembly: builds and validates every cabinet in an
 * order (e.g. a full kitchen project) and consolidates their cut lists and
 * hardware BOMs into shop-ready totals — identical parts and matching SKUs
 * are summed rather than duplicated per cabinet, matching what a
 * nesting/cutting-optimization program or a purchasing order expects as
 * input.
 */
import type { CabinetInput, CabinetOutput, HardwareItem, Part } from '../models/types.js';
import { buildCabinet } from './cabinetEngine.js';

export interface CabinetRunEntry {
  /** Human-readable label for this cabinet within the run, e.g. "Corp inferior chiuvetă". */
  label: string;
  input: CabinetInput;
}

export interface CabinetRunOutput {
  /** Per-cabinet outputs, in the same order as the input entries. */
  cabinets: Array<{ label: string; output: CabinetOutput }>;
  /** Cut list across the whole run; identical parts (same dimensions/material/thickness/banding) are merged by summing quantity. */
  cutList: Part[];
  /** Hardware BOM across the whole run, merged by SKU. */
  hardwareList: HardwareItem[];
}

function partKey(part: Part): string {
  const { top, bottom, left, right } = part.edgeBanding;
  return [part.name, part.length, part.width, part.material, part.thickness, top, bottom, left, right].join('|');
}

function mergeParts(parts: Part[]): Part[] {
  const merged = new Map<string, Part>();
  for (const part of parts) {
    const key = partKey(part);
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += part.quantity;
    } else {
      merged.set(key, { ...part });
    }
  }
  return [...merged.values()];
}

function mergeHardware(items: HardwareItem[]): HardwareItem[] {
  const merged = new Map<string, HardwareItem>();
  for (const item of items) {
    const existing = merged.get(item.sku);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      merged.set(item.sku, { ...item });
    }
  }
  return [...merged.values()];
}

/**
 * Builds every cabinet in `entries` (throwing `CabinetValidationError` — see
 * validators/errors.ts — on the first invalid one, before any output is
 * consolidated) and returns both the individual results and the merged
 * cut list / hardware BOM for the whole run.
 */
export function assembleCabinetRun(entries: CabinetRunEntry[]): CabinetRunOutput {
  const cabinets = entries.map((entry) => ({ label: entry.label, output: buildCabinet(entry.input) }));

  return {
    cabinets,
    cutList: mergeParts(cabinets.flatMap((c) => c.output.cutList)),
    hardwareList: mergeHardware(cabinets.flatMap((c) => c.output.hardwareList)),
  };
}
