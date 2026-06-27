import type { Vec } from '../math/hyperboloid';

type Form<P> = (a: P, b: P) => number;

/**
 * A hyperbolic hyperplane, represented by its pole — the spacelike normal vector
 * `n` with ⟨n, n⟩ = +1 (a point of de Sitter space). The hyperplane is
 * { x : ⟨x, n⟩ = 0 } and the half-space it bounds is { x : ⟨x, n⟩ ≤ 0 } (the
 * side containing the points that "see" n as an outward normal).
 *
 * Points and hyperplanes are projectively dual: both are vectors in the ambient
 * Minkowski space, paired by the same form. Generic over the canonical point
 * type `P` (Vector3 for H², Vector4 for H³).
 */
export class Hyperplane<P extends Vec<P>> {
  /** The pole: a unit spacelike normal, ⟨normal, normal⟩ = +1. */
  readonly normal: P;
  private readonly form: Form<P>;

  /** Wrap an already-unit spacelike pole. Use the static builders for raw input. */
  constructor(form: Form<P>, normal: P) {
    this.form = form;
    this.normal = normal;
  }

  /** Normalize an arbitrary spacelike vector to a unit pole and wrap it. */
  static fromNormal<P extends Vec<P>>(form: Form<P>, raw: P): Hyperplane<P> {
    const n2 = form(raw, raw);
    if (n2 <= 0) throw new Error(`Hyperplane normal must be spacelike (got ⟨n,n⟩ = ${n2})`);
    return new Hyperplane(form, raw.clone().multiplyScalar(1 / Math.sqrt(n2)));
  }

  /**
   * The perpendicular-bisector hyperplane of two points p, q (the locus
   * ⟨x, p⟩ = ⟨x, q⟩, i.e. equal Minkowski inner product, hence equal distance).
   * Its pole is the spacelike direction p - q. This is the building block of
   * Dirichlet domains.
   */
  static bisector<P extends Vec<P>>(form: Form<P>, p: P, q: P): Hyperplane<P> {
    // ⟨x, p⟩ = ⟨x, q⟩  ⟺  ⟨x, p - q⟩ = 0, with the half-space ⟨x, p - q⟩ ≤ 0
    // (the side closer to q). p - q is spacelike for distinct hyperboloid points.
    return Hyperplane.fromNormal(form, p.clone().addScaledVector(q, -1));
  }

  /** Signed Minkowski pairing ⟨x, n⟩: < 0 inside the half-space, > 0 outside, 0 on it. */
  side(x: P): number {
    return this.form(x, this.normal);
  }

  /** Reflect a point across this hyperplane: R(x) = x - 2⟨x, n⟩ n. An isometry. */
  reflect(x: P): P {
    return x.clone().addScaledVector(this.normal, -2 * this.side(x));
  }

  /**
   * The hyperplane whose pole is `fn(this.normal)` — i.e. this hyperplane carried
   * by an isometry (apply the same map to the pole). Re-normalizes to a unit pole.
   */
  mapped(fn: (n: P) => P): Hyperplane<P> {
    return Hyperplane.fromNormal(this.form, fn(this.normal));
  }
}
