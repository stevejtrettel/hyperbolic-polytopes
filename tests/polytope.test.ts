import { describe, it, expect } from 'vitest';
import { Vector3, Vector4 } from 'three';
import { Hyperbolic2 } from '../src/geometry/Hyperbolic2';
import { Hyperbolic3 } from '../src/geometry/Hyperbolic3';
import { fromVertices2, fromVertices3, fromHalfspaces3 } from '../src/polytope/build';

const h2 = new Hyperbolic2(-1);
const h3 = new Hyperbolic3(-1);

/** Exp a tangent direction out of the origin to radius r (H²). */
function v2(dir: [number, number], r: number): Vector3 {
  return h2.exp(h2.origin(), new Vector3(0, dir[0], dir[1]), r);
}
/** Exp a tangent direction out of the origin to radius r (H³). */
function v3(dir: [number, number, number], r: number): Vector4 {
  return h3.exp(h3.origin(), new Vector4(0, dir[0], dir[1], dir[2]), r);
}

describe('H² polygons (fromVertices2)', () => {
  it('a regular hyperbolic square has 4 vertices, 4 edges, 4 facets', () => {
    const pts = [
      v2([1, 0], 0.8), v2([0, 1], 0.8), v2([-1, 0], 0.8), v2([0, -1], 0.8),
    ];
    const p = fromVertices2(h2, pts);
    expect(p.vertices.length).toBe(4);
    expect(p.edges.length).toBe(4);
    expect(p.facets.length).toBe(4);
  });

  it('drops interior points from the hull', () => {
    const pts = [
      v2([1, 0], 0.8), v2([0, 1], 0.8), v2([-1, 0], 0.8), v2([0, -1], 0.8),
      h2.origin(), // strictly interior — must not become a vertex
    ];
    const p = fromVertices2(h2, pts);
    expect(p.vertices.length).toBe(4);
  });
});

describe('H³ polytopes (fromVertices3)', () => {
  it('a hyperbolic tetrahedron: 4 vertices, 6 edges, 4 triangular faces', () => {
    const pts = [
      v3([1, 1, 1], 0.7), v3([1, -1, -1], 0.7), v3([-1, 1, -1], 0.7), v3([-1, -1, 1], 0.7),
    ];
    const p = fromVertices3(h3, pts);
    expect(p.vertices.length).toBe(4);
    expect(p.edges.length).toBe(6);
    expect(p.faces.length).toBe(4);
    expect(p.faces.every((f) => f.loop.length === 3)).toBe(true);
  });

  it('a hyperbolic cube: 8 vertices, 12 edges, 6 quadrilateral faces (coplanar merge)', () => {
    const pts: Vector4[] = [];
    for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1]) {
      pts.push(v3([sx, sy, sz], 0.6));
    }
    const p = fromVertices3(h3, pts);
    expect(p.vertices.length).toBe(8);
    expect(p.edges.length).toBe(12);
    expect(p.faces.length).toBe(6);
    expect(p.faces.every((f) => f.loop.length === 4)).toBe(true);
  });

  it('a hyperbolic octahedron (non-simple): 6 vertices, 12 edges, 8 faces', () => {
    const pts = [
      v3([1, 0, 0], 0.7), v3([-1, 0, 0], 0.7),
      v3([0, 1, 0], 0.7), v3([0, -1, 0], 0.7),
      v3([0, 0, 1], 0.7), v3([0, 0, -1], 0.7),
    ];
    const p = fromVertices3(h3, pts);
    expect(p.vertices.length).toBe(6);
    expect(p.edges.length).toBe(12);
    expect(p.faces.length).toBe(8);
  });

  it('H-representation round-trip: cube facets rebuild the cube', () => {
    const pts: Vector4[] = [];
    for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1]) {
      pts.push(v3([sx, sy, sz], 0.6));
    }
    const cube = fromVertices3(h3, pts);
    const rebuilt = fromHalfspaces3(h3, cube.facets);
    expect(rebuilt.vertices.length).toBe(8);
    expect(rebuilt.edges.length).toBe(12);
    expect(rebuilt.faces.length).toBe(6);
  });
});

describe('hyperboloid invariants', () => {
  it('vertices lie on the hyperboloid ⟨v,v⟩ = -1', () => {
    const p = fromVertices3(h3, [
      v3([1, 1, 1], 0.7), v3([1, -1, -1], 0.7), v3([-1, 1, -1], 0.7), v3([-1, -1, 1], 0.7),
    ]);
    for (const v of p.vertices) expect(h3.form(v, v)).toBeCloseTo(-1, 6);
  });
});
