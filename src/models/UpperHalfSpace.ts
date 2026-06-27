import { Vector3, Vector4, Matrix3 } from 'three';
import type { Model, Domain } from './types';
import type { Geometry, Point3 } from '../geometry/types';

const SOUTH = new Vector3(0, 0, -1);

/** Sphere inversion (radius √2) at the ball's south pole: swaps ball ↔ {Z > 0}. */
function invert(v: Vector3): Vector3 {
  const d = v.clone().sub(SOUTH);
  const k = 2 / d.lengthSq();
  return SOUTH.clone().addScaledVector(d, k);
}

/**
 * The upper-half-space model of H³: { (X, Y, Z) : Z > 0 }, the inversion of the
 * Poincaré ball. Conformal; geodesics are vertical rays and semicircles meeting
 * the boundary plane Z = 0 orthogonally; conformal factor Z/ρ.
 */
export class UpperHalfSpace implements Model<Point3> {
  readonly name = 'Upper half-space';
  readonly renderDim = 3;
  readonly domain: Domain = { kind: 'plane' };
  readonly geometry: Geometry<Point3>;

  constructor(geometry: Geometry<Point3>) {
    this.geometry = geometry;
  }

  private toBall(p: Point3): Vector3 {
    const d = this.geometry.rho + p.x;
    return new Vector3(p.y / d, p.z / d, p.w / d);
  }

  project(p: Point3): Vector3 {
    return invert(this.toBall(p));
  }

  unproject(x: Vector3): Point3 {
    const b = invert(x);
    const rho = this.geometry.rho;
    const s = b.lengthSq();
    const denom = 1 - s;
    return new Vector4(((1 + s) / denom) * rho, (2 * b.x * rho) / denom, (2 * b.y * rho) / denom, (2 * b.z * rho) / denom);
  }

  scaleAt(p: Point3): number {
    return this.project(p).z / this.geometry.rho;
  }

  jacobianAt(p: Point3): Matrix3 {
    return new Matrix3().multiplyScalar(this.scaleAt(p));
  }
}
