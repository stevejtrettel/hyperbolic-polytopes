/**
 * The face-normal solver: the nonlinear heart of the 3D pipeline.
 *
 * Unknowns are one Lorentz vector n_i ∈ R^{3,1} per facet (time-first,
 * J = diag(−1,1,1,1)). Two families of equations pin down the polyhedron:
 *
 *   unit spacelike:   ⟨n_i, n_i⟩ = 1                       (one per facet)
 *   edge dihedral:    ⟨n_i, n_j⟩ = −cos(π/m_ij)            (one per adjacent pair)
 *
 * There is no scalar shortcut as in 2D — we solve by damped Gauss–Newton
 * (Levenberg–Marquardt) on the residual vector, seeded from the geometric seed
 * (which already has the correct combinatorics). The system is invariant under
 * O⁺(3,1), so the Jacobian has a 6-dimensional isometry nullspace; LM's damping
 * λI keeps the normal equations nonsingular, so the iteration converges to a
 * valid realization in some frame (recentering is a separate display step).
 *
 * This direct solve converges whenever the seed is geometrically close to the
 * target — which covers every seed/assignment the demo ships, including the
 * Lambert cube (the symmetric Euclidean seed reaches the symmetric hyperbolic
 * realization). Targets far from the symmetric seed (e.g. an asymmetric Lambert
 * cube with three DIFFERENT special angles) can stall; reaching those needs angle
 * continuation from a reachable anchor plus careful gauge-fixing (Roeder,
 * "Constructing Hyperbolic Polyhedra Using Newton's Method") — explored, left for
 * future work; see COX_COMPUTE.
 */

import { solveLinear } from '../../math/linearSolve';

export interface SolveOptions {
  readonly maxIterations?: number;
  readonly tolerance?: number;
}

export interface SolveResult {
  /** N solved unit spacelike Lorentz normals (length 4, time-first). */
  readonly normals: number[][];
  readonly residualNorm: number;
  readonly iterations: number;
  readonly converged: boolean;
}

/** ⟨a,b⟩ = −a₀b₀ + a₁b₁ + a₂b₂ + a₃b₃. */
function mink(a: number[], b: number[]): number {
  return -a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
}

/** J·v = (−v₀, v₁, v₂, v₃). */
function applyJ(v: number[]): number[] {
  return [-v[0], v[1], v[2], v[3]];
}

/**
 * Solve for the facet normals realizing the target dihedral angles. `seed` is the
 * initial guess (N unit spacelike normals with the right combinatorics);
 * `facetPairs` lists adjacent facets and `order(i,j)` their Coxeter order.
 */
export function solveFaceNormals(
  seed: number[][],
  facetPairs: [number, number][],
  order: (i: number, j: number) => number,
  opts: SolveOptions = {},
): SolveResult {
  const maxIterations = opts.maxIterations ?? 200;
  const tolerance = opts.tolerance ?? 1e-12;

  const N = seed.length;
  const dim = 4 * N;
  const targets = facetPairs.map(([i, j]) => -Math.cos(Math.PI / order(i, j)));
  const M = N + facetPairs.length; // residual count

  let x = seed.flat();

  const residuals = (vec: number[]): number[] => {
    const n = (i: number) => vec.slice(4 * i, 4 * i + 4);
    const r = new Array<number>(M);
    for (let i = 0; i < N; i++) r[i] = mink(n(i), n(i)) - 1;
    for (let e = 0; e < facetPairs.length; e++) {
      const [i, j] = facetPairs[e];
      r[N + e] = mink(n(i), n(j)) - targets[e];
    }
    return r;
  };

  const jacobian = (vec: number[]): number[][] => {
    const n = (i: number) => vec.slice(4 * i, 4 * i + 4);
    const J = Array.from({ length: M }, () => new Array<number>(dim).fill(0));
    for (let i = 0; i < N; i++) {
      const g = applyJ(n(i)); // ∂(⟨n_i,n_i⟩−1)/∂n_i = 2 J n_i
      for (let a = 0; a < 4; a++) J[i][4 * i + a] = 2 * g[a];
    }
    for (let e = 0; e < facetPairs.length; e++) {
      const [i, j] = facetPairs[e];
      const Jni = applyJ(n(i));
      const Jnj = applyJ(n(j));
      for (let a = 0; a < 4; a++) {
        J[N + e][4 * i + a] = Jnj[a]; // ∂/∂n_i = J n_j
        J[N + e][4 * j + a] = Jni[a]; // ∂/∂n_j = J n_i
      }
    }
    return J;
  };

  const norm2 = (v: number[]) => v.reduce((s, c) => s + c * c, 0);

  let r = residuals(x);
  let cost = norm2(r);
  let lambda = 1e-3;
  let iterations = 0;

  for (; iterations < maxIterations; iterations++) {
    if (Math.sqrt(cost) < tolerance) break;

    const J = jacobian(x);
    const JtJ = Array.from({ length: dim }, () => new Array<number>(dim).fill(0));
    const Jtr = new Array<number>(dim).fill(0);
    for (let k = 0; k < M; k++) {
      const row = J[k];
      const rk = r[k];
      for (let a = 0; a < dim; a++) {
        if (row[a] === 0) continue;
        Jtr[a] += row[a] * rk;
        for (let b = 0; b < dim; b++) JtJ[a][b] += row[a] * row[b];
      }
    }

    let stepped = false;
    for (let tries = 0; tries < 12; tries++) {
      const A = JtJ.map((row, a) => row.map((v, b) => (a === b ? v + lambda : v)));
      const delta = solveLinear(A, Jtr.map((v) => -v));
      const xNew = x.map((v, a) => v + delta[a]);
      const rNew = residuals(xNew);
      const costNew = norm2(rNew);
      if (costNew < cost) {
        x = xNew;
        r = rNew;
        cost = costNew;
        lambda = Math.max(lambda * 0.5, 1e-12);
        stepped = true;
        break;
      }
      lambda *= 4;
    }
    if (!stepped) break;
  }

  const normals = Array.from({ length: N }, (_, i) => x.slice(4 * i, 4 * i + 4));
  return { normals, residualNorm: Math.sqrt(cost), iterations, converged: Math.sqrt(cost) < tolerance * 100 };
}
