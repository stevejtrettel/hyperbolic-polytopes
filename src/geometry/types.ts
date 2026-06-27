import type { Vector3, Vector4 } from 'three';

/**
 * A hyperbolic geometry, described intrinsically on the hyperboloid model — no
 * reference to any picture. Generic over the canonical point type `P`: Vector3
 * for H² (ambient R^{2,1}), Vector4 for H³ (ambient R^{3,1}). Models turn these
 * canonical points into renderable coordinates.
 */
export interface Geometry<P> {
  readonly dim: number;
  /** Curvature radius ρ (= 1/√(-k)); the hyperboloid is ⟨p, p⟩ = -ρ². */
  readonly rho: number;

  /** The ambient Minkowski inner product, restricted to these points/tangents. */
  form(a: P, b: P): number;

  /** Geodesic distance. */
  distance(p: P, q: P): number;
  /** Exponential map: flow from p along tangent v for parameter t. */
  exp(p: P, v: P, t?: number): P;
  /** Inverse of exp: the tangent at p reaching q at t = 1. */
  log(p: P, q: P): P;
  /** Unit-domain geodesic p → q over t ∈ [0, 1]. */
  geodesic(p: P, q: P): (t: number) => P;
  /** Project a drifting vector back exactly onto the hyperboloid. */
  normalize(p: P): P;
}

export type Point2 = Vector3;
export type Point3 = Vector4;
