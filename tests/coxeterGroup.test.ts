import { describe, it, expect } from 'vitest';
import { buildCoxeterGroup2, buildCoxeterGroup3 } from '../src/coxeter/CoxeterGroup';
import { triangleGram, pathGram } from '../src/coxeter/gram';
import { matrixKey } from '../src/group/orbit';

describe('CoxeterGroup: the representation', () => {
  const g237 = buildCoxeterGroup2(triangleGram(2, 3, 7));

  it('has one generating reflection per wall', () => {
    expect(g237.rank).toBe(3);
    expect(g237.reflections.length).toBe(3);
    expect(g237.mirrors.length).toBe(3);
    expect(g237.signature).toEqual({ pos: 2, neg: 1, zero: 0 });
  });

  it('builds the fundamental domain (chamber) from the mirrors', () => {
    const dom = g237.fundamentalDomain();
    expect(dom.vertices.length).toBe(3);
    expect(dom.edges.length).toBe(3);
  });

  it('word([]) is the identity, word([i]) is reflection i, word([i,i]) is the identity', () => {
    const id = matrixKey(g237.geom.identity());
    expect(matrixKey(g237.word([]))).toBe(id);
    expect(matrixKey(g237.word([0]))).toBe(matrixKey(g237.reflect(0)));
    expect(matrixKey(g237.word([1, 1]))).toBe(id); // R_1² = 1
  });
});

describe('CoxeterGroup: the orbit (group action)', () => {
  const g237 = buildCoxeterGroup2(triangleGram(2, 3, 7));

  it('enumerates words ≤ N, deduplicated', () => {
    expect(g237.orbit(0).length).toBe(1); // identity only
    expect(g237.orbit(1).length).toBe(4); // 1 + 3 generators
    // depth 2: the m₀₁ = 2 relation collapses R₀R₁ = R₁R₀, so 4 + 5 = 9.
    expect(g237.orbit(2).length).toBe(9);
    // all returned elements are distinct
    const keys = new Set(g237.orbit(2).map((e) => matrixKey(e.element)));
    expect(keys.size).toBe(9);
  });

  it('respects the word-count cap', () => {
    expect(g237.orbit(6, 20).length).toBeLessThanOrEqual(20);
  });

  it('tessellates: carries the chamber to one distinct tile per element', () => {
    const tiles = g237.tessellate(1);
    expect(tiles.length).toBe(4);
    for (const t of tiles) expect(t.polytope.vertices.length).toBe(3); // each tile is a triangle
    // the depth-0 tile is the fundamental domain itself
    expect(tiles.filter((t) => t.depth === 0).length).toBe(1);
  });
});

describe('CoxeterPolytope + group.neighbor', () => {
  const g237 = buildCoxeterGroup2(triangleGram(2, 3, 7));
  const dist = (a: { clone(): any }, b: any): number => a.clone().sub(b).length();

  it('image bundles polytope + word + element, with depth = word length', () => {
    const t = g237.image([1, 0]);
    expect(t.word).toEqual([1, 0]);
    expect(t.depth).toBe(2);
    expect(t.polytope.vertices.length).toBe(3);
    // the cached element matches recomputing the word
    expect(matrixKey(t.element)).toBe(matrixKey(g237.word([1, 0])));
  });

  it('neighbor across wall i: F → word [i], and twice across the same wall returns to F', () => {
    const fd = g237.image([]); // the fundamental domain (word [])
    const n0 = g237.neighbor(fd, 0);
    expect(n0.word).toEqual([0]);
    expect(matrixKey(n0.element)).toBe(matrixKey(g237.reflect(0)));

    const back = g237.neighbor(n0, 0); // reflect back across the shared wall
    for (let i = 0; i < fd.polytope.vertices.length; i++) {
      expect(dist(back.polytope.vertices[i], fd.polytope.vertices[i])).toBeLessThan(1e-9);
    }
  });
});

describe('CoxeterGroup in H³', () => {
  it('[3,5,3] gives a rank-4 group whose chamber is a tetrahedron', () => {
    const g = buildCoxeterGroup3(pathGram([3, 5, 3]));
    expect(g.rank).toBe(4);
    expect(g.signature).toEqual({ pos: 3, neg: 1, zero: 0 });
    const dom = g.fundamentalDomain();
    expect(dom.vertices.length).toBe(4);
    expect(dom.faces.length).toBe(4);
    expect(g.orbit(1).length).toBe(5); // 1 + 4 generators
  });
});
