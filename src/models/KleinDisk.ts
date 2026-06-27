import { Vector3, Matrix3 } from 'three';
import type { Model, Domain } from './types';
import type { Geometry, Point2 } from '../geometry/types';
import { radialAnisotropy } from '../math/anisotropy';

/**
 * The Beltrami–Klein disk model of H². Central (gnomonic) projection of the
 * hyperboloid onto the open unit disk, so geodesics become straight chords —
 * which is why polytope combinatorics is computed here. Non-conformal: a round
 * intrinsic disk renders as an ellipse, captured by the anisotropic `jacobianAt`
 * (scales (1-s) radially, √(1-s) tangentially, /ρ).
 */
export class KleinDisk implements Model<Point2> {
  readonly name = 'Klein disk';
  readonly renderDim = 2;
  readonly domain: Domain = { kind: 'disk', radius: 1 };
  readonly geometry: Geometry<Point2>;

  constructor(geometry: Geometry<Point2>) {
    this.geometry = geometry;
  }

  project(p: Point2): Vector3 {
    return new Vector3(p.y / p.x, p.z / p.x, 0);
  }

  unproject(x: Vector3): Point2 {
    const rho = this.geometry.rho;
    const s = x.x * x.x + x.y * x.y;
    const lambda = rho / Math.sqrt(1 - s);
    return new Vector3(lambda, lambda * x.x, lambda * x.y);
  }

  scaleAt(p: Point2): number {
    const d = this.project(p);
    const s = d.x * d.x + d.y * d.y;
    return Math.sqrt(Math.max(0, 1 - s)) / this.geometry.rho;
  }

  jacobianAt(p: Point2): Matrix3 {
    const rho = this.geometry.rho;
    const d = this.project(p);
    const s = d.x * d.x + d.y * d.y;
    return radialAnisotropy(d, (1 - s) / rho, Math.sqrt(Math.max(0, 1 - s)) / rho);
  }
}
