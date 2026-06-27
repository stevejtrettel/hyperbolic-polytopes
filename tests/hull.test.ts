import { describe, it, expect } from 'vitest';
import { buildCoxeterGroup2, buildCoxeterGroup3 } from '../src/coxeter/CoxeterGroup';
import { triangleGram, pathGram } from '../src/coxeter/gram';
import { hullOfPolytopes2, hullOfPolytopes3 } from '../src/polytope/build';

const EPS = 1e-6;

describe('hullOfPolytopes (convex hull of a union)', () => {
  it('the hull of a single polytope is that polytope', () => {
    const g = buildCoxeterGroup2(triangleGram(2, 3, 7));
    const hull = hullOfPolytopes2(g.geom, [g.fundamentalDomain()]);
    expect(hull.vertices.length).toBe(3);
  });

  it('H²: the hull of a tile and its neighbor contains every input vertex', () => {
    const g = buildCoxeterGroup2(triangleGram(2, 3, 7));
    const a = g.image([]);
    // Reflect across wall 2 (angles π/7, π/3 — neither a right angle). Across a
    // right-angle wall the reflected apex would land collinearly and the union
    // would fuse into a single triangle; across this wall it's a genuine kite.
    const b = g.neighbor(a, 2);
    const hull = hullOfPolytopes2(g.geom, [a.polytope, b.polytope]);
    const inputs = [...a.polytope.vertices, ...b.polytope.vertices];
    for (const v of inputs) expect(hull.facets.every((f) => f.side(v) <= EPS)).toBe(true);
    expect(hull.vertices.length).toBe(4); // two triangles across a shared edge → a quadrilateral
  });

  it('H³: the hull of a tetrahedron and its neighbor contains every input vertex', () => {
    const g = buildCoxeterGroup3(pathGram([3, 5, 3]));
    const a = g.image([]);
    const b = g.neighbor(a, 0);
    const hull = hullOfPolytopes3(g.geom, [a.polytope, b.polytope]);
    const inputs = [...a.polytope.vertices, ...b.polytope.vertices];
    for (const v of inputs) expect(hull.facets.every((f) => f.side(v) <= EPS)).toBe(true);
    expect(hull.vertices.length).toBeGreaterThanOrEqual(4);
  });
});
