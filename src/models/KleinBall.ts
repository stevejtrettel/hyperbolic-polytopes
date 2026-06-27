import { Vector3, Vector4, Matrix3 } from 'three';
import type { Model, Domain } from './types';
import type { Geometry, Point3 } from '../geometry/types';
import { radialAnisotropy } from '../math/anisotropy';

/**
 * The Beltrami–Klein ball model of H³: central projection of the hyperboloid
 * onto the unit ball, so geodesics and geodesic planes are straight chords and
 * flat Euclidean polygons — the chart where polytope combinatorics is computed.
 * Non-conformal: a round intrinsic ball renders flattened radially (anisotropic
 * `jacobianAt`, scales (1-s) radially, √(1-s) tangentially, /ρ).
 */
export class KleinBall implements Model<Point3> {
  readonly name = 'Klein ball';
  readonly renderDim = 3;
  readonly domain: Domain = { kind: 'sphere', radius: 1 };
  readonly geometry: Geometry<Point3>;

  constructor(geometry: Geometry<Point3>) {
    this.geometry = geometry;
  }

  project(p: Point3): Vector3 {
    return new Vector3(p.y / p.x, p.z / p.x, p.w / p.x);
  }

  unproject(x: Vector3): Point3 {
    const rho = this.geometry.rho;
    const s = x.lengthSq();
    const lambda = rho / Math.sqrt(1 - s);
    return new Vector4(lambda, lambda * x.x, lambda * x.y, lambda * x.z);
  }

  scaleAt(p: Point3): number {
    const s = this.project(p).lengthSq();
    return Math.sqrt(Math.max(0, 1 - s)) / this.geometry.rho;
  }

  jacobianAt(p: Point3): Matrix3 {
    const rho = this.geometry.rho;
    const d = this.project(p);
    const s = d.lengthSq();
    return radialAnisotropy(d, (1 - s) / rho, Math.sqrt(Math.max(0, 1 - s)) / rho);
  }
}
