import type { ResolvedCabinetInput } from '../models/types.js';
import { LIMITS } from '../engine/constants.js';
import { doorHeight, doorWidth, maxDrawerBoxDepth, shelfSpacing } from '../engine/formulas.js';
import { CabinetValidationError } from './errors.js';

/**
 * Validates a resolved cabinet input against physical/structural manufacturing
 * constraints. Throws `CabinetValidationError` on the first violation found.
 */
export function validateCabinetInput(input: ResolvedCabinetInput): void {
  const { width, height, depth, doors, shelves, drawers, config } = input;

  for (const [label, value] of Object.entries({ width, height, depth })) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new CabinetValidationError(
        `${label} trebuie să fie un număr pozitiv (primit: ${value}).`,
        'INVALID_DIMENSION',
      );
    }
  }

  if (width < LIMITS.MIN_WIDTH || width > LIMITS.MAX_WIDTH) {
    throw new CabinetValidationError(
      `width=${width}mm în afara intervalului admis [${LIMITS.MIN_WIDTH}, ${LIMITS.MAX_WIDTH}]mm.`,
      'DIMENSION_OUT_OF_RANGE',
    );
  }
  if (height < LIMITS.MIN_HEIGHT || height > LIMITS.MAX_HEIGHT) {
    throw new CabinetValidationError(
      `height=${height}mm în afara intervalului admis [${LIMITS.MIN_HEIGHT}, ${LIMITS.MAX_HEIGHT}]mm.`,
      'DIMENSION_OUT_OF_RANGE',
    );
  }
  if (depth < LIMITS.MIN_DEPTH || depth > LIMITS.MAX_DEPTH) {
    throw new CabinetValidationError(
      `depth=${depth}mm în afara intervalului admis [${LIMITS.MIN_DEPTH}, ${LIMITS.MAX_DEPTH}]mm.`,
      'DIMENSION_OUT_OF_RANGE',
    );
  }

  if (!Number.isFinite(config.boardThickness) || config.boardThickness <= 0) {
    throw new CabinetValidationError(
      `boardThickness trebuie să fie un număr pozitiv (primit: ${config.boardThickness}).`,
      'BOARD_THICKNESS_INVALID',
    );
  }
  if (config.boardThickness * 2 >= width || config.boardThickness * 2 >= depth) {
    throw new CabinetValidationError(
      `boardThickness=${config.boardThickness}mm este prea mare pentru width=${width}mm / depth=${depth}mm.`,
      'BOARD_THICKNESS_INVALID',
    );
  }

  if (doors > 0) {
    const dWidth = doorWidth(width, doors, config);
    if (dWidth < LIMITS.MIN_DOOR_WIDTH || dWidth > LIMITS.MAX_DOOR_WIDTH) {
      throw new CabinetValidationError(
        `Cu ${doors} uși, lățimea unei uși ar fi ${dWidth.toFixed(1)}mm — în afara intervalului stabil ` +
          `[${LIMITS.MIN_DOOR_WIDTH}, ${LIMITS.MAX_DOOR_WIDTH}]mm. Ajustează numărul de uși sau width.`,
        'DOOR_WIDTH_UNSTABLE',
      );
    }
    const dHeight = doorHeight(height, config);
    if (dHeight > LIMITS.MAX_DOOR_HEIGHT) {
      throw new CabinetValidationError(
        `Înălțimea ușii (${dHeight.toFixed(1)}mm) depășește limita structurală de ${LIMITS.MAX_DOOR_HEIGHT}mm.`,
        'DOOR_HEIGHT_EXCEEDS_LIMIT',
      );
    }
  }

  if (shelves > 0) {
    const spacing = shelfSpacing(height, shelves, config);
    if (spacing < LIMITS.MIN_SHELF_CLEAR_SPAN) {
      throw new CabinetValidationError(
        `Cu ${shelves} polițe, spațiul liber între ele ar fi ${spacing.toFixed(1)}mm — sub minimul de ` +
          `${LIMITS.MIN_SHELF_CLEAR_SPAN}mm. Redu numărul de polițe sau crește height.`,
        'SHELF_SPAN_TOO_SMALL',
      );
    }
  }

  if (drawers.length > 0) {
    const maxDepth = maxDrawerBoxDepth(depth, config);
    let totalFrontHeight = 0;
    for (const [index, drawer] of drawers.entries()) {
      totalFrontHeight += drawer.frontHeight;
      if (drawer.depth !== undefined && drawer.depth > maxDepth) {
        throw new CabinetValidationError(
          `Sertarul #${index + 1}: depth=${drawer.depth}mm depășește adâncimea internă disponibilă ` +
            `(${maxDepth.toFixed(1)}mm) pentru depth=${depth}mm.`,
          'DRAWER_DEPTH_EXCEEDS_CABINET',
        );
      }
    }
    const totalGaps = config.doorGap * (drawers.length + 1);
    if (totalFrontHeight + totalGaps > height) {
      throw new CabinetValidationError(
        `Fronturile sertarelor (${totalFrontHeight}mm) plus rosturile (${totalGaps}mm) depășesc height=${height}mm.`,
        'DRAWER_HEIGHT_EXCEEDS_CABINET',
      );
    }
  }
}
