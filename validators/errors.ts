export type CabinetValidationErrorCode =
  | 'INVALID_DIMENSION'
  | 'DIMENSION_OUT_OF_RANGE'
  | 'DOOR_WIDTH_UNSTABLE'
  | 'DOOR_HEIGHT_EXCEEDS_LIMIT'
  | 'SHELF_SPAN_TOO_SMALL'
  | 'DRAWER_DEPTH_EXCEEDS_CABINET'
  | 'DRAWER_HEIGHT_EXCEEDS_CABINET'
  | 'BOARD_THICKNESS_INVALID';

/** Thrown when a CabinetInput violates a physical or structural manufacturing constraint. */
export class CabinetValidationError extends Error {
  readonly code: CabinetValidationErrorCode;

  constructor(message: string, code: CabinetValidationErrorCode) {
    super(message);
    this.name = 'CabinetValidationError';
    this.code = code;
  }
}
