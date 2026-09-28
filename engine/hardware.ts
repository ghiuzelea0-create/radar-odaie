/**
 * Rule-based hardware BOM: hinge count from door height, minifix/dowel count
 * from the shared joint plan (engine/joints.ts), shelf pins from shelf
 * count, one Blum TANDEMBOX steel drawer-box set per drawer, and a
 * wall-mounting bracket set for `wall` cabinets.
 */
import type { HardwareItem, ResolvedCabinetInput } from '../models/types.js';
import { HANDLE, HINGE, HINGE_COUNT_BREAKPOINTS, MINIFIX, SHELF_PIN, STANDARD_SLIDE_LENGTHS, WALL_BRACKET } from './constants.js';
import { doorHeight, maxDrawerBoxDepth } from './formulas.js';
import { calculateSideJoints, totalConnectorCount } from './joints.js';

export function hingeCountForDoorHeight(heightMm: number): number {
  const breakpoint = HINGE_COUNT_BREAKPOINTS.find((b) => heightMm <= b.maxHeight);
  return breakpoint ? breakpoint.count : HINGE_COUNT_BREAKPOINTS[HINGE_COUNT_BREAKPOINTS.length - 1].count;
}

export function nearestStandardSlideLength(mm: number): number {
  const fits = STANDARD_SLIDE_LENGTHS.filter((length) => length <= mm);
  return fits.length > 0 ? fits[fits.length - 1] : STANDARD_SLIDE_LENGTHS[0];
}

export function drawerHeightClass(frontHeightMm: number): 'M' | 'K' | 'C' {
  if (frontHeightMm <= 150) return 'M';
  if (frontHeightMm <= 220) return 'K';
  return 'C';
}

function mergeBySku(items: HardwareItem[]): HardwareItem[] {
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

export function calculateHardwareBom(input: ResolvedCabinetInput): HardwareItem[] {
  const { height, depth, doors, shelves, drawers, config, cabinetType } = input;
  const items: HardwareItem[] = [];

  if (doors > 0) {
    const hingesPerDoor = hingeCountForDoorHeight(doorHeight(height, config));
    items.push({ sku: HINGE.SKU, name: HINGE.NAME, quantity: hingesPerDoor * doors });
    if (config.includeHandles) {
      items.push({ sku: HANDLE.SKU, name: HANDLE.NAME, quantity: doors });
    }
  }

  const connectorCount = totalConnectorCount(calculateSideJoints(input));
  items.push({ sku: MINIFIX.SKU, name: MINIFIX.NAME, quantity: connectorCount });
  items.push({ sku: MINIFIX.DOWEL_SKU, name: MINIFIX.DOWEL_NAME, quantity: connectorCount });

  if (cabinetType === 'wall') {
    items.push({ sku: WALL_BRACKET.SKU, name: WALL_BRACKET.NAME, quantity: 2 });
  }

  if (shelves > 0) {
    items.push({ sku: SHELF_PIN.SKU, name: SHELF_PIN.NAME, quantity: shelves * 4 });
  }

  if (drawers.length > 0) {
    const maxDepth = maxDrawerBoxDepth(depth, config);
    for (const drawer of drawers) {
      const boxDepth = drawer.depth ?? maxDepth;
      const length = nearestStandardSlideLength(boxDepth);
      const heightClass = drawerHeightClass(drawer.frontHeight);
      items.push({
        sku: `BLUM-TANDEMBOX-${heightClass}-${length}`,
        name: `Set cutie sertar Blum TANDEMBOX, clasă ${heightClass}, lungime ${length}mm`,
        quantity: 1,
      });
      if (config.includeHandles) {
        items.push({ sku: HANDLE.SKU, name: HANDLE.NAME, quantity: 1 });
      }
    }
  }

  return mergeBySku(items);
}
