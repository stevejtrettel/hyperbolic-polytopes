import { describe, it, expect } from 'vitest';
import { buildCoxeterGroup2 } from '../src/coxeter/CoxeterGroup';
import { triangleGram } from '../src/coxeter/gram';

describe('cayleyGraph', () => {
  const g = buildCoxeterGroup2(triangleGram(2, 3, 7));

  it('radius 0 is a single node, no edges', () => {
    const graph = g.cayleyGraph(0);
    expect(graph.nodes.length).toBe(1);
    expect(graph.edges.length).toBe(0);
  });

  it('radius 1 is the identity joined to each generator (a star)', () => {
    const graph = g.cayleyGraph(1);
    expect(graph.nodes.length).toBe(4); // identity + 3 generators
    expect(graph.edges.length).toBe(3);
    expect(graph.edges.map((e) => e.generator).sort()).toEqual([0, 1, 2]);
    // every edge joins the identity (node 0) to a generator node
    expect(graph.edges.every((e) => e.a === 0 && e.b > 0)).toBe(true);
  });

  it('nodes are distinct and edges reference valid nodes', () => {
    const graph = g.cayleyGraph(3);
    expect(new Set(graph.nodes.map((n) => n.key)).size).toBe(graph.nodes.length);
    for (const e of graph.edges) {
      expect(e.a).toBeGreaterThanOrEqual(0);
      expect(e.b).toBeLessThan(graph.nodes.length);
      expect(e.a).toBeLessThan(e.b); // each undirected edge recorded once
      expect(e.generator).toBeGreaterThanOrEqual(0);
      expect(e.generator).toBeLessThan(g.rank);
    }
  });
});

describe('subgroup', () => {
  const g = buildCoxeterGroup2(triangleGram(2, 3, 7)); // m₀₁ = 2, m₁₂ = 3, m₀₂ = 7

  it('the parabolic ⟨R_i, R_j⟩ is the dihedral group of order 2·m_ij', () => {
    expect(g.subgroup([g.reflect(0)]).length).toBe(2); // ⟨R₀⟩
    expect(g.subgroup([g.reflect(0), g.reflect(1)]).length).toBe(4); // m₀₁ = 2 → order 4
    expect(g.subgroup([g.reflect(1), g.reflect(2)]).length).toBe(6); // m₁₂ = 3 → order 6
    expect(g.subgroup([g.reflect(0), g.reflect(2)]).length).toBe(14); // m₀₂ = 7 → order 14
  });

  it('respects the count cap for an infinite subgroup (the whole group)', () => {
    const all = g.subgroup([g.reflect(0), g.reflect(1), g.reflect(2)], 500);
    expect(all.length).toBeLessThanOrEqual(500);
    expect(all.length).toBeGreaterThan(100); // it really is generating a lot
  });
});

describe('basePoint', () => {
  it('is a point of the hyperboloid, strictly inside every wall', () => {
    const g = buildCoxeterGroup2(triangleGram(2, 3, 7));
    const p = g.basePoint();
    expect(g.geom.form(p, p)).toBeCloseTo(-1, 6); // on the hyperboloid
    for (const wall of g.mirrors) expect(wall.side(p)).toBeLessThan(-1e-6); // interior
  });
});
