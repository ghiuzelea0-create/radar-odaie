import { describe, expect, it } from 'vitest';
import { resolveCabinetInput } from './config.js';
import { calculateSideJoints, totalConnectorCount } from './joints.js';

describe('calculateSideJoints — base cabinet', () => {
  it('returns 3 joints (bottom + 2 rails), bottom scaling with connectorsPerJoint', () => {
    const deep = resolveCabinetInput({ width: 600, height: 720, depth: 560 }); // depth > 500 -> 3
    const joints = calculateSideJoints(deep);
    expect(joints.map((j) => j.label)).toEqual(['fund', 'traversă față', 'traversă spate']);
    expect(joints.find((j) => j.label === 'fund')!.x).toHaveLength(3);
    expect(joints.find((j) => j.label === 'traversă față')!.x).toEqual([8]);
    expect(joints.find((j) => j.label === 'traversă spate')!.x).toEqual([552]);
  });

  it('uses 2 connectors on the bottom joint for a shallow cabinet', () => {
    const shallow = resolveCabinetInput({ width: 600, height: 720, depth: 400 });
    const joints = calculateSideJoints(shallow);
    expect(joints.find((j) => j.label === 'fund')!.x).toEqual([8, 392]);
  });
});

describe('calculateSideJoints — wall cabinet', () => {
  it('returns 2 joints (top + bottom, both full panels), each scaling with connectorsPerJoint', () => {
    const joints = calculateSideJoints(
      resolveCabinetInput({ width: 600, height: 720, depth: 560, cabinetType: 'wall' }),
    );
    expect(joints.map((j) => j.label)).toEqual(['fund', 'panou sus']);
    expect(joints.every((j) => j.x.length === 3)).toBe(true);
  });
});

describe('totalConnectorCount', () => {
  it('doubles the per-side connector count (two side panels)', () => {
    const joints = calculateSideJoints(resolveCabinetInput({ width: 600, height: 720, depth: 560 }));
    expect(totalConnectorCount(joints)).toBe(10); // (3+1+1) * 2
  });
});
