import { Vector3, Matrix3 } from 'three';

/**
 * Build the symmetric render-space distortion matrix
 *   rad · (û ûᵀ) + tang · (I - û ûᵀ) = tang·I + (rad - tang)·û ûᵀ,
 * i.e. scale `rad` along the unit direction `dir` and `tang` across it. Used by
 * the projective (Klein) models, whose metric is anisotropic: a round intrinsic
 * ball renders flattened radially. If `dir` is ~zero the result is isotropic.
 */
export function radialAnisotropy(dir: Vector3, rad: number, tang: number): Matrix3 {
  const s = dir.lengthSq();
  if (s < 1e-12) return new Matrix3().multiplyScalar(tang);
  const u = dir.clone().multiplyScalar(1 / Math.sqrt(s));
  const c = (i: number, j: number) =>
    (i === j ? tang : 0) + (rad - tang) * u.getComponent(i) * u.getComponent(j);
  return new Matrix3().set(
    c(0, 0), c(0, 1), c(0, 2),
    c(1, 0), c(1, 1), c(1, 2),
    c(2, 0), c(2, 1), c(2, 2),
  );
}
