/**
 * Closed-form geodesic engine on the hyperboloid model of H^n, written once and
 * shared by the 2D (Vector3) and 3D (Vector4) geometries. Everything is phrased
 * through the ambient Minkowski form, passed in as `form`, so the same code runs
 * over R^{2,1} and R^{3,1}.
 *
 * A point p satisfies ⟨p, p⟩ = -ρ² (ρ = 1 for curvature -1). A tangent v at p is
 * spacelike with ⟨p, v⟩ = 0. The geodesic from p with initial velocity v is
 *   exp_p(t·v) = cosh(t·s/ρ)·p + (ρ/s)·sinh(t·s/ρ)·v,   s = |v| = √⟨v, v⟩,
 * and its inverse log recovers v from the endpoints.
 */

/** Minimal three.js Vector interface these routines need (Vector3 and Vector4 both satisfy it). */
export interface Vec<V> {
  clone(): V;
  multiplyScalar(s: number): V;
  addScaledVector(v: V, s: number): V;
}

type Form<V> = (a: V, b: V) => number;

/** Geodesic distance between p and q on the hyperboloid of radius ρ. */
export function distanceH<V>(form: Form<V>, rho: number, p: V, q: V): number {
  const c = -form(p, q) / (rho * rho);
  return rho * Math.acosh(Math.max(1, c));
}

/** Exponential map: flow from p along tangent v for parameter t. */
export function expH<V extends Vec<V>>(form: Form<V>, rho: number, p: V, v: V, t = 1): V {
  const s = Math.sqrt(Math.max(0, form(v, v)));
  if (s < 1e-12) return p.clone();
  const a = (t * s) / rho;
  return p.clone().multiplyScalar(Math.cosh(a)).addScaledVector(v, (rho * Math.sinh(a)) / s);
}

/** Inverse of exp: the tangent at p whose geodesic reaches q at t = 1. */
export function logH<V extends Vec<V>>(form: Form<V>, rho: number, p: V, q: V): V {
  const c = Math.max(1, -form(p, q) / (rho * rho)); // = cosh(d/ρ)
  const w = q.clone().addScaledVector(p, -c); // q - c·p: the part of q orthogonal to p
  if (c <= 1 + 1e-15) return w.multiplyScalar(0); // p and q coincide
  const d = rho * Math.acosh(c);
  const S = rho * Math.sinh(d / rho); // |w|
  return w.multiplyScalar(d / S);
}

/** Unit-domain geodesic p → q over t ∈ [0, 1]. */
export function geodesicH<V extends Vec<V>>(form: Form<V>, rho: number, p: V, q: V): (t: number) => V {
  const v = logH(form, rho, p, q);
  return (t: number) => expH(form, rho, p, v, t);
}

/** Rescale a drifting vector back exactly onto the upper sheet ⟨q, q⟩ = -ρ². */
export function normalizeH<V extends Vec<V> & { x: number }>(form: Form<V>, rho: number, p: V): V {
  const q = p.clone();
  const n = -form(q, q);
  if (n > 0) q.multiplyScalar(rho / Math.sqrt(n));
  if (q.x < 0) q.multiplyScalar(-1); // force the upper (t > 0) sheet
  return q;
}
