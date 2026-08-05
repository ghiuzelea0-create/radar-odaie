/**
 * Shared data model for the parametric cabinet engine.
 *
 * All linear measurements are in millimeters (mm) unless stated otherwise.
 * This module has no dependencies on `engine/` or `validators/` — it only
 * describes shapes, so it can be imported from either without a cycle.
 */

/** Edge-banding thickness applied to each side of a rectangular panel. 0 = raw/unbanded edge. */
export interface EdgeBandingSpec {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** Tunable manufacturing constants. Every field has a sane default (see engine/constants.ts); override only for a specific hardware catalog or shop standard. */
export interface CabinetConfig {
  /** Structural board thickness (sides, rails, bottom, shelves, doors). */
  boardThickness: number;
  /** Thickness of the (thinner) back panel material. */
  backPanelThickness: number;
  /** ABS/PVC edge banding thickness applied to visible edges. */
  edgeBandingThickness: number;
  /** Width of the front/back top stretcher rails (base-cabinet open-top construction). */
  railWidth: number;
  /** Depth of the groove routed into sides/rails/bottom that receives the back panel. */
  backPanelGrooveDepth: number;
  /** Gap left between adjacent doors and between a door and the carcass edge. */
  doorGap: number;
  /** Clearance kept between a shelf's side edges and the carcass sides (for insertion/adjustment). */
  shelfSideClearance: number;
  /** Setback of a shelf's front edge from the carcass front (handle/door clearance). */
  shelfFrontSetback: number;
  /** Clearance kept between the drawer box back and the cabinet's back panel/groove. */
  drawerRunnerSetback: number;
  /** Whether to include one handle per door/drawer front in the hardware BOM. */
  includeHandles: boolean;
}

/**
 * A single drawer requested for the cabinet, ordered top to bottom. The
 * drawer box itself is a pre-fabricated steel system (e.g. Blum TANDEMBOX),
 * so it is resolved as a hardware BOM line, not a cut-list panel — only the
 * front panel is cut from board.
 */
export interface DrawerSpec {
  /** Height of the visible drawer front. */
  frontHeight: number;
  /**
   * Optional explicit drawer box depth. When omitted, the box is sized to
   * the maximum depth the carcass allows.
   */
  depth?: number;
}

/** Parametric input describing a single rectangular cabinet carcass (e.g. a base cabinet). */
export interface CabinetInput {
  /** Overall exterior width of the carcass. */
  width: number;
  /** Overall exterior height of the carcass. */
  height: number;
  /** Overall exterior depth of the carcass (side panel depth). */
  depth: number;
  /** Number of full-overlay doors sharing the front width. Default 0. */
  doors?: number;
  /** Number of adjustable shelves, evenly distributed in the internal height. Default 0. */
  shelves?: number;
  /** Ordered list of drawer fronts/boxes, top to bottom. Default []. */
  drawers?: DrawerSpec[];
  /** Sheet material label carried through to the cut list (e.g. "PAL Egger U702 ST9"). */
  material?: string;
  /** Partial overrides merged over the default CabinetConfig. */
  config?: Partial<CabinetConfig>;
}

/** Fully-resolved input after defaults have been applied and validated. */
export interface ResolvedCabinetInput extends Required<Omit<CabinetInput, 'config' | 'drawers'>> {
  drawers: DrawerSpec[];
  config: CabinetConfig;
}

/** One entry of the cut list: a rectangular part, sized to its final (post edge-banding) cut dimensions. */
export interface Part {
  name: string;
  /** Final cut length (longest conventional axis for the part; mm). */
  length: number;
  /** Final cut width (mm). */
  width: number;
  quantity: number;
  material: string;
  thickness: number;
  edgeBanding: EdgeBandingSpec;
}

/** One BOM line: a hardware/fitting SKU and the quantity required for this cabinet. */
export interface HardwareItem {
  sku: string;
  name: string;
  quantity: number;
}

/**
 * One CNC drilling/grooving instruction, positioned relative to the named
 * part's zero-point: the bottom-left corner in face view, with the part
 * lying in its final (post edge-banding) orientation.
 */
export interface CncOperation {
  /** Name of the Part this operation applies to. */
  part: string;
  operation: 'drilling' | 'grooving';
  /** Human-readable operation type, e.g. "hinge-cup", "shelf-pin", "minifix-dowel". */
  type: string;
  /** Horizontal distance from the zero-point, along the part's width axis (mm). */
  x: number;
  /** Vertical distance from the zero-point, along the part's length axis (mm). */
  y: number;
  diameter?: number;
  depth?: number;
  note?: string;
}

/** Complete, validated output of the engine for a single cabinet. */
export interface CabinetOutput {
  input: ResolvedCabinetInput;
  cutList: Part[];
  hardwareList: HardwareItem[];
  cncOperations: CncOperation[];
}
