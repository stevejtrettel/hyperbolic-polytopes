/**
 * Euclidean seed solids for the 3D Coxeter polyhedron solver (Route B).
 *
 * The solver needs a starting configuration of supporting planes whose
 * half-space intersection already has the TARGET combinatorics (facet
 * adjacencies, edges, trivalent vertices) — the dihedral angles may be wrong;
 * the nonlinear solve fixes those. We obtain such a seed from a convex Euclidean
 * solid: each face plane, scaled inside the Klein ball, converts to a unit
 * spacelike Lorentz normal, and the existing half-space builder reads off the
 * combinatorics for free (see realizePolyhedron.ts).
 *
 * A solid is stored as its face planes {û, offset}: the half-space û·y ≤ offset,
 * with û outward unit and the origin interior (offset > 0). Unlike a regular
 * solid, an Archimedean/fullerene seed has faces at DIFFERENT offsets, so we keep
 * each face's true offset rather than a single inradius. A Klein facet plane
 * û·y = ρ (0 < ρ < 1) is the hyperbolic plane at distance d = artanh ρ from the
 * origin, with outward unit spacelike pole (our R^{3,1} is time-first,
 * J = diag(−1,1,1,1)):
 *
 *     n = (sinh d, cosh d · û),   ⟨n,n⟩ = −sinh²d + cosh²d = 1.
 */

type Vec3 = readonly [number, number, number];

export interface FacePlane {
  readonly normal: Vec3; // outward unit
  readonly offset: number; // û·y = offset on the face; > 0
}

export interface SeedSolid {
  readonly name: string;
  readonly facePlanes: readonly FacePlane[];
}

function norm3(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}
function normalize3(v: Vec3): Vec3 {
  const n = norm3(v);
  return [v[0] / n, v[1] / n, v[2] / n];
}
function cross3(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * The face planes of the convex hull of `vertices` (the origin must be interior).
 * Brute-force: every triple spans a candidate plane; keep it when all vertices
 * lie weakly on one side (a supporting plane), oriented outward. Deduped by
 * direction. O(V⁴) but V is small for our seeds.
 */
function facePlanesFromVertices(vertices: readonly Vec3[], eps = 1e-9): FacePlane[] {
  const planes: FacePlane[] = [];
  const seen = new Set<string>();
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        const raw = cross3(
          [vertices[j][0] - vertices[i][0], vertices[j][1] - vertices[i][1], vertices[j][2] - vertices[i][2]],
          [vertices[k][0] - vertices[i][0], vertices[k][1] - vertices[i][1], vertices[k][2] - vertices[i][2]],
        );
        if (norm3(raw) < eps) continue; // collinear
        const u = normalize3(raw);
        let maxv = -Infinity;
        let minv = Infinity;
        for (const v of vertices) {
          const d = dot3(u, v);
          if (d > maxv) maxv = d;
          if (d < minv) minv = d;
        }
        // Supporting iff all vertices on one side of the plane through i,j,k.
        const base = dot3(u, vertices[i]);
        let normal: Vec3;
        let offset: number;
        if (maxv <= base + eps) {
          normal = u;
          offset = maxv;
        } else if (minv >= base - eps) {
          normal = [-u[0], -u[1], -u[2]];
          offset = -minv;
        } else {
          continue; // interior plane
        }
        if (!(offset > eps)) continue;
        // Dedup by direction. Round to merge numerically-equal normals, and map
        // −0 → 0 so a face with a zero normal component isn't counted twice.
        const round = (c: number): number => {
          const r = Math.round(c * 1e6) / 1e6;
          return r === 0 ? 0 : r;
        };
        const key = normal.map(round).join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        planes.push({ normal, offset });
      }
    }
  }
  return planes;
}

/** Euclidean vertices of an intersection of half-spaces (for ball-scaling). */
function verticesFromPlanes(planes: readonly FacePlane[], eps = 1e-7): Vec3[] {
  const verts: Vec3[] = [];
  const F = planes.length;
  for (let a = 0; a < F; a++) {
    for (let b = a + 1; b < F; b++) {
      for (let c = b + 1; c < F; c++) {
        const v = intersect3(planes[a], planes[b], planes[c]);
        if (!v) continue;
        if (planes.every((p) => dot3(p.normal, v) <= p.offset + eps)) verts.push(v);
      }
    }
  }
  return verts;
}

/** The point on all three planes, or null if they don't meet in a point. */
function intersect3(a: FacePlane, b: FacePlane, c: FacePlane): Vec3 | null {
  const m = [
    [a.normal[0], a.normal[1], a.normal[2]],
    [b.normal[0], b.normal[1], b.normal[2]],
    [c.normal[0], c.normal[1], c.normal[2]],
  ];
  const det =
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  if (Math.abs(det) < 1e-12) return null;
  const d: Vec3 = [a.offset, b.offset, c.offset];
  const col = (j: number): Vec3 => [m[0][j], m[1][j], m[2][j]];
  const replace = (j: number): number => {
    const cols = [col(0), col(1), col(2)];
    cols[j] = d;
    return (
      cols[0][0] * (cols[1][1] * cols[2][2] - cols[2][1] * cols[1][2]) -
      cols[1][0] * (cols[0][1] * cols[2][2] - cols[2][1] * cols[0][2]) +
      cols[2][0] * (cols[0][1] * cols[1][2] - cols[1][1] * cols[0][2])
    );
  };
  return [replace(0) / det, replace(1) / det, replace(2) / det];
}

/** A seed from Euclidean vertices (origin assumed interior). */
export function seedFromVertices(name: string, vertices: readonly Vec3[]): SeedSolid {
  return { name, facePlanes: facePlanesFromVertices(vertices) };
}

const PHI = (1 + Math.sqrt(5)) / 2;

/** Cyclic (even) permutations of a triple, with all ± sign choices; deduped. */
function evenPermSigns(base: Vec3): Vec3[] {
  const rots: Vec3[] = [base, [base[2], base[0], base[1]], [base[1], base[2], base[0]]];
  const out: Vec3[] = [];
  const seen = new Set<string>();
  for (const r of rots) {
    for (const sx of [1, -1])
      for (const sy of [1, -1])
        for (const sz of [1, -1]) {
          const v: Vec3 = [r[0] * sx, r[1] * sy, r[2] * sz];
          const key = v.map((c) => c.toFixed(6)).join(',');
          if (!seen.has(key)) {
            seen.add(key);
            out.push(v);
          }
        }
  }
  return out;
}

/**
 * The regular dodecahedron: 12 pentagonal faces in the icosahedral directions.
 * Kept in this explicit facet order so the right-angled solve matches
 * `rightAngledDodecahedronGram` index-for-index. (Combinatorial type of the
 * compact right-angled hyperbolic dodecahedron.)
 */
export function dodecahedronSeed(): SeedSolid {
  const raw: Vec3[] = [];
  for (const a of [1, -1])
    for (const b of [PHI, -PHI]) {
      raw.push([0, a, b], [a, b, 0], [b, 0, a]);
    }
  return { name: 'dodecahedron', facePlanes: raw.map((u) => ({ normal: normalize3(u), offset: 1 })) };
}

/**
 * The truncated icosahedron (soccer ball, C₆₀ fullerene): 12 pentagons + 20
 * hexagons, simple, no two pentagons adjacent. As a fullerene it is a Pogorelov
 * polyhedron, so a compact right-angled hyperbolic realization exists.
 */
export function truncatedIcosahedronSeed(): SeedSolid {
  const verts = [
    ...evenPermSigns([0, 1, 3 * PHI]),
    ...evenPermSigns([1, 2 + PHI, 2 * PHI]),
    ...evenPermSigns([2, 1 + 2 * PHI, PHI]),
  ];
  return seedFromVertices('truncated icosahedron', verts);
}

/**
 * The cube. As a reflection group it admits the compact Lambert cube — three
 * mutually non-coplanar edges (one per parallel class, no two sharing a vertex)
 * at π/m, the other nine at π/2 — which the solver realizes to machine precision
 * via `independentEdgeOrder` (a uniform/right-angled cube is Euclidean). The cube
 * has prismatic 4-circuits, outside v1's Andreev check (local + prismatic-3), so
 * the solve + combinatorics verification is the existence gate.
 */
export function cubeSeed(): SeedSolid {
  const v: Vec3[] = [];
  for (const x of [1, -1]) for (const y of [1, -1]) for (const z of [1, -1]) v.push([x, y, z]);
  return seedFromVertices('cube', v);
}

/** All 6 permutations of a 3-vector. */
function permute3(v: Vec3): Vec3[] {
  const [a, b, c] = v;
  return [
    [a, b, c],
    [a, c, b],
    [b, a, c],
    [b, c, a],
    [c, a, b],
    [c, b, a],
  ];
}

/**
 * The truncated octahedron: 8 hexagons + 6 squares (14 faces), simple. Vertices
 * are all permutations of (0,±1,±2). Realizes as a Coxeter polyhedron with the
 * square–hexagon edges at π/2 and the hexagon–hexagon edges at π/m.
 */
export function truncatedOctahedronSeed(): SeedSolid {
  const verts: Vec3[] = [];
  for (const p of permute3([0, 1, 2])) {
    const nz = [0, 1, 2].filter((k) => p[k] !== 0);
    for (const s0 of [1, -1])
      for (const s1 of [1, -1]) {
        const v: [number, number, number] = [p[0], p[1], p[2]];
        v[nz[0]] *= s0;
        v[nz[1]] *= s1;
        verts.push(v);
      }
  }
  return seedFromVertices('truncated octahedron', verts);
}

/**
 * The truncated tetrahedron: 4 hexagons + 4 triangles (8 faces), simple. Built by
 * truncating a tetrahedron — each vertex (2v+w)/3 along an edge from v toward a
 * neighbour w. Realizes with triangle–hexagon edges at π/2, hexagon–hexagon at π/m.
 */
export function truncatedTetrahedronSeed(): SeedSolid {
  const T: Vec3[] = [
    [1, 1, 1],
    [1, -1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
  ];
  const verts: Vec3[] = [];
  for (const v of T) for (const w of T) {
    if (v === w) continue;
    verts.push([(2 * v[0] + w[0]) / 3, (2 * v[1] + w[1]) / 3, (2 * v[2] + w[2]) / 3]);
  }
  return seedFromVertices('truncated tetrahedron', verts);
}

/**
 * An n-gonal prism: two n-gon faces and n square faces, simple/trivalent. A right
 * (all-π/2) prism is Euclidean; the compact Coxeter prism puts the rim (n-gon ↔
 * square) edges at π/2 and the vertical (square ↔ square) edges sharper. Its
 * compactness is governed by the prismatic n-circuit around the side faces — an
 * Andreev condition v1 does not check — so existence here rests on the solve +
 * combinatorics verification rather than an a-priori Andreev pass.
 */
export function prismSeed(n: number): SeedSolid {
  if (!Number.isInteger(n) || n < 3) throw new Error(`prism needs n ≥ 3; got ${n}.`);
  const verts: Vec3[] = [];
  for (let k = 0; k < n; k++) {
    const a = (2 * Math.PI * k) / n;
    for (const z of [1, -1]) verts.push([Math.cos(a), Math.sin(a), z]);
  }
  return seedFromVertices(`${n}-gonal prism`, verts);
}

/**
 * The named seeds available to the solver — all SIMPLE (trivalent) polyhedra,
 * the necessary condition for a compact Coxeter realization. Each realizes with
 * an appropriate edge-order assignment (see edgeOrdering / the demo's per-seed
 * defaults):
 *   • dodecahedron, truncated icosahedron — fullerenes: right-angled + families.
 *   • truncated octahedron, truncated tetrahedron — square/triangle–hexagon edges
 *     at π/2, hexagon–hexagon at π/m.
 *   • cube — the Lambert cube via `independentEdgeOrder` (a uniform cube is
 *     Euclidean); higher m give a family.
 *   • prisms — rim edges at π/2, vertical edges sharper.
 * Non-simple solids (octahedron, icosahedron, …) are absent: their ≥4-valent
 * vertices can only be ideal, never compact.
 */
export const SEEDS: Record<string, () => SeedSolid> = {
  dodecahedron: dodecahedronSeed,
  'truncated icosahedron': truncatedIcosahedronSeed,
  'truncated octahedron': truncatedOctahedronSeed,
  'truncated tetrahedron': truncatedTetrahedronSeed,
  cube: cubeSeed,
  'pentagonal prism': () => prismSeed(5),
  'hexagonal prism': () => prismSeed(6),
};

/**
 * Lorentz seed normals for a solid: each face plane scaled so the whole solid
 * sits inside a ball of Klein-radius `ballRadius` (< 1), then converted to a unit
 * spacelike pole. Returns length-4 vectors (t, x, y, z) in time-first R^{3,1}.
 */
export function seedLorentzNormals(solid: SeedSolid, ballRadius = 0.6): number[][] {
  if (!(ballRadius > 0 && ballRadius < 1)) throw new Error(`ballRadius must lie in (0,1); got ${ballRadius}.`);
  const verts = verticesFromPlanes(solid.facePlanes);
  const maxNorm = Math.max(...verts.map(norm3));
  const scale = ballRadius / maxNorm;
  return solid.facePlanes.map(({ normal, offset }) => {
    const rho = offset * scale; // in (0, ballRadius)
    const d = Math.atanh(rho);
    const sh = Math.sinh(d);
    const ch = Math.cosh(d);
    return [sh, ch * normal[0], ch * normal[1], ch * normal[2]];
  });
}
