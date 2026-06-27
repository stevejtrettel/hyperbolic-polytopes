import { describe, it, expect } from 'vitest';
import { Vector3, Matrix3 } from 'three';
import { symmetricEig } from '../src/math/symmetricEig';
import { triangleGram, pathGram, gramFromLabels, regularPolygonGram, rightAngledDodecahedronGram } from '../src/coxeter/gram';
import { realize, directRepresentation } from '../src/coxeter/realize';
import { buildCoxeterGroup2, buildCoxeterGroup3 } from '../src/coxeter/CoxeterGroup';
import { mink3 } from '../src/math/minkowski';

describe('symmetricEig (Jacobi)', () => {
  it('reconstructs a symmetric matrix and returns orthonormal eigenvectors', () => {
    const A = [
      [2, -1, 0],
      [-1, 2, -1],
      [0, -1, 2],
    ];
    const { values, vectors } = symmetricEig(A);
    // Reconstruct A = Σ λ_k v_k v_kᵀ.
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let s = 0;
        for (let k = 0; k < 3; k++) s += values[k] * vectors[k][i] * vectors[k][j];
        expect(s).toBeCloseTo(A[i][j], 9);
      }
    }
    // Eigenvectors orthonormal.
    for (let a = 0; a < 3; a++) {
      for (let b = 0; b < 3; b++) {
        const dot = vectors[a][0] * vectors[b][0] + vectors[a][1] * vectors[b][1] + vectors[a][2] * vectors[b][2];
        expect(dot).toBeCloseTo(a === b ? 1 : 0, 9);
      }
    }
  });
});

describe('realize: signature detection', () => {
  it('(2,3,7) triangle is hyperbolic: signature (2,1)', () => {
    const r = realize(triangleGram(2, 3, 7));
    expect(r.signature).toEqual({ pos: 2, neg: 1, zero: 0 });
    expect(r.dim).toBe(2);
  });

  it('rejects a spherical Coxeter group (no negative direction)', () => {
    // (2,3,5) is the spherical icosahedral triangle — positive definite Gram.
    expect(() => realize(triangleGram(2, 3, 5))).toThrow(/spherical|Euclidean/i);
  });

  it('realized normals reproduce the Gram matrix under the Minkowski form', () => {
    const G = triangleGram(2, 3, 7);
    const r = realize(G);
    const vecs = r.normals.map((c) => new Vector3(c[0], c[1], c[2]));
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(mink3(vecs[i], vecs[j])).toBeCloseTo(G[i][j], 8);
      }
    }
  });
});

describe('coxeterPolytope2: compact triangles', () => {
  it('(2,3,7) builds a triangle: 3 vertices, 3 edges, all finite', () => {
    const polytope = buildCoxeterGroup2(triangleGram(2, 3, 7)).fundamentalDomain();
    expect(polytope.vertices.length).toBe(3);
    expect(polytope.edges.length).toBe(3);
    expect(polytope.vertices.every((v) => mink3(v, v) < 0)).toBe(true); // timelike = finite
  });

  it('the generators are Lorentz reflections (RᵀJR = J, R² = I)', () => {
    const generators = buildCoxeterGroup2(triangleGram(2, 3, 7)).reflections;
    const J = new Matrix3().set(-1, 0, 0, 0, 1, 0, 0, 0, 1);
    for (const R of generators) {
      // R² = I
      const sq = R.clone().multiply(R);
      sq.elements.forEach((e, k) => expect(e).toBeCloseTo(k % 4 === 0 ? 1 : 0, 8));
      // RᵀJR = J  (preserves the Minkowski form)
      const Rt = R.clone().transpose();
      const lhs = Rt.multiply(J.clone()).multiply(R);
      lhs.elements.forEach((e, k) => expect(e).toBeCloseTo(J.elements[k], 8));
    }
  });

  it('the product R_iR_j has the dihedral order m_ij', () => {
    const generators = buildCoxeterGroup2(triangleGram(2, 3, 7)).reflections;
    const orders: [number, number, number][] = [[0, 1, 2], [1, 2, 3], [0, 2, 7]];
    const power = (M: Matrix3, m: number): Matrix3 => {
      let acc = new Matrix3();
      for (let k = 0; k < m; k++) acc = acc.multiply(M);
      return acc;
    };
    for (const [i, j, m] of orders) {
      const RR = generators[i].clone().multiply(generators[j]); // R_iR_j
      const id = power(RR, m); // (R_iR_j)^m should be the identity
      id.elements.forEach((e, k) => expect(e).toBeCloseTo(k % 4 === 0 ? 1 : 0, 6));
    }
  });
});

describe('coxeterPolytope3: compact simplex', () => {
  it('[3,5,3] is a compact hyperbolic tetrahedron: 4 V, 6 E, 4 F', () => {
    const group = buildCoxeterGroup3(pathGram([3, 5, 3]));
    const polytope = group.fundamentalDomain();
    const signature = group.signature;
    expect(signature).toEqual({ pos: 3, neg: 1, zero: 0 });
    expect(polytope.vertices.length).toBe(4);
    expect(polytope.edges.length).toBe(6);
    expect(polytope.faces.length).toBe(4);
  });
});

describe('rank-deficient realization (a quadrilateral in H²)', () => {
  it('a 4-wall Gram of rank 3 realizes to H² and reproduces the Gram', () => {
    // Four geodesics at distance a from the origin, normals at 90° apart:
    // n_k = (sinh a, cosh a·cos θ_k, cosh a·sin θ_k), a unit spacelike pole.
    // a < asinh(1) ≈ 0.881 keeps adjacent walls intersecting (a compact square);
    // beyond that the corners go hyperideal and the quadrilateral is non-compact.
    const a = 0.6;
    const dirs = [0, 1, 2, 3].map((k) => (Math.PI / 2) * k);
    const N = dirs.map((t) => new Vector3(Math.sinh(a), Math.cosh(a) * Math.cos(t), Math.cosh(a) * Math.sin(t)));
    const G = N.map((ni) => N.map((nj) => mink3(ni, nj)));

    const r = realize(G);
    expect(r.dim).toBe(2);
    expect(r.signature.zero).toBe(1); // 4 walls, rank 3

    const polytope = buildCoxeterGroup2(G).fundamentalDomain();
    expect(polytope.vertices.length).toBe(4);
    expect(polytope.edges.length).toBe(4);
  });
});

describe('regularPolygonGram (Coxeter polygons)', () => {
  it('right-angled pentagon: 5 rank-3 walls → a pentagon chamber', () => {
    const g = buildCoxeterGroup2(regularPolygonGram(5, 2));
    expect(g.signature).toEqual({ pos: 2, neg: 1, zero: 2 });
    expect(g.fundamentalDomain().vertices.length).toBe(5);
  });

  it('right-angled hexagon → a hexagon chamber', () => {
    const g = buildCoxeterGroup2(regularPolygonGram(6, 2));
    expect(g.fundamentalDomain().vertices.length).toBe(6);
  });

  it('non-right quadrilateral (angle π/3) → a quadrilateral chamber', () => {
    const g = buildCoxeterGroup2(regularPolygonGram(4, 3));
    expect(g.signature).toEqual({ pos: 2, neg: 1, zero: 1 });
    expect(g.fundamentalDomain().vertices.length).toBe(4);
  });
});

describe('rightAngledDodecahedronGram', () => {
  it('12 rank-4 walls → the compact right-angled dodecahedron (20 V, 30 E, 12 F)', () => {
    const g = buildCoxeterGroup3(rightAngledDodecahedronGram());
    expect(g.signature).toEqual({ pos: 3, neg: 1, zero: 8 });
    const dom = g.fundamentalDomain();
    expect(dom.vertices.length).toBe(20);
    expect(dom.edges.length).toBe(30);
    expect(dom.faces.length).toBe(12);
  });
});

describe('directRepresentation', () => {
  it('reflections preserve the Gram form: R_iᵀ G R_i = G', () => {
    const G = triangleGram(2, 3, 7);
    const { reflections } = directRepresentation(G);
    const mul = (A: number[][], B: number[][]) =>
      A.map((row, i) => B[0].map((_, j) => row.reduce((s, _v, k) => s + A[i][k] * B[k][j], 0)));
    const T = (A: number[][]) => A.map((row, i) => row.map((_, j) => A[j][i]));
    for (const R of reflections) {
      const lhs = mul(mul(T(R), G), R);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) expect(lhs[i][j]).toBeCloseTo(G[i][j], 8);
    }
  });

  it('gramFromLabels: perpendicular walls give 0, parallel give -1', () => {
    const G = gramFromLabels([
      [1, 2, Infinity],
      [2, 1, 3],
      [Infinity, 3, 1],
    ]);
    expect(G[0][1]).toBeCloseTo(0, 12); // m = 2 → -cos(π/2) = 0
    expect(G[0][2]).toBeCloseTo(-1, 12); // m = ∞ → -1
    expect(G[1][2]).toBeCloseTo(-0.5, 12); // m = 3 → -cos(π/3) = -1/2
  });
});
