import { describe, it, expect } from 'vitest';
import { triangleGram, pathGram } from '../src/coxeter/gram';
import { buildCoxeterGroup2, buildCoxeterGroup3 } from '../src/coxeter/CoxeterGroup';
import { wythoffPoint, wythoffTessellation } from '../src/coxeter/wythoff';

describe('Wythoff construction', () => {
  const g = buildCoxeterGroup2(triangleGram(2, 3, 7));
  const form = (a: import('three').Vector3, b: import('three').Vector3) => g.geom.form(a, b);

  it('seed lies on the unringed mirrors, off the ringed ones, on the hyperboloid', () => {
    const p = wythoffPoint(g, [true, false, false]);
    expect(form(p, p)).toBeCloseTo(-1, 9); // on H²
    expect(form(p, g.mirrors[0].normal)).toBeLessThan(-1e-6); // off the ringed mirror
    expect(form(p, g.mirrors[1].normal)).toBeCloseTo(0, 9); // on the unringed mirrors
    expect(form(p, g.mirrors[2].normal)).toBeCloseTo(0, 9);
  });

  it('requires at least one ringed node', () => {
    expect(() => wythoffPoint(g, [false, false, false])).toThrow(/ringed/);
    expect(() => wythoffPoint(g, [true, false])).toThrow(/rank/);
  });

  it('tessellates uniform tiles (cells) as real on-shell polytopes', () => {
    const cells = wythoffTessellation(g, [true, false, false], 5, 1000);
    expect(cells.length).toBeGreaterThan(1);
    for (const c of cells) {
      expect(c.polytope.vertices.length).toBeGreaterThanOrEqual(3); // a polygon tile
      for (const v of c.polytope.vertices) expect(form(v, v)).toBeCloseTo(-1, 6);
    }
  });

  it('distinct cells are deduped (no two share a centroid)', () => {
    const cells = wythoffTessellation(g, [true, true, true], 4, 1000);
    const centroidKey = (c: (typeof cells)[number]) => {
      let s = c.polytope.vertices[0].clone().multiplyScalar(0);
      for (const v of c.polytope.vertices) s = s.addScaledVector(v, 1);
      s = g.geom.normalize(s);
      return g.mirrors.map((m) => Math.round(form(s, m.normal) * 1e5) / 1e5).join(',');
    };
    const keys = new Set(cells.map(centroidKey));
    expect(keys.size).toBe(cells.length);
  });

  it('works in H³: a tetrahedral group tessellates uniform polyhedral cells', () => {
    const g3 = buildCoxeterGroup3(pathGram([5, 3, 4]));
    const form3 = (a: import('three').Vector4, b: import('three').Vector4) => g3.geom.form(a, b);
    const cells = wythoffTessellation(g3, [true, false, false, false], 3, 300);
    expect(cells.length).toBeGreaterThan(1);
    for (const c of cells) {
      expect(c.polytope.vertices.length).toBeGreaterThanOrEqual(4); // a polyhedral cell
      expect(c.polytope.faces.length).toBeGreaterThanOrEqual(4);
      for (const v of c.polytope.vertices) expect(form3(v, v)).toBeCloseTo(-1, 5);
    }
  });
});
