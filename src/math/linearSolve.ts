/**
 * Solve M x = b for a small dense square matrix by Gaussian elimination with
 * partial pivoting. Shared by the Coxeter realization code (normal equations,
 * least-squares interior points, Newton steps). `M` is row-major and is not
 * mutated. A (near-)singular pivot is skipped rather than dividing by ~0, so the
 * caller's regularization (e.g. Levenberg–Marquardt damping) governs stability.
 */
export function solveLinear(M: number[][], b: number[]): number[] {
  const n = b.length;
  const a = M.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(a[r][col]) > Math.abs(a[piv][col])) piv = r;
    [a[col], a[piv]] = [a[piv], a[col]];
    const d = a[col][col];
    if (Math.abs(d) < 1e-300) continue;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = a[r][col] / d;
      for (let c = col; c <= n; c++) a[r][c] -= f * a[col][c];
    }
  }
  return a.map((row, i) => row[n] / row[i]); // diagonal now: x_i = rhs_i / pivot_i
}
