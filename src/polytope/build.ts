import { Vector3, Vector4 } from 'three';
import { Hyperplane } from '../geometry/Hyperplane';
import { classify } from '../math/minkowski';
import type { Geometry, Point2, Point3 } from '../geometry/types';
import { Polytope, type PolytopeFace } from './Polytope';

const EPS = 1e-7;

// ───────────────────────────── linear algebra ─────────────────────────────
// The vertex shared by d facets is the (1-dimensional) Minkowski-orthogonal
// complement of their poles. Since ⟨x, n⟩ = x · (J n) with J = diag(-1, 1, …),
// "Minkowski-orthogonal to the poles" is "Euclidean-orthogonal to the J-images
// of the poles" — an ordinary cross product (3D) / 3→1 cross (4D). The SAME
// routine, applied to d vertices, returns the pole of the hyperplane through
// them (incidence ⟨x, n⟩ = 0 is symmetric in point and plane).

/** J·v: negate the timelike component. */
const J3 = (v: Vector3): Vector3 => new Vector3(-v.x, v.y, v.z);
const J4 = (v: Vector4): Vector4 => new Vector4(-v.x, v.y, v.z, v.w);

/** Minkowski-orthogonal complement of two R^{2,1} vectors. */
function ortho2(a: Vector3, b: Vector3): Vector3 {
  return new Vector3().crossVectors(J3(a), J3(b));
}

function det3(a: number[], b: number[], c: number[]): number {
  return (
    a[0] * (b[1] * c[2] - b[2] * c[1]) -
    a[1] * (b[0] * c[2] - b[2] * c[0]) +
    a[2] * (b[0] * c[1] - b[1] * c[0])
  );
}

/** Minkowski-orthogonal complement of three R^{3,1} vectors (the 4D cross product). */
function ortho3(a: Vector4, b: Vector4, c: Vector4): Vector4 {
  const u = J4(a), v = J4(b), w = J4(c);
  const r = [
    [u.x, u.y, u.z, u.w],
    [v.x, v.y, v.z, v.w],
    [w.x, w.y, w.z, w.w],
  ];
  const col = (i: number, j: number, k: number) => [
    [r[0][i], r[0][j], r[0][k]],
    [r[1][i], r[1][j], r[1][k]],
    [r[2][i], r[2][j], r[2][k]],
  ];
  const minor = (i: number, j: number, k: number) => det3(...(col(i, j, k) as [number[], number[], number[]]));
  return new Vector4(+minor(1, 2, 3), -minor(0, 2, 3), +minor(0, 1, 3), -minor(0, 1, 2));
}

// ───────────────────────────── combinatorics ─────────────────────────────

/** All unordered index pairs / triples from [0, n). */
function pairs(n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) out.push([i, j]);
  return out;
}
function triples(n: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) out.push([i, j, k]);
  return out;
}

/** Accumulate a deduplicated vertex set keyed by quantized Klein coordinates. */
class VertexSet<P extends { x: number }> {
  readonly verts: P[] = [];
  readonly active: Set<number>[] = [];
  private index = new Map<string, number>();

  /** `key` distinguishes vertices; merges active-facet sets on a hit. */
  add(v: P, key: string, activeFacets: number[]): void {
    let i = this.index.get(key);
    if (i === undefined) {
      i = this.verts.length;
      this.verts.push(v);
      this.active.push(new Set());
      this.index.set(key, i);
    }
    for (const f of activeFacets) this.active[i].add(f);
  }
}

const klein2Key = (v: Vector3) => `${Math.round((v.y / v.x) / 1e-6)},${Math.round((v.z / v.x) / 1e-6)}`;
const klein3Key = (v: Vector4) =>
  `${Math.round((v.y / v.x) / 1e-6)},${Math.round((v.z / v.x) / 1e-6)},${Math.round((v.w / v.x) / 1e-6)}`;

const q = (x: number) => Math.round(x / 1e-6);
/** Dedup key for an oriented unit pole (equal facets have identical normals). */
const pole3Key = (n: Vector3) => `${q(n.x)},${q(n.y)},${q(n.z)}`;
const pole4Key = (n: Vector4) => `${q(n.x)},${q(n.y)},${q(n.z)},${q(n.w)}`;

/** Edges from facet incidence: a pair of vertices sharing ≥ d-1 facets bounds an edge. */
function edgesFromIncidence(active: Set<number>[], dim: number): [number, number][] {
  const edges: [number, number][] = [];
  for (const [i, j] of pairs(active.length)) {
    let shared = 0;
    for (const f of active[i]) if (active[j].has(f)) shared++;
    if (shared >= dim - 1) edges.push([i, j]);
  }
  return edges;
}

// ───────────────────────────── 2D builder ─────────────────────────────

/** Assemble an H²-polygon from its bounding half-spaces (facet poles). */
export function fromHalfspaces2(geom: Geometry<Point2>, facets: Hyperplane<Vector3>[]): Polytope<Vector3> {
  const set = new VertexSet<Vector3>();
  for (const [i, j] of pairs(facets.length)) {
    const raw = ortho2(facets[i].normal, facets[j].normal);
    if (classify(geom.form(raw, raw)) !== 'timelike') continue; // ideal/hyperideal → TODO
    const v = geom.normalize(raw);
    if (!facets.every((f) => f.side(v) <= EPS)) continue; // must lie in every half-space
    const onFacets = facets.map((_, k) => k).filter((k) => Math.abs(facets[k].side(v)) < EPS);
    set.add(v, klein2Key(v), onFacets);
  }
  // Order the polygon's vertices cyclically by angle in the Klein disk.
  const center = set.verts
    .reduce((c, v) => c.add(new Vector3(v.y / v.x, v.z / v.x, 0)), new Vector3())
    .multiplyScalar(1 / Math.max(1, set.verts.length));
  const order = set.verts
    .map((v, i) => ({ i, a: Math.atan2(v.z / v.x - center.y, v.y / v.x - center.x) }))
    .sort((p, q) => p.a - q.a)
    .map((p) => p.i);

  const verts = order.map((i) => set.verts[i]);
  const edges: [number, number][] = verts.map((_, i) => [i, (i + 1) % verts.length] as [number, number]);
  const kinds = verts.map(() => 'timelike' as const);
  return new Polytope(2, verts, kinds, edges, [], facets);
}

/** Build an H²-polygon from candidate vertices (their geodesic convex hull). */
export function fromVertices2(geom: Geometry<Point2>, points: Vector3[]): Polytope<Vector3> {
  const facets: Hyperplane<Vector3>[] = [];
  const seen = new Set<string>();
  for (const [i, j] of pairs(points.length)) {
    const raw = ortho2(points[i], points[j]); // pole of the line through pts i, j
    if (geom.form(raw, raw) < EPS) continue; // pole must be spacelike
    let n = Hyperplane.fromNormal(geom.form.bind(geom), raw);
    // Orient outward: every other vertex must be weakly inside (side ≤ 0).
    const sides = points.map((p) => n.side(p));
    if (sides.every((s) => s <= EPS)) {
      /* already outward */
    } else if (sides.every((s) => s >= -EPS)) {
      n = new Hyperplane(geom.form.bind(geom), n.normal.clone().multiplyScalar(-1));
    } else {
      continue; // not a supporting line ⇒ not a facet
    }
    const key = pole3Key(n.normal);
    if (!seen.has(key)) { seen.add(key); facets.push(n); }
  }
  return fromHalfspaces2(geom, facets);
}

// ───────────────────────────── 3D builder ─────────────────────────────

/** Order the vertices of one facet cyclically around its plane (in Klein coords). */
function orderFaceLoop(loop: number[], klein: Vector3[]): number[] {
  if (loop.length < 3) return loop;
  const pts = loop.map((i) => klein[i]);
  const center = pts.reduce((c, p) => c.add(p), new Vector3()).multiplyScalar(1 / pts.length);
  // Newell normal of the (planar) polygon, for a stable in-plane basis.
  const normal = new Vector3();
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    normal.x += (a.y - b.y) * (a.z + b.z);
    normal.y += (a.z - b.z) * (a.x + b.x);
    normal.z += (a.x - b.x) * (a.y + b.y);
  }
  normal.normalize();
  const e1 = pts[0].clone().sub(center).normalize();
  const e2 = new Vector3().crossVectors(normal, e1);
  return loop
    .map((idx, k) => {
      const d = pts[k].clone().sub(center);
      return { idx, a: Math.atan2(d.dot(e2), d.dot(e1)) };
    })
    .sort((p, q) => p.a - q.a)
    .map((p) => p.idx);
}

/** Assemble an H³-polytope from its bounding half-spaces (facet poles). */
export function fromHalfspaces3(geom: Geometry<Point3>, facets: Hyperplane<Vector4>[]): Polytope<Vector4> {
  const set = new VertexSet<Vector4>();
  for (const [i, j, k] of triples(facets.length)) {
    const raw = ortho3(facets[i].normal, facets[j].normal, facets[k].normal);
    if (classify(geom.form(raw, raw)) !== 'timelike') continue; // ideal/hyperideal → TODO
    const v = geom.normalize(raw);
    if (!facets.every((f) => f.side(v) <= EPS)) continue;
    const onFacets = facets.map((_, m) => m).filter((m) => Math.abs(facets[m].side(v)) < EPS);
    set.add(v, klein3Key(v), onFacets);
  }

  const klein = set.verts.map((v) => new Vector3(v.y / v.x, v.z / v.x, v.w / v.x));
  const edges = edgesFromIncidence(set.active, 3);

  const faces: PolytopeFace[] = [];
  for (let f = 0; f < facets.length; f++) {
    const loop = set.verts.map((_, i) => i).filter((i) => set.active[i].has(f));
    if (loop.length >= 3) faces.push({ loop: orderFaceLoop(loop, klein), facet: f });
  }

  const kinds = set.verts.map(() => 'timelike' as const);
  return new Polytope(3, set.verts, kinds, edges, faces, facets);
}

/** Build an H³-polytope from candidate vertices (their geodesic convex hull). */
export function fromVertices3(geom: Geometry<Point3>, points: Vector4[]): Polytope<Vector4> {
  const facets: Hyperplane<Vector4>[] = [];
  const seen = new Set<string>();
  for (const [i, j, k] of triples(points.length)) {
    const raw = ortho3(points[i], points[j], points[k]); // pole of the plane through i,j,k
    if (geom.form(raw, raw) < EPS) continue; // pole must be spacelike
    let n = Hyperplane.fromNormal(geom.form.bind(geom), raw);
    const sides = points.map((p) => n.side(p));
    if (sides.every((s) => s <= EPS)) {
      /* outward */
    } else if (sides.every((s) => s >= -EPS)) {
      n = new Hyperplane(geom.form.bind(geom), n.normal.clone().multiplyScalar(-1));
    } else {
      continue;
    }
    const key = pole4Key(n.normal);
    if (!seen.has(key)) { seen.add(key); facets.push(n); }
  }
  return fromHalfspaces3(geom, facets);
}

// ───────────────────────────── hull of a union ─────────────────────────────

/** Gather the distinct vertices of several polytopes (deduped by Klein key). */
function distinctVertices<P extends { x: number }>(polys: { vertices: P[] }[], key: (v: P) => string): P[] {
  const seen = new Set<string>();
  const pts: P[] = [];
  for (const poly of polys) {
    for (const v of poly.vertices) {
      const k = key(v);
      if (!seen.has(k)) { seen.add(k); pts.push(v); }
    }
  }
  return pts;
}

/**
 * The convex hull of a union of H²-polygons: the geodesic convex hull of all
 * their (deduped) vertices. Cost is that of `fromVertices2` — O(V³) in the
 * distinct-vertex count V — so it is cheap for a handful of polygons and grows
 * with the size of the union.
 */
export function hullOfPolytopes2(geom: Geometry<Point2>, polys: Polytope<Vector3>[]): Polytope<Vector3> {
  return fromVertices2(geom, distinctVertices(polys, klein2Key));
}

/**
 * The convex hull of a union of H³-polytopes. Cost is that of `fromVertices3` —
 * O(V⁴) in the distinct-vertex count V — so it is fine for small unions and
 * gets slow as V grows past ~100–150. Dedup keeps V well below (tiles × verts).
 */
export function hullOfPolytopes3(geom: Geometry<Point3>, polys: Polytope<Vector4>[]): Polytope<Vector4> {
  return fromVertices3(geom, distinctVertices(polys, klein3Key));
}
