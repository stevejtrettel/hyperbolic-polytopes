import { Vector3, Vector4, Matrix3 } from 'three';
import type { Model, Domain } from './types';
import type { Geometry, Point3 } from '../geometry/types';

/**
 * The Poincaré ball model of H³: stereographic projection of the hyperboloid
 * onto the open unit ball (the 3D analogue of the Poincaré disk). Conformal;
 * geodesics are circular arcs meeting the boundary sphere orthogonally;
 * conformal factor (1 - r²)/(2ρ).
 */
export class PoincareBall implements Model<Point3> {
  readonly name = 'Poincaré ball';
  readonly renderDim = 3;
  readonly domain: Domain = { kind: 'sphere', radius: 1 };
  readonly geometry: Geometry<Point3>;

  constructor(geometry: Geometry<Point3>) {
    this.geometry = geometry;
  }

  project(p: Point3): Vector3 {
    const d = this.geometry.rho + p.x;
    return new Vector3(p.y / d, p.z / d, p.w / d);
  }

  unproject(x: Vector3): Point3 {
    const rho = this.geometry.rho;
    const s = x.lengthSq();
    const denom = 1 - s;
    return new Vector4(((1 + s) / denom) * rho, (2 * x.x * rho) / denom, (2 * x.y * rho) / denom, (2 * x.z * rho) / denom);
  }

  scaleAt(p: Point3): number {
    const r2 = this.project(p).lengthSq();
    return (1 - r2) / (2 * this.geometry.rho);
  }

  jacobianAt(p: Point3): Matrix3 {
    return new Matrix3().multiplyScalar(this.scaleAt(p));
  }
}
