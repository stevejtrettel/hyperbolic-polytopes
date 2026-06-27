import { Vector3, Vector4 } from 'three';

/**
 * Lorentzian (Minkowski) linear algebra, the ambient setting for hyperbolic
 * polytopes. A 2D point lives in R^{2,1} as a Vector3 (t, x, y); a 3D point in
 * R^{3,1} as a Vector4 (t, x, y, z). The first component is timelike.
 *
 * Hyperbolic space H^n is the upper sheet ⟨p, p⟩ = -1 (curvature -1). The dual
 * objects — hyperplanes / half-space normals (poles) — are the spacelike unit
 * vectors ⟨n, n⟩ = +1 (the "one-sheeted hyperboloid", a.k.a. de Sitter space).
 * Points and hyperplanes are projectively dual: both are lines in the ambient
 * space, and the same inner product mediates incidence (⟨p, n⟩ = 0 ⟺ p lies on
 * the hyperplane with pole n).
 */

/** Minkowski inner product on R^{2,1}: ⟨a, b⟩ = -a_t·b_t + a_x·b_x + a_y·b_y. */
export function mink3(a: Vector3, b: Vector3): number {
  return -a.x * b.x + a.y * b.y + a.z * b.z;
}

/** Minkowski inner product on R^{3,1}: ⟨a, b⟩ = -a_t·b_t + a_x·b_x + a_y·b_y + a_z·b_z. */
export function mink4(a: Vector4, b: Vector4): number {
  return -a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
}

/** Causal character of a vector under the Minkowski form. */
export type Causal = 'timelike' | 'lightlike' | 'spacelike';

/** Classify a vector by the sign of ⟨v, v⟩ (with tolerance `eps` around 0). */
export function classify(norm2: number, eps = 1e-9): Causal {
  if (norm2 < -eps) return 'timelike';
  if (norm2 > eps) return 'spacelike';
  return 'lightlike';
}
