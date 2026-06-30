import { describe, it, expect } from 'vitest';
import { coxeterMatrixToPairData, pairOrder, type CoxeterMatrixEntry } from '../src/coxeter/pairData';
import { interpretCompactPolygon } from '../src/coxeter/polygonSpec';
import { buildCanonicalCoxeterGroup2 } from '../src/coxeter/CoxeterGroup';

const INF: CoxeterMatrixEntry = 'infinity';

/** A 5-cycle Coxeter matrix with adjacent orders [m01,m12,m23,m34,m40]. */
function cyclePentagonMatrix(m: [number, number, number, number, number]): CoxeterMatrixEntry[][] {
  const M: CoxeterMatrixEntry[][] = Array.from({ length: 5 }, (_, i) =>
    Array.from({ length: 5 }, (_, j) => (i === j ? 1 : INF)),
  );
  const set = (i: number, j: number, v: number) => {
    M[i][j] = v;
    M[j][i] = v;
  };
  set(0, 1, m[0]);
  set(1, 2, m[1]);
  set(2, 3, m[2]);
  set(3, 4, m[3]);
  set(4, 0, m[4]);
  return M;
}

describe('coxeterMatrixToPairData', () => {
  it('normalizes a matrix into complete pair data', () => {
    const data = coxeterMatrixToPairData(cyclePentagonMatrix([2, 2, 2, 3, 5]));
    expect(data.generators).toEqual(['s0', 's1', 's2', 's3', 's4']);
    expect(data.relations).toHaveLength((5 * 4) / 2); // one per unordered pair
    expect(pairOrder(data, 's3', 's4')).toBe(3);
    expect(pairOrder(data, 's0', 's2')).toBe('infinity');
  });

  it('honors custom generator names', () => {
    const data = coxeterMatrixToPairData(
      [
        [1, 3, 7],
        [3, 1, 2],
        [7, 2, 1],
      ],
      ['a', 'b', 'c'],
    );
    expect(pairOrder(data, 'a', 'b')).toBe(3);
    expect(pairOrder(data, 'a', 'c')).toBe(7);
    expect(pairOrder(data, 'b', 'c')).toBe(2);
  });

  it('rejects malformed matrices', () => {
    expect(() => coxeterMatrixToPairData([[1, 2], [2, 1, 2]])).toThrow(); // non-square
    expect(() => coxeterMatrixToPairData([[1, 2], [3, 1]])).toThrow(); // asymmetric
    expect(() => coxeterMatrixToPairData([[2, 2], [2, 2]])).toThrow(); // diagonal ≠ 1
    expect(() => coxeterMatrixToPairData([[1, 1], [1, 1]])).toThrow(); // order < 2
  });
});

describe('interpretCompactPolygon', () => {
  it('recovers the cyclic side order and adjacent orders', () => {
    const data = coxeterMatrixToPairData(cyclePentagonMatrix([2, 2, 2, 3, 5]));
    const spec = interpretCompactPolygon(data);
    expect(spec.sideGenerators).toEqual(['s0', 's1', 's2', 's3', 's4']);
    expect(spec.orders).toEqual([2, 2, 2, 3, 5]);
  });

  it('canonicalizes independent of the matrix ordering (rotation/reversal)', () => {
    // Same labeled cycle, but presented rotated: relabel walls by a shift.
    const data = coxeterMatrixToPairData(cyclePentagonMatrix([3, 5, 2, 2, 2]));
    const spec = interpretCompactPolygon(data);
    // Canonical lead is s0; the multiset of orders is preserved.
    expect(spec.sideGenerators[0]).toBe('s0');
    expect([...spec.orders].sort()).toEqual([2, 2, 2, 3, 5]);
  });

  it('handles a triangle (K3 finite-relation graph)', () => {
    const data = coxeterMatrixToPairData([
      [1, 2, 3],
      [2, 1, 7],
      [3, 7, 1],
    ]);
    const spec = interpretCompactPolygon(data);
    expect(spec.sideGenerators).toHaveLength(3);
    expect([...spec.orders].sort()).toEqual([2, 3, 7]);
  });

  it('rejects a finite-relation graph that is not a cycle', () => {
    // A path s0-s1-s2 (one wall has degree 1): not a polygon.
    const data = coxeterMatrixToPairData([
      [1, 3, INF],
      [3, 1, 3],
      [INF, 3, 1],
    ]);
    expect(() => interpretCompactPolygon(data)).toThrow(/not a cycle/);
  });

  it('rejects non-hyperbolic angle data', () => {
    // Euclidean square: orders [4,4,4,4], Σ 1/m = 1 = n − 2 = 2? No: n=4, n−2=2, Σ=1 < 2 → hyperbolic.
    // A genuinely non-hyperbolic 4-gon: [2,2,2,2] gives Σ = 2 = n − 2 (Euclidean, rejected).
    const M: CoxeterMatrixEntry[][] = [
      [1, 2, INF, 2],
      [2, 1, 2, INF],
      [INF, 2, 1, 2],
      [2, INF, 2, 1],
    ];
    const data = coxeterMatrixToPairData(M);
    expect(() => interpretCompactPolygon(data)).toThrow(/not hyperbolic/);
  });
});

describe('buildCanonicalCoxeterGroup2 — end to end', () => {
  it('tessellates and builds a Cayley graph for a (2,2,2,3,5) pentagon', () => {
    const group = buildCanonicalCoxeterGroup2([2, 2, 2, 3, 5]);
    expect(group.rank).toBe(5);

    const domain = group.fundamentalDomain();
    expect(domain.vertices.length).toBe(5); // a pentagon

    const tiles = group.tessellate(3);
    expect(tiles.length).toBeGreaterThan(1);
    // Distinct elements give distinct tiles (free action on chambers).
    const keys = new Set(tiles.map((t) => t.word.join(',')));
    expect(keys.size).toBe(tiles.length);

    const cayley = group.cayleyGraph(3);
    expect(cayley.nodes.length).toBe(tiles.length);
    expect(cayley.edges.length).toBeGreaterThan(0);
  });

  it('flows pair data → spec → group', () => {
    const data = coxeterMatrixToPairData(cyclePentagonMatrix([2, 2, 2, 3, 5]));
    const spec = interpretCompactPolygon(data);
    const group = buildCanonicalCoxeterGroup2(spec.orders);
    expect(group.rank).toBe(5);
    expect(group.fundamentalDomain().vertices.length).toBe(5);
  });
});
