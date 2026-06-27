import { Vector3, Matrix3 } from 'three';
import type { Model, Domain } from './types';
import type { Geometry, Point2 } from '../geometry/types';

/**
 * The upper-half-plane model of H²: { (X, Y) : Y > 0 }, the Cayley transform of
 * the Poincaré disk (so it stays conformal). Geodesics are vertical rays and
 * semicircles centered on the real axis. Conformal factor Y/ρ.
 */
export class UpperHalfPlane implements Model<Point2> {
  readonly name = 'Upper half-plane';
  readonly renderDim = 2;
  readonly domain: Domain = { kind: 'halfplane' };
  readonly geometry: Geometry<Point2>;

  constructor(geometry: Geometry<Point2>) {
    this.geometry = geometry;
  }

  private toDisk(p: Point2): { u: number; v: number } {
    const d = this.geometry.rho + p.x;
    return { u: p.y / d, v: p.z / d };
  }

  project(p: Point2): Vector3 {
    const { u, v } = this.toDisk(p);
    // Cayley transform ζ = i(1 - w)/(1 + w), w = u + iv (disk → upper half-plane).
    const denom = (1 + u) * (1 + u) + v * v;
    return new Vector3((2 * v) / denom, (1 - u * u - v * v) / denom, 0);
  }

  unproject(x: Vector3): Point2 {
    const X = x.x;
    const Y = x.y;
    const e = X * X + (1 + Y) * (1 + Y);
    const u = (1 - X * X - Y * Y) / e;
    const v = (2 * X) / e;
    const rho = this.geometry.rho;
    const s = u * u + v * v;
    const denom = 1 - s;
    return new Vector3(((1 + s) / denom) * rho, (2 * u * rho) / denom, (2 * v * rho) / denom);
  }

  scaleAt(p: Point2): number {
    return this.project(p).y / this.geometry.rho;
  }

  jacobianAt(p: Point2): Matrix3 {
    return new Matrix3().multiplyScalar(this.scaleAt(p));
  }
}
