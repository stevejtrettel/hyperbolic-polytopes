import { Vector3, Vector4 } from 'three';
import type { Vec } from '../math/hyperboloid';
import type { Geometry } from '../geometry/types';
import { solveLinear } from '../math/linearSolve';
import { fromVertices2, fromVertices3 } from '../polytope/build';
import { transformPolytope } from '../polytope/transform';
import type { Polytope } from '../polytope/Polytope';
import type { CoxeterGroup } from './CoxeterGroup';

/**
 * The Wythoff (kaleidoscopic) construction: a SECOND tessellation built from a
 * Coxeter group, distinct from its fundamental chamber.
 *
 * The chamber tiling (CoxeterGroup.tessellate) carries the fundamental simplex
 * over the group orbit. Wythoff instead orbits a single SEED POINT into a UNIFORM
 * polytope/honeycomb (truncated, rectified, omnitruncated, …); which mirrors the
 * seed lies on — the "ringed" Coxeter diagram — selects the form (a node is
 * RINGED/active when the seed is off that mirror).
 *
 * We build it the same way the engine builds everything else — ONE polytope, then
 * move it around: a CELL is the seed's orbit under a maximal parabolic subgroup
 * (drop one node), hulled into a `Polytope`; the full honeycomb is that cell
 * carried over the group orbit by `transformPolytope` and deduped by centroid.
 * Cells are real polytopes, so they draw solid through the usual `PolytopeView`.
 *
 * Targets SIMPLEX chambers (triangle groups in H², tetrahedral groups in H³),
 * where the ring construction is exact and the relevant parabolics are finite.
 */

/** One cell of the uniform tessellation: a transformed copy of a base cell. */
export interface UniformCell<P extends Vec<P>> {
  readonly polytope: Polytope<P>;
  /** Word-length of the orbit element that placed it (for depth shading). */
  readonly depth: number;
}

/**
 * The Wythoff seed point for a ring pattern: on every UNRINGED mirror
 * (⟨p, n_i⟩ = 0) and at unit signed distance inside each RINGED one
 * (⟨p, n_i⟩ = −1). Solved as p = Σ_j c_j n_j with G c = t, G_ij = ⟨n_i, n_j⟩ —
 * exact when the poles are independent (a simplex chamber). Coordinate-free: it
 * needs no ambient-coordinate access. At least one node must be ringed.
 */
export function wythoffPoint<P extends Vec<P>, I>(group: CoxeterGroup<P, I>, active: readonly boolean[]): P {
  const normals = group.mirrors.map((m) => m.normal);
  const n = normals.length;
  if (active.length !== n) throw new Error(`ring pattern length ${active.length} ≠ rank ${n}.`);
  if (!active.some(Boolean)) throw new Error('at least one node must be ringed (active).');

  const form = (a: P, b: P) => group.geom.form(a, b);
  const gram = normals.map((ni) => normals.map((nj) => form(ni, nj)));
  const c = solveLinear(gram, active.map((on) => (on ? -1 : 0)));

  let p = normals[0].clone().multiplyScalar(0); // zero ambient vector
  for (let j = 0; j < n; j++) p = p.addScaledVector(normals[j], c[j]);
  if (!(form(p, p) < 0)) throw new Error('Wythoff seed is not timelike for this ring pattern (non-simplex chamber?).');
  return group.geom.normalize(p);
}

/** Enumeration cap for a cell's parabolic subgroup; spherical links are ≤ 120. */
const PARABOLIC_CAP = 400;

/**
 * The uniform tessellation for a ring pattern: build each cell once (seed orbit
 * under a one-node-dropped parabolic, hulled), then carry it over the group orbit
 * out to word-length `maxDepth`, deduped by centroid. `maxCells` bounds the size
 * (the honeycomb is infinite).
 */
export function wythoffTessellation<P extends Vec<P>, I>(
  group: CoxeterGroup<P, I>,
  active: readonly boolean[],
  maxDepth: number,
  maxCells = 2000,
): UniformCell<P>[] {
  const geom = group.geom;
  const normals = group.mirrors.map((m) => m.normal);
  const seed = wythoffPoint(group, active);
  const minVerts = geom.dim === 2 ? 3 : 4;

  // Base cells: drop each node whose remaining link is finite and whose cell is
  // non-degenerate (some other node ringed, so the seed actually moves).
  const baseCells: Polytope<P>[] = [];
  const baseCentroids: P[] = [];
  for (let k = 0; k < group.rank; k++) {
    if (!active.some((on, i) => on && i !== k)) continue; // seed fixed by this parabolic → degenerate
    const parabolic = group.reflections.filter((_, i) => i !== k);
    const elements = group.subgroup(parabolic, PARABOLIC_CAP);
    if (elements.length >= PARABOLIC_CAP) continue; // parabolic infinite → unbounded cell
    const cell = hull(geom, elements.map((g) => geom.normalize(geom.apply(g, seed))));
    if (cell.vertices.length < minVerts) continue;
    baseCells.push(cell);
    baseCentroids.push(centroid(geom, cell.vertices));
  }
  if (baseCells.length === 0) return [];

  // Carry the base cells over the orbit; dedup by transformed centroid so each
  // distinct cell appears once (its parabolic stabilizer otherwise repeats it).
  const key = (p: P) => normals.map((nrm) => Math.round(geom.form(p, nrm) * 1e5) / 1e5).join(',');
  const seen = new Set<string>();
  const cells: UniformCell<P>[] = [];
  for (const e of group.orbit(maxDepth, maxCells)) {
    for (let b = 0; b < baseCells.length; b++) {
      const c = geom.normalize(geom.apply(e.element, baseCentroids[b]));
      const k = key(c);
      if (seen.has(k)) continue;
      seen.add(k);
      cells.push({ polytope: transformPolytope(baseCells[b], geom, e.element), depth: e.depth });
    }
  }
  return cells;
}

/** Geodesic convex hull of points into a Polytope, dispatched on dimension. */
function hull<P extends Vec<P>>(geom: Geometry<P>, points: P[]): Polytope<P> {
  if (geom.dim === 2) {
    return fromVertices2(geom as unknown as Geometry<Vector3>, points as unknown as Vector3[]) as unknown as Polytope<P>;
  }
  return fromVertices3(geom as unknown as Geometry<Vector4>, points as unknown as Vector4[]) as unknown as Polytope<P>;
}

/** The (renormalized) centroid of a point set on the hyperboloid. */
function centroid<P extends Vec<P>>(geom: Geometry<P>, points: P[]): P {
  let c = points[0].clone().multiplyScalar(0);
  for (const p of points) c = c.addScaledVector(p, 1);
  return geom.normalize(c);
}
