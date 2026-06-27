import { Vector3, Matrix3 } from 'three';
import type { Model, Domain } from './types';
import type { Geometry, Point2 } from '../geometry/types';

/**
 * The Poincaré disk model of H². Stereographic projection of the hyperboloid
 * onto the open unit disk. Conformal: render length per unit intrinsic length is
 * (1 - r²)/(2ρ), so objects shrink toward the boundary. Geodesics are circular
 * arcs meeting the boundary at right angles.
 */
export class PoincareDisk implements Model<Point2> {
  readonly name = 'Poincaré disk';
  readonly renderDim = 2;
  readonly domain: Domain = { kind: 'disk', radius: 1 };
  readonly geometry: Geometry<Point2>;

  constructor(geometry: Geometry<Point2>) {
    this.geometry = geometry;
  }

  project(p: Point2): Vector3 {
    const d = this.geometry.rho + p.x;
    return new Vector3(p.y / d, p.z / d, 0);
  }

  unproject(x: Vector3): Point2 {
    const rho = this.geometry.rho;
    const s = x.x * x.x + x.y * x.y;
    const denom = 1 - s;
    return new Vector3(((1 + s) / denom) * rho, (2 * x.x * rho) / denom, (2 * x.y * rho) / denom);
  }

  scaleAt(p: Point2): number {
    const d = this.project(p);
    const r2 = d.x * d.x + d.y * d.y;
    return (1 - r2) / (2 * this.geometry.rho);
  }

  jacobianAt(p: Point2): Matrix3 {
    return new Matrix3().multiplyScalar(this.scaleAt(p));
  }
}
