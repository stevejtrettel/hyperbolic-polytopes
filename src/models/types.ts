import type { Vector3, Matrix3 } from 'three';
import type { Geometry } from '../geometry/types';

/** Shape of a model's render-space domain (for boundaries, clipping, etc.). */
export type Domain =
  | { kind: 'disk'; radius: number }
  | { kind: 'halfplane' }
  | { kind: 'plane' }
  | { kind: 'sphere'; radius: number };

/**
 * A coordinate model (chart): maps canonical hyperboloid points into a concrete
 * picture and reports how the intrinsic metric is distorted there. Generic over
 * the canonical point type `P` (Vector3 for H², Vector4 for H³).
 *
 * `scaleAt` is the source of geometrically-correct sizing: a primitive of
 * intrinsic length L appears at render length ≈ L · scaleAt(p). Conformal models
 * (Poincaré, upper-half) need only this scalar; the non-conformal Klein model
 * additionally uses the anisotropic `jacobianAt` (round disks render as ellipses).
 */
export interface Model<P> {
  readonly geometry: Geometry<P>;
  readonly name: string;
  /** Does this model render into R² (a flat chart) or R³ (ball / globe)? */
  readonly renderDim: 2 | 3;
  readonly domain: Domain;

  /** Canonical point → render coordinates (always a Vector3; z = 0 for flat charts). */
  project(p: P): Vector3;
  /** Inverse of project (for authoring and picking). */
  unproject(x: Vector3): P;

  /** Isotropic render length per unit intrinsic length (exact for conformal models). */
  scaleAt(p: P): number;
  /** Full local distortion g^(-1/2) as a Matrix3 on the render-space tangent. */
  jacobianAt(p: P): Matrix3;
}
