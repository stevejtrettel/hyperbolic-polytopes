import { describe, it, expect } from 'vitest';
import {
  buildCanonicalCoxeterPolygon,
  buildCanonicalPolygonFromAngles,
  canonicalPolygonRealization,
} from '../src/coxeter/canonicalPolygon';
import { regularPolygonGram, triangleGram } from '../src/coxeter/gram';
import { realize } from '../src/coxeter/realize';

const TOL = 1e-10;

/** ⟨a,b⟩ in the module's (x,y,t) convention. */
function dot(a: readonly number[], b: readonly number[]): number {
  return a[0] * b[0] + a[1] * b[1] - a[2] * b[2];
}

describe('canonical polygon — Porti minimum-perimeter realization', () => {
  it('recovers the regular right-angled pentagon', () => {
    const poly = buildCanonicalCoxeterPolygon([2, 2, 2, 2, 2]);
    const phi = (1 + Math.sqrt(5)) / 2;
    const expectedT = Math.SQRT2 * Math.sin(Math.PI / 5);

    expect(poly.sechInradius).toBeCloseTo(expectedT, 12);
    for (let i = 0; i < 5; i++) {
      expect(poly.normalGaps[i]).toBeCloseTo((2 * Math.PI) / 5, 12);
      expect(poly.gram[i][(i + 1) % 5]).toBeCloseTo(0, 12); // right angles
      expect(poly.gram[i][(i + 2) % 5]).toBeCloseTo(-phi, 12); // ultraparallel
    }
  });

  it('constructs the canonical (2,3,7) triangle with the prescribed angles', () => {
    const poly = buildCanonicalCoxeterPolygon([2, 3, 7]);
    expect(poly.gram[0][1]).toBeCloseTo(-Math.cos(Math.PI / 2), 12);
    expect(poly.gram[1][2]).toBeCloseTo(-Math.cos(Math.PI / 3), 12);
    expect(poly.gram[2][0]).toBeCloseTo(-Math.cos(Math.PI / 7), 12);
  });

  it('satisfies all geometric invariants (asymmetric pentagon)', () => {
    const poly = buildCanonicalCoxeterPolygon([2, 2, 2, 3, 5]);
    const d = poly.diagnostics;
    expect(Math.abs(d.closureError)).toBeLessThan(TOL);
    expect(d.maxNormalNormError).toBeLessThan(TOL);
    expect(d.maxAdjacentGramError).toBeLessThan(TOL);
    expect(d.maxVertexIncidenceError).toBeLessThan(TOL);
    expect(d.maxHalfSpaceViolation).toBeLessThan(TOL); // every vertex in every half-space
    expect(d.maxReflectionInvolutionError).toBeLessThan(TOL);
    expect(d.maxLorentzIsometryError).toBeLessThan(TOL);
  });

  it('places all walls at the same distance from the incenter (incircle)', () => {
    const poly = buildCanonicalCoxeterPolygon([2, 2, 2, 3, 5]);
    const o: [number, number, number] = [0, 0, 1]; // incenter in (x,y,t)
    const sinhR = Math.sqrt((1 - poly.sechInradius) * (1 + poly.sechInradius)) / poly.sechInradius;
    for (const e of poly.normals) {
      expect(dot(o, e)).toBeCloseTo(-sinhR, 10); // d(o, H_i) = r for every wall
    }
  });

  it('rejects non-hyperbolic angle data', () => {
    // Euclidean square: Σ(π − β) = 2π exactly, not > 2π.
    expect(() => buildCanonicalPolygonFromAngles([Math.PI / 2, Math.PI / 2, Math.PI / 2, Math.PI / 2])).toThrow();
  });

  it('rejects invalid Coxeter orders', () => {
    expect(() => buildCanonicalCoxeterPolygon([2, 2, 1, 3, 5])).toThrow();
    expect(() => buildCanonicalCoxeterPolygon([2, 2, 2.5, 3, 5])).toThrow();
  });

  it('cross-checks the perimeter two independent ways', () => {
    const orders = [2, 2, 2, 3, 5];
    const poly = buildCanonicalCoxeterPolygon(orders);
    const r = poly.inradius;
    const viaIncircle =
      2 *
      poly.angles.reduce((s, beta) => s + Math.asinh(Math.tanh(r) * (Math.cos(beta / 2) / Math.sin(beta / 2))), 0);
    expect(poly.perimeter).toBeCloseTo(viaIncircle, 10);
  });

  it('is cyclic-equivariant: shifting angles permutes the Gram matrix', () => {
    const base = buildCanonicalCoxeterPolygon([2, 2, 2, 3, 5]);
    const shifted = buildCanonicalCoxeterPolygon([5, 2, 2, 2, 3]); // rotate right by 1
    const n = 5;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        // shifted index k corresponds to base index k-1.
        expect(shifted.gram[(i + 1) % n][(j + 1) % n]).toBeCloseTo(base.gram[i][j], 10);
      }
    }
  });

  it('is reversal-equivariant on the pairwise Gram data', () => {
    const base = buildCanonicalCoxeterPolygon([2, 3, 4, 5, 6]);
    // Reversing the angle list reverses the mirror order. β_i (between i,i+1)
    // becomes the angle between reversed mirrors; the consistent reversal of the
    // ADJACENT-order list is reverse-then-rotate. Compare via the multiset of
    // off-diagonal Gram values, which is isometry- and relabeling-invariant.
    const rev = buildCanonicalCoxeterPolygon([6, 5, 4, 3, 2]);
    const offdiag = (g: readonly (readonly number[])[]) => {
      const xs: number[] = [];
      for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) xs.push(g[i][j]);
      return xs.sort((a, b) => a - b);
    };
    const a = offdiag(base.gram);
    const b = offdiag(rev.gram);
    for (let i = 0; i < a.length; i++) expect(b[i]).toBeCloseTo(a[i], 10);
  });
});

describe('canonical polygon — cross-checks against existing closed forms', () => {
  it('regular polygon Gram matches regularPolygonGram up to relabeling', () => {
    // Regular hexagon with right-angled vertices: all adjacent orders = 4? No —
    // regularPolygonGram(p,k) is the regular p-gon with vertex angle π/k.
    const p = 6;
    const k = 4;
    const porti = buildCanonicalCoxeterPolygon(new Array(p).fill(k));
    const closed = regularPolygonGram(p, k);
    // Both are regular: compare the sorted off-diagonal value multisets.
    const sortedOff = (g: number[][] | readonly (readonly number[])[]) => {
      const xs: number[] = [];
      for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) xs.push(g[i][j]);
      return xs.sort((a, b) => a - b);
    };
    const a = sortedOff(porti.gram);
    const b = sortedOff(closed);
    for (let i = 0; i < a.length; i++) expect(b[i]).toBeCloseTo(a[i], 10);
  });

  it('triangle Gram matches triangleGram exactly (no moduli)', () => {
    const porti = buildCanonicalCoxeterPolygon([2, 3, 7]);
    // triangleGram(p,q,r): walls 0-1 at π/p, 1-2 at π/q, 0-2 at π/r.
    // Porti orders [m0,m1,m2] = angles at v0(=H0∩H1), v1(=H1∩H2), v2(=H2∩H0).
    const closed = triangleGram(2, 3, 7);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) expect(porti.gram[i][j]).toBeCloseTo(closed[i][j], 10);
  });
});

describe('canonical polygon — realization bridge', () => {
  it('produces a valid H² realization with the right signature', () => {
    const r = canonicalPolygonRealization([2, 2, 2, 3, 5]);
    expect(r.dim).toBe(2);
    expect(r.signature).toEqual({ pos: 2, neg: 1, zero: 2 });
    // Normals are unit spacelike in the project (t,x,y) form ⟨a,b⟩ = -t² + x² + y².
    const mink = (a: number[], b: number[]) => -a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    for (const nrm of r.normals) expect(mink(nrm, nrm)).toBeCloseTo(1, 10);
    // Interior is the future-pointing incenter on the hyperboloid.
    expect(mink(r.interior, r.interior)).toBeCloseTo(-1, 10);
    expect(r.interior[0]).toBeGreaterThan(0);
    // Interior lies inside every half-space ⟨interior, n_i⟩ ≤ 0.
    for (const nrm of r.normals) expect(mink(r.interior, nrm)).toBeLessThan(TOL);
  });

  it('agrees with feeding the Gram through the generic realize()', () => {
    const orders = [2, 2, 2, 3, 5];
    const poly = buildCanonicalCoxeterPolygon(orders);
    const viaGram = realize(poly.gram);
    expect(viaGram.dim).toBe(2);
    expect(viaGram.signature).toEqual({ pos: 2, neg: 1, zero: 2 });
    // Both routes give a Gram of the same signature; the direct bridge reproduces
    // the input Gram exactly (it never re-diagonalizes).
    const direct = canonicalPolygonRealization(orders);
    const mink = (a: number[], b: number[]) => -a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    for (let i = 0; i < orders.length; i++)
      for (let j = 0; j < orders.length; j++)
        expect(mink(direct.normals[i], direct.normals[j])).toBeCloseTo(poly.gram[i][j], 10);
  });
});
