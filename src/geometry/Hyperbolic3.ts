import { Vector4, Matrix4 } from 'three';
import { mink4 } from '../math/minkowski';
import { distanceH, expH, logH, geodesicH, normalizeH } from '../math/hyperboloid';
import type { Geometry, Point3 } from './types';

/**
 * Hyperbolic 3-space H³(k), k = -1/ρ². The upper sheet of ⟨p, p⟩ = -ρ² in
 * Minkowski R^{3,1} (signature -,+,+,+), a point being a Vector4 (t, x, y, z)
 * with t timelike. Identical to Hyperbolic2 over the 4D form `mink4`.
 */
export class Hyperbolic3 implements Geometry<Point3> {
  readonly dim = 3;
  readonly rho: number;
  readonly curvature: number;

  constructor(k = -1) {
    if (k >= 0) throw new Error(`Hyperbolic3 requires k < 0 (got ${k})`);
    this.curvature = k;
    this.rho = 1 / Math.sqrt(-k);
  }

  form(a: Point3, b: Point3): number {
    return mink4(a, b);
  }

  origin(): Point3 {
    return new Vector4(this.rho, 0, 0, 0);
  }

  distance(p: Point3, q: Point3): number {
    return distanceH(mink4, this.rho, p, q);
  }

  exp(p: Point3, v: Point3, t = 1): Point3 {
    return expH(mink4, this.rho, p, v, t);
  }

  log(p: Point3, q: Point3): Point3 {
    return logH(mink4, this.rho, p, q);
  }

  geodesic(p: Point3, q: Point3): (t: number) => Point3 {
    return geodesicH(mink4, this.rho, p, q);
  }

  normalize(p: Point3): Point3 {
    return normalizeH(mink4, this.rho, p);
  }

  // Isometries: elements of O(3,1) as Matrix4 acting on the ambient (t, x, y, z).
  identity(): Matrix4 {
    return new Matrix4();
  }

  apply(g: Matrix4, p: Point3): Point3 {
    return p.clone().applyMatrix4(g);
  }

  compose(g: Matrix4, h: Matrix4): Matrix4 {
    return g.clone().multiply(h);
  }

  inverse(g: Matrix4): Matrix4 {
    return g.clone().invert();
  }

  /**
   * The reflection across the hyperplane with unit spacelike pole `n`
   * (⟨n,n⟩ = 1), as a Lorentz matrix: R = I − 2 n (Jn)ᵀ, where Jn negates the
   * timelike component. R ∈ O(3,1), R² = I.
   */
  reflection(n: Point3): Matrix4 {
    const jn = [-n.x, n.y, n.z, n.w]; // J·n
    const e = [n.x, n.y, n.z, n.w];
    const c = (a: number, b: number) => (a === b ? 1 : 0) - 2 * e[a] * jn[b];
    return new Matrix4().set(
      c(0, 0), c(0, 1), c(0, 2), c(0, 3),
      c(1, 0), c(1, 1), c(1, 2), c(1, 3),
      c(2, 0), c(2, 1), c(2, 2), c(2, 3),
      c(3, 0), c(3, 1), c(3, 2), c(3, 3),
    );
  }
}
