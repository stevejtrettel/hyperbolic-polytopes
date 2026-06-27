import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { buildCoxeterGroup2 } from '../src/coxeter/CoxeterGroup';
import { triangleGram } from '../src/coxeter/gram';
import { parseWords } from '../src/coxeter/words';

const dist = (a: { clone(): any }, b: any): number => a.clone().sub(b).length();

describe('word: left-to-right convention', () => {
  const g = buildCoxeterGroup2(triangleGram(2, 3, 7));

  it('word([0,1]) applies generator 0 first, then 1', () => {
    const p = g.geom.normalize(new Vector3(1.5, 0.4, 0.2));
    const viaWord = g.geom.apply(g.word([0, 1]), p);
    const viaReflect = g.mirrors[1].reflect(g.mirrors[0].reflect(p)); // R₁ ∘ R₀  (0 first)
    expect(dist(viaWord, viaReflect)).toBeLessThan(1e-9);
  });

  it('word([]) is the identity, word([i,i]) is the identity', () => {
    const p = g.geom.normalize(new Vector3(1.5, 0.4, 0.2));
    expect(dist(g.geom.apply(g.word([]), p), p)).toBeLessThan(1e-12);
    expect(dist(g.geom.apply(g.word([2, 2]), p), p)).toBeLessThan(1e-9);
  });
});

describe('image / images', () => {
  const g = buildCoxeterGroup2(triangleGram(2, 3, 7));

  it('image([]) is the fundamental domain', () => {
    const fd = g.fundamentalDomain();
    const img = g.image([]).polytope;
    for (let i = 0; i < fd.vertices.length; i++) expect(dist(img.vertices[i], fd.vertices[i])).toBeLessThan(1e-9);
  });

  it('image([0,0]) is the fundamental domain (R₀ is an involution)', () => {
    const fd = g.fundamentalDomain();
    const img = g.image([0, 0]).polytope;
    for (let i = 0; i < fd.vertices.length; i++) expect(dist(img.vertices[i], fd.vertices[i])).toBeLessThan(1e-9);
  });

  it('images carries each tile with its word', () => {
    const out = g.images([[], [0], [1, 0]]);
    expect(out.map((o) => o.word)).toEqual([[], [0], [1, 0]]);
    expect(out.every((o) => o.polytope.vertices.length === 3)).toBe(true);
  });
});

describe('parseWords', () => {
  it('parses integer lists, comments, blanks, and the identity token', () => {
    const text = '# a comment\n0 1\n\n2,0\ne\n1,2,1\n';
    expect(parseWords(text, 3)).toEqual([[0, 1], [2, 0], [], [1, 2, 1]]);
  });

  it('skips words referencing a generator outside the group', () => {
    const text = '0 1\n0 5\n2';
    expect(parseWords(text, 3)).toEqual([[0, 1], [2]]); // "0 5" skipped (5 ≥ 3)
  });

  it('throws on a non-integer token', () => {
    expect(() => parseWords('0 x 1', 3)).toThrow(/generator indices/);
  });
});
