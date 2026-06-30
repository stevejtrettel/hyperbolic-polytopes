import { describe, it, expect } from 'vitest';
import { Vector4 } from 'three';
import { Hyperbolic3 } from '../src/geometry/Hyperbolic3';
import { Hyperplane } from '../src/geometry/Hyperplane';
import { fromHalfspaces3 } from '../src/polytope/build';
import {
  dodecahedronSeed,
  truncatedIcosahedronSeed,
  cubeSeed,
  truncatedOctahedronSeed,
  truncatedTetrahedronSeed,
  prismSeed,
  seedLorentzNormals,
} from '../src/coxeter/polyhedron/seeds';
import { analyzeCombinatorics } from '../src/coxeter/polyhedron/combinatorics';
import { edgeClasses, faceTypeOrder, matchingOrder, independentEdgeOrder } from '../src/coxeter/polyhedron/edgeOrdering';
import { validateAndreev } from '../src/coxeter/polyhedron/andreev';
import { solveFaceNormals } from '../src/coxeter/polyhedron/solve';
import { rightAngledDodecahedronGram } from '../src/coxeter/gram';
import { realizeCoxeterPolyhedron } from '../src/coxeter/polyhedron/realizePolyhedron';
import { realization3ToGroup, buildCoxeterGroup3 } from '../src/coxeter/CoxeterGroup';

const geom = new Hyperbolic3(-1);
const form = (a: Vector4, b: Vector4) => geom.form(a, b);

function buildFromNormals(normals: number[][]) {
  const mirrors = normals.map((c) => Hyperplane.fromNormal(form, new Vector4(c[0], c[1], c[2], c[3])));
  return fromHalfspaces3(geom, mirrors);
}

describe('3D seed solids', () => {
  it('dodecahedron seed has 12 unit face planes', () => {
    const solid = dodecahedronSeed();
    expect(solid.facePlanes).toHaveLength(12);
    for (const p of solid.facePlanes) {
      expect(Math.hypot(p.normal[0], p.normal[1], p.normal[2])).toBeCloseTo(1, 12);
      expect(p.offset).toBeGreaterThan(0);
    }
  });

  it('seed Lorentz normals are unit spacelike in R^{3,1}', () => {
    const normals = seedLorentzNormals(dodecahedronSeed(), 0.5);
    expect(normals).toHaveLength(12);
    const mink = (a: number[]) => -a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3];
    for (const n of normals) expect(mink(n)).toBeCloseTo(1, 12);
  });

  it('reproduces the dodecahedron combinatorics (12 facets, 20 vertices, 30 edges)', () => {
    const poly = buildFromNormals(seedLorentzNormals(dodecahedronSeed(), 0.5));
    expect(poly.facets.length).toBe(12);
    expect(poly.vertices.length).toBe(20);
    expect(poly.edges.length).toBe(30);
    expect(poly.faces.length).toBe(12);
    expect(poly.vertices.length - poly.edges.length + poly.faces.length).toBe(2);
  });

  it('builds the truncated icosahedron (soccer ball): 32 facets, 60 vertices, 90 edges', () => {
    const solid = truncatedIcosahedronSeed();
    expect(solid.facePlanes).toHaveLength(32); // 12 pentagons + 20 hexagons
    const poly = buildFromNormals(seedLorentzNormals(solid, 0.4));
    expect(poly.facets.length).toBe(32);
    expect(poly.vertices.length).toBe(60);
    expect(poly.edges.length).toBe(90);
    expect(poly.vertices.length - poly.edges.length + poly.faces.length).toBe(2);
  });

  it('keeps the dodecahedron combinatorics across compact ball radii', () => {
    for (const r of [0.2, 0.4, 0.6]) {
      const poly = buildFromNormals(seedLorentzNormals(dodecahedronSeed(), r));
      expect(poly.facets.length).toBe(12);
      expect(poly.vertices.length).toBe(20);
      expect(poly.edges.length).toBe(30);
    }
  });
});

describe('3D combinatorics extraction', () => {
  it('finds a simple (trivalent) dodecahedron with 30 facet pairs', () => {
    const c = analyzeCombinatorics(geom, seedLorentzNormals(dodecahedronSeed(), 0.5));
    expect(c.vertexFacets).toHaveLength(20);
    for (const vf of c.vertexFacets) expect(vf).toHaveLength(3); // trivalent
    expect(c.edgeFacets).toHaveLength(30);
    expect(c.facetPairs).toHaveLength(30); // each face borders 5 others ⇒ 12·5/2 = 30

    // Every facet is adjacent to exactly 5 others.
    const degree = new Array(12).fill(0);
    for (const [i, j] of c.facetPairs) {
      degree[i]++;
      degree[j]++;
    }
    expect(degree).toEqual(new Array(12).fill(5));
  });
});

describe('3D Andreev validation', () => {
  const c = analyzeCombinatorics(geom, seedLorentzNormals(dodecahedronSeed(), 0.5));

  it('accepts the right-angled dodecahedron (all orders 2)', () => {
    const result = validateAndreev(c, () => 2);
    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('rejects all-π/3 (every trivalent vertex would be ideal: 1/3+1/3+1/3 = 1)', () => {
    const result = validateAndreev(c, () => 3);
    expect(result.ok).toBe(false);
    expect(result.violations.every((v) => v.kind === 'vertex')).toBe(true);
    expect(result.violations).toHaveLength(20); // all 20 vertices fail
  });

  it('has no prismatic 3-circuits (all adjacency triangles are vertices)', () => {
    // If there were a prismatic 3-circuit, all-2 (Σ1/m = 1.5 ≥ 1) would flag it.
    const result = validateAndreev(c, () => 2);
    expect(result.violations.some((v) => v.kind === 'prismatic-3-circuit')).toBe(false);
  });
});

describe('3D face-normal solver', () => {
  const mink = (a: number[], b: number[]) => -a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];

  it('recovers the right-angled dodecahedron from the seed (all orders 2)', () => {
    const seed = seedLorentzNormals(dodecahedronSeed(), 0.5);
    const c = analyzeCombinatorics(geom, seed);
    const result = solveFaceNormals(seed, c.facetPairs, () => 2);

    expect(result.converged).toBe(true);
    expect(result.residualNorm).toBeLessThan(1e-9);

    // Solved normals are unit spacelike.
    for (const n of result.normals) expect(mink(n, n)).toBeCloseTo(1, 9);

    // Adjacent facets are orthogonal (right angles).
    for (const [i, j] of c.facetPairs) expect(mink(result.normals[i], result.normals[j])).toBeCloseTo(0, 9);

    // The full Gram is isometry-invariant, so it must equal the known closed form
    // (same facet ordering) regardless of the solver's frame.
    const closed = rightAngledDodecahedronGram();
    for (let i = 0; i < 12; i++)
      for (let j = 0; j < 12; j++) expect(mink(result.normals[i], result.normals[j])).toBeCloseTo(closed[i][j], 8);
  });

  it('converges to the same Gram from different seed inradii', () => {
    const closed = rightAngledDodecahedronGram();
    for (const rho of [0.3, 0.6]) {
      const seed = seedLorentzNormals(dodecahedronSeed(), rho);
      const c = analyzeCombinatorics(geom, seed);
      const result = solveFaceNormals(seed, c.facetPairs, () => 2);
      expect(result.converged).toBe(true);
      for (let i = 0; i < 12; i++)
        for (let j = 0; j < 12; j++) expect(mink(result.normals[i], result.normals[j])).toBeCloseTo(closed[i][j], 7);
    }
  });
});

describe('3D realize + group integration', () => {
  const mink = (a: number[], b: number[]) => -a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];

  it('realizes the right-angled dodecahedron end to end, matching the Gram path', () => {
    const pr = realizeCoxeterPolyhedron('dodecahedron', () => 2);
    expect(pr.andreev.ok).toBe(true);
    expect(pr.solve.converged).toBe(true);
    expect(pr.realization.dim).toBe(3);

    // Interior point lies strictly inside every half-space.
    for (const n of pr.realization.normals) expect(mink(pr.realization.interior, n)).toBeLessThan(1e-9);

    // The solver's realization and the closed-form Gram path agree as groups:
    // same chamber combinatorics (12 facets, 20 vertices, 30 edges).
    const fromSolver = realization3ToGroup(pr.realization);
    const fromGram = buildCoxeterGroup3(rightAngledDodecahedronGram());
    expect(fromSolver.rank).toBe(12);
    expect(fromSolver.fundamentalDomain().vertices.length).toBe(20);
    expect(fromGram.fundamentalDomain().vertices.length).toBe(20);

    // It tiles H³.
    const tiles = fromSolver.tessellate(2, 500);
    expect(tiles.length).toBeGreaterThan(1);
  });

  it('rejects an Andreev-invalid assignment (all orders 3)', () => {
    expect(() => realizeCoxeterPolyhedron('dodecahedron', () => 3)).toThrow(/Andreev/);
  });

  it('rejects an unknown seed', () => {
    expect(() => realizeCoxeterPolyhedron('icosahedron', () => 2)).toThrow(/unknown seed/);
  });
});

describe('3D edge-ordering schemes', () => {
  const mink = (a: number[], b: number[]) => -a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];

  it('exposes the soccer ball edge classes (pentagon–hexagon and hexagon–hexagon)', () => {
    const c = analyzeCombinatorics(geom, seedLorentzNormals(truncatedIcosahedronSeed(), 0.4));
    expect(edgeClasses(c)).toEqual(['5-6', '6-6']);
    // The dodecahedron has a single class.
    const cd = analyzeCombinatorics(geom, seedLorentzNormals(dodecahedronSeed(), 0.5));
    expect(edgeClasses(cd)).toEqual(['5-5']);
  });

  it('realizes the right-angled soccer ball (all orders 2) and tiles H³', () => {
    const pr = realizeCoxeterPolyhedron('truncated icosahedron', () => 2, { seedInradius: 0.4 });
    expect(pr.andreev.ok).toBe(true);
    expect(pr.solve.converged).toBe(true);
    expect(pr.combinatorics.polytope.facets.length).toBe(32);
    const group = realization3ToGroup(pr.realization);
    expect(group.tessellate(1, 200).length).toBeGreaterThan(1);
  });

  it('realizes a by-face-type soccer ball with no closed form (5–6 = 2, 6–6 = 3)', () => {
    const solid = truncatedIcosahedronSeed();
    const c = analyzeCombinatorics(geom, seedLorentzNormals(solid, 0.4));
    const order = faceTypeOrder(c, { '5-6': 2, '6-6': 3 });
    const pr = realizeCoxeterPolyhedron(solid, order, { seedInradius: 0.4 });
    expect(pr.solve.converged).toBe(true);
    expect(pr.solve.residualNorm).toBeLessThan(1e-9);
    // Hexagon–hexagon dihedral is π/3; pentagon–hexagon is π/2.
    const sizes = c.polytope.faces.reduce<number[]>((acc, f) => {
      acc[f.facet] = f.loop.length;
      return acc;
    }, new Array(32).fill(0));
    const N = pr.realization.normals;
    for (const [i, j] of pr.combinatorics.facetPairs) {
      const want = sizes[i] === 6 && sizes[j] === 6 ? -Math.cos(Math.PI / 3) : 0;
      expect(mink(N[i], N[j])).toBeCloseTo(want, 6);
    }
  });

  it('realizes an edge-matched (2,2,m) dodecahedron with no closed form', () => {
    const solid = dodecahedronSeed();
    const c = analyzeCombinatorics(geom, seedLorentzNormals(solid, 0.5));
    const pr = realizeCoxeterPolyhedron(solid, matchingOrder(c, 4), { seedInradius: 0.5 });
    expect(pr.solve.converged).toBe(true);
    expect(pr.combinatorics.polytope.vertices.length).toBe(20);
  });
});

describe('3D — Lambert cube', () => {
  const mink = (a: number[], b: number[]) => -a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];

  it('builds a simple cube seed (6 facets, 8 vertices, 12 edges)', () => {
    const c = analyzeCombinatorics(geom, seedLorentzNormals(cubeSeed(), 0.4));
    expect(c.polytope.facets.length).toBe(6);
    expect(c.polytope.vertices.length).toBe(8);
    expect(c.polytope.edges.length).toBe(12);
    for (const vf of c.vertexFacets) expect(vf).toHaveLength(3); // trivalent
  });

  it('selects exactly three independent (Lambert) edges on the cube', () => {
    const c = analyzeCombinatorics(geom, seedLorentzNormals(cubeSeed(), 0.4));
    const ord = independentEdgeOrder(c, 3);
    const special = c.facetPairs.filter(([i, j]) => ord(i, j) === 3);
    expect(special).toHaveLength(3);
  });

  it('realizes the Lambert cube to machine precision and tiles', () => {
    const solid = cubeSeed();
    const c = analyzeCombinatorics(geom, seedLorentzNormals(solid, 0.4));
    const pr = realizeCoxeterPolyhedron(solid, independentEdgeOrder(c, 3), {
      seedInradius: 0.4,
      skipAndreev: true, // cube has prismatic-4 circuits, outside v1's Andreev check
    });
    expect(pr.solve.residualNorm).toBeLessThan(1e-8); // the correct Lambert triple converges fully
    // Still a cube, and the three special edges are π/3.
    expect(pr.combinatorics.polytope.vertices.length).toBe(8);
    const ord = independentEdgeOrder(c, 3);
    for (const [i, j] of pr.combinatorics.facetPairs) {
      expect(mink(pr.realization.normals[i], pr.realization.normals[j])).toBeCloseTo(-Math.cos(Math.PI / ord(i, j)), 8);
    }
    const group = realization3ToGroup(pr.realization);
    expect(group.rank).toBe(6);
    expect(group.tessellate(1, 100).length).toBeGreaterThan(1);
  });
});

describe('3D — more simple seeds (prisms, truncated solids)', () => {
  const realizes = (
    solid: ReturnType<typeof cubeSeed>,
    classOrders: Record<string, number>,
    expectFacets: number,
    expectVerts: number,
  ) => {
    const c = analyzeCombinatorics(geom, seedLorentzNormals(solid, 0.4));
    for (const vf of c.vertexFacets) expect(vf).toHaveLength(3); // simple
    const pr = realizeCoxeterPolyhedron(solid, faceTypeOrder(c, classOrders), { seedInradius: 0.4, skipAndreev: true });
    expect(pr.solve.residualNorm).toBeLessThan(1e-8);
    expect(pr.combinatorics.polytope.facets.length).toBe(expectFacets);
    expect(pr.combinatorics.polytope.vertices.length).toBe(expectVerts);
    return realization3ToGroup(pr.realization);
  };

  it('truncated octahedron (8 hexagons + 6 squares) realizes and tiles', () => {
    const solid = truncatedOctahedronSeed();
    expect(solid.facePlanes).toHaveLength(14);
    const group = realizes(solid, { '6-6': 3 }, 14, 24);
    expect(group.tessellate(1, 100).length).toBeGreaterThan(1);
  });

  it('truncated tetrahedron (4 hexagons + 4 triangles) realizes', () => {
    const solid = truncatedTetrahedronSeed();
    expect(solid.facePlanes).toHaveLength(8);
    realizes(solid, { '6-6': 4 }, 8, 12);
  });

  it('pentagonal prism realizes (rim π/2, vertical π/3)', () => {
    realizes(prismSeed(5), { '4-5': 3 }, 7, 10);
  });

  it('hexagonal prism realizes', () => {
    realizes(prismSeed(6), { '4-6': 3 }, 8, 12);
  });
});
