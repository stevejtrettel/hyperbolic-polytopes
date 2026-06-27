/**
 * Eigendecomposition of a real symmetric matrix by the cyclic Jacobi method.
 * Robust and exact-enough for the small (N ≤ ~8) Gram matrices of Coxeter
 * polytopes, and it gives both the eigenvalues (→ the form's signature) and the
 * eigenvectors (→ the change of basis that "diagonalizes the quadratic form").
 *
 * Returns { values, vectors } with A = Σ_k values[k] · vectors[k] ⊗ vectors[k];
 * `vectors[k]` is the k-th (unit) eigenvector and the eigenvectors are orthonormal.
 */
export function symmetricEig(
  A: number[][],
  opts: { maxSweeps?: number; tol?: number } = {},
): { values: number[]; vectors: number[][] } {
  const n = A.length;
  const maxSweeps = opts.maxSweeps ?? 100;
  const tol = opts.tol ?? 1e-14;

  // Working copy `a` (mutated to diagonal) and accumulated rotations `V`.
  const a = A.map((row) => row.slice());
  const V: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );

  const offNorm = (): number => {
    let s = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) s += a[p][q] * a[p][q];
    return Math.sqrt(s);
  };

  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    if (offNorm() < tol) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-300) continue;
        // Rotation angle that zeroes a[p][q]: tan(2φ) = 2a_pq / (a_qq − a_pp).
        const phi = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
        const c = Math.cos(phi);
        const s = Math.sin(phi);
        // a ← Jᵀ a J (update columns p, q then rows p, q).
        for (let k = 0; k < n; k++) {
          const akp = a[k][p], akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p][k], aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
        // V ← V J (accumulate eigenvectors as columns).
        for (let k = 0; k < n; k++) {
          const vkp = V[k][p], vkq = V[k][q];
          V[k][p] = c * vkp - s * vkq;
          V[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }

  const values = a.map((row, i) => row[i]);
  // vectors[k] = column k of V = the eigenvector for values[k].
  const vectors = Array.from({ length: n }, (_, k) => V.map((row) => row[k]));
  return { values, vectors };
}
