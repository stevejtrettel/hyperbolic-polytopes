import { Vector3, Matrix3 } from 'three';
import { mink3 } from '../math/minkowski';
import { distanceH, expH, logH, geodesicH, normalizeH } from '../math/hyperboloid';
import type { Geometry, Point2 } from './types';

/**
 * The hyperbolic plane H²(k), k = -1/ρ². Canonical model: the upper sheet of the
 * hyperboloid ⟨p, p⟩ = -ρ² in Minkowski R^{2,1} (signature -,+,+), a point being
 * a Vector3 (t, x, y) with t timelike. All formulas defer to the shared
 * hyperboloid engine over the form `mink3`.
 */
export class Hyperbolic2 implements Geometry<Point2> {
  readonly dim = 2;
  readonly rho: number;
  readonly curvature: number;

  constructor(k = -1) {
    if (k >= 0) throw new Error(`Hyperbolic2 requires k < 0 (got ${k})`);
    this.curvature = k;
    this.rho = 1 / Math.sqrt(-k);
  }

  form(a: Point2, b: Point2): number {
    return mink3(a, b);
  }

  origin(): Point2 {
    return new Vector3(this.rho, 0, 0);
  }

  distance(p: Point2, q: Point2): number {
    return distanceH(mink3, this.rho, p, q);
  }

  exp(p: Point2, v: Point2, t = 1): Point2 {
    return expH(mink3, this.rho, p, v, t);
  }

  log(p: Point2, q: Point2): Point2 {
    return logH(mink3, this.rho, p, q);
  }

  geodesic(p: Point2, q: Point2): (t: number) => Point2 {
    return geodesicH(mink3, this.rho, p, q);
  }

  normalize(p: Point2): Point2 {
    return normalizeH(mink3, this.rho, p);
  }

  // Isometries: elements of O(2,1) as Matrix3 acting on the ambient (t, x, y).
  identity(): Matrix3 {
    return new Matrix3();
  }

  apply(g: Matrix3, p: Point2): Point2 {
    return p.clone().applyMatrix3(g);
  }

  compose(g: Matrix3, h: Matrix3): Matrix3 {
    return g.clone().multiply(h);
  }

  inverse(g: Matrix3): Matrix3 {
    return g.clone().invert();
  }

  /**
   * The reflection across the hyperplane with unit spacelike pole `n`
   * (⟨n,n⟩ = 1), as a Lorentz matrix: R = I − 2 n (Jn)ᵀ, where Jn negates the
   * timelike component. R ∈ O(2,1), R² = I.
   */
  reflection(n: Point2): Matrix3 {
    const jn = [-n.x, n.y, n.z]; // J·n
    const e = [n.x, n.y, n.z];
    const c = (a: number, b: number) => (a === b ? 1 : 0) - 2 * e[a] * jn[b];
    return new Matrix3().set(
      c(0, 0), c(0, 1), c(0, 2),
      c(1, 0), c(1, 1), c(1, 2),
      c(2, 0), c(2, 1), c(2, 2),
    );
  }
}
