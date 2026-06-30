import { symmetricEig } from '../math/symmetricEig';
import { solveLinear } from '../math/linearSolve';

/**
 * From a Coxeter Gram matrix to a geometric realization on the standard
 * hyperboloid. Two stages, matching the design:
 *
 *  1. directRepresentation(G): the canonical (Tits) representation realized so
 *     the Gram matrix IS the coordinate form — wall normals are the standard
 *     basis e_i, the ambient form is G, and the reflection in wall i is
 *     R_i = I − 2 e_i (row_i G), preserving G. We don't draw this (the form is
 *     not yet standard), but it is the honest starting point.
 *
 *  2. realize(G): diagonalize G (symmetric eig), check the signature is (n,1),
 *     and read off unit spacelike normals n_i in standard Minkowski R^{n,1}.
 *     With G = Q diag(λ) Qᵀ, the normals are the columns of |Λ|^{1/2} Qᵀ:
 *       (n_i)_a = √|λ_a| · (a-th eigenvector)_i,
 *     so that ⟨n_i, n_j⟩_J = G_ij with J the standard form. Zero eigenvalues
 *     (redundant walls of a non-simplex) are dropped; the surviving signature
 *     (#pos, 1) sets the hyperbolic dimension to #pos.
 */

/** The direct representation: the form G itself, and the N×N reflection matrices over it. */
export function directRepresentation(gram: number[][]): { form: number[][]; reflections: number[][][] } {
  const n = gram.length;
  const reflections: number[][][] = [];
  for (let i = 0; i < n; i++) {
    // R_i = I − 2 e_i (row_i G): identity except row i, which becomes e_i − 2·G[i].
    const R: number[][] = Array.from({ length: n }, (_, a) =>
      Array.from({ length: n }, (_, b) => (a === b ? 1 : 0)),
    );
    for (let b = 0; b < n; b++) R[i][b] = (i === b ? 1 : 0) - 2 * gram[i][b];
    reflections.push(R);
  }
  return { form: gram.map((r) => r.slice()), reflections };
}

export interface Realization {
  /** Hyperbolic dimension n = #positive eigenvalues (2 → H², 3 → H³). */
  dim: number;
  signature: { pos: number; neg: number; zero: number };
  /** N unit spacelike normals in standard R^{n,1}, coordinate 0 timelike. Each has length dim+1. */
  normals: number[][];
  /**
   * A point strictly inside the fundamental chamber, in standard R^{n,1} (length
   * dim+1, future-pointing). Hull-independent, so it is well-defined even when the
   * chamber is non-compact (ideal/hyperideal vertices) and the hull is incomplete.
   * Normalize onto the hyperboloid to get the Cayley-graph base point.
   */
  interior: number[];
}

/** Diagonalize the Gram matrix into standard-form normals; throws on a non-hyperbolic signature. */
export function realize(gram: number[][]): Realization {
  const N = gram.length;
  const { values, vectors } = symmetricEig(gram);

  const maxAbs = Math.max(1, ...values.map(Math.abs));
  const tol = 1e-8 * maxAbs;
  const pos: number[] = [];
  const neg: number[] = [];
  const zero: number[] = [];
  values.forEach((v, a) => (v > tol ? pos : v < -tol ? neg : zero).push(a));

  if (neg.length === 0) {
    throw new Error('Gram matrix is positive semidefinite: a spherical/Euclidean Coxeter group, not hyperbolic.');
  }
  if (neg.length > 1) {
    throw new Error(`Gram matrix has signature with ${neg.length} negative directions; not realizable in a hyperbolic space.`);
  }
  const dim = pos.length;
  if (dim !== 2 && dim !== 3) {
    throw new Error(`Only H² (rank 3) and H³ (rank 4) are supported; got rank ${dim + 1}.`);
  }

  // Coordinate axes: the timelike (negative) eigen-direction first, then the spacelike ones.
  const axes = [neg[0], ...pos];
  const normals: number[][] = [];
  for (let i = 0; i < N; i++) {
    normals.push(axes.map((a) => Math.sqrt(Math.abs(values[a])) * vectors[a][i]));
  }

  // Orient onto the UPPER sheet. The Gram matrix fixes the normals only up to an
  // O(n,1) isometry; the eigenvector signs may put the fundamental chamber on the
  // lower (t < 0) sheet. Find an interior point p (⟨p, n_i⟩ ≈ -1 for all i) and,
  // if it is past-pointing, apply the time reversal diag(-1, 1, …) — which negates
  // coordinate 0 of every normal and preserves the Gram matrix.
  const interior = interiorPoint(normals, dim + 1);
  if (interior[0] < 0) {
    for (const n of normals) n[0] = -n[0];
    interior[0] = -interior[0]; // keep the interior point in step with the flipped normals
  }

  return { dim, signature: { pos: pos.length, neg: neg.length, zero: zero.length }, normals, interior };
}

/**
 * A point p in the chamber { ⟨x, n_i⟩ ≤ 0 } as the least-squares solution of
 * ⟨p, n_i⟩ = -1 (i.e. p·(J n_i) = -1). With A the matrix of rows J n_i, solve the
 * normal equations (AᵀA) p = Aᵀ(-1). The normals span R^{d}, so AᵀA is invertible.
 * Returns the raw solution (not oriented onto a sheet); callers flip the time
 * component if they need it future-pointing. Shared with the 3D solver.
 */
export function interiorPoint(normals: number[][], d: number): number[] {
  const A = normals.map((n) => n.map((c, a) => (a === 0 ? -c : c))); // rows J·n_i
  const AtA: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
  const Atb = new Array(d).fill(0);
  for (const row of A) {
    for (let k = 0; k < d; k++) {
      Atb[k] -= row[k]; // Aᵀ·(-1)
      for (let l = 0; l < d; l++) AtA[k][l] += row[k] * row[l];
    }
  }
  return solveLinear(AtA, Atb);
}
