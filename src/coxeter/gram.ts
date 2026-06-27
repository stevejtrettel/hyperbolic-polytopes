/**
 * Building the Gram matrix of a Coxeter polytope: the symmetric N×N matrix of
 * inner products of the wall normals, G_ij = ⟨n_i, n_j⟩. It is the sole input to
 * the geometric realization (see realize.ts).
 *
 *   G_ii = 1                         (unit spacelike normals)
 *   G_ij = -cos(π/m_ij)              walls i,j meet at dihedral angle π/m_ij
 *   G_ij = -1                        walls i,j are parallel (m_ij = ∞, an ideal vertex)
 *   G_ij = -cosh(ℓ_ij)   (< -1)      walls i,j are ultraparallel, distance ℓ_ij apart
 *
 * `labels[i][j]` carries the integer m_ij (or Infinity); `lengths[i][j]`, when
 * positive, overrides with an ultraparallel distance ℓ_ij. Two walls with no
 * relation (m = 2, a right angle) give G_ij = 0.
 */

/** A single Coxeter inner product from a dihedral label (m, or Infinity). */
export function entryFromLabel(m: number): number {
  if (!Number.isFinite(m)) return -1; // parallel walls, ideal vertex
  return -Math.cos(Math.PI / m);
}

/**
 * Gram matrix from a symmetric label matrix (m_ij) and optional ultraparallel
 * lengths. Diagonal entries of `labels` are ignored (set to 1).
 */
export function gramFromLabels(labels: number[][], lengths?: number[][]): number[][] {
  const n = labels.length;
  const G: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    G[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      const ell = lengths?.[i]?.[j] ?? lengths?.[j]?.[i] ?? 0;
      const g = ell > 0 ? -Math.cosh(ell) : entryFromLabel(labels[i][j]);
      G[i][j] = g;
      G[j][i] = g;
    }
  }
  return G;
}

/**
 * The Gram matrix of a hyperbolic triangle with vertex angles π/p, π/q, π/r —
 * i.e. its three walls meet pairwise at those angles. Compact iff
 * 1/p + 1/q + 1/r < 1.
 */
export function triangleGram(p: number, q: number, r: number): number[][] {
  // walls 0-1 meet at π/p, 1-2 at π/q, 0-2 at π/r.
  return gramFromLabels([
    [1, p, r],
    [p, 1, q],
    [r, q, 1],
  ]);
}

/**
 * The Gram matrix of a regular hyperbolic p-gon with vertex angle π/k — a
 * compact Coxeter polygon whose side reflections generate a discrete group (it
 * tiles H²). Adjacent sides meet at π/k; non-adjacent sides are ultraparallel
 * with the distance the regular polygon forces.
 *
 * Geometry: with circumradius R given by cosh R = cot(π/p)·cot(π/2k) and apothem
 * a from tanh a = cos(π/p)·tanh R, the poles n_i = (sinh a, cosh a·cos θ_i,
 * cosh a·sin θ_i) give G_ij = cos Δ + sinh²a·(cos Δ − 1), Δ = 2π(i−j)/p.
 * Exists (R real) iff cot(π/p)·cot(π/2k) > 1.
 */
export function regularPolygonGram(p: number, k: number): number[][] {
  const cot = (x: number): number => Math.cos(x) / Math.sin(x);
  const product = cot(Math.PI / p) * cot(Math.PI / (2 * k));
  if (product <= 1) {
    throw new Error(`No compact regular {${p}-gon, angle π/${k}}: need cot(π/p)·cot(π/2k) > 1 (got ${product.toFixed(3)}).`);
  }
  const R = Math.acosh(product);
  const tanha = Math.cos(Math.PI / p) * Math.tanh(R);
  const sinh2a = (tanha * tanha) / (1 - tanha * tanha);
  const G: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  for (let i = 0; i < p; i++) {
    for (let j = 0; j < p; j++) {
      if (i === j) { G[i][j] = 1; continue; }
      const cd = Math.cos((2 * Math.PI * (i - j)) / p);
      G[i][j] = cd + sinh2a * (cd - 1);
    }
  }
  return G;
}

/**
 * The Gram matrix of the compact RIGHT-ANGLED dodecahedron in H³ — the smallest
 * compact right-angled polytope, and a Coxeter polytope (all dihedral angles
 * π/2, so its face reflections tile H³).
 *
 * The 12 faces point in the icosahedral directions (0,±1,±φ) and cyclic perms.
 * Placing each face plane at inradius `a` with poles n_i = (sinh a, cosh a·û_i),
 * adjacent faces (û_i·û_j = 1/√5) meet at dihedral angle π/2 exactly when
 * tanh²a = 1/√5. The Gram is then G_ij = ⟨n_i, n_j⟩ under the R^{3,1} form.
 */
export function rightAngledDodecahedronGram(): number[][] {
  const phi = (1 + Math.sqrt(5)) / 2;
  const raw: [number, number, number][] = [];
  for (const a of [1, -1]) for (const b of [phi, -phi]) {
    raw.push([0, a, b], [a, b, 0], [b, 0, a]);
  }
  const len = Math.hypot(1, phi); // = √(1+φ²)
  const dirs = raw.map(([x, y, z]) => [x / len, y / len, z / len] as [number, number, number]);

  const a = Math.atanh(Math.pow(5, -0.25)); // tanh a = 5^(-1/4) ⇒ tanh²a = 1/√5
  const ch = Math.cosh(a);
  const sh = Math.sinh(a);
  const poles = dirs.map(([x, y, z]) => [sh, ch * x, ch * y, ch * z]);

  const n = poles.length;
  const G: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const p = poles[i], q = poles[j];
      G[i][j] = -p[0] * q[0] + p[1] * q[1] + p[2] * q[2] + p[3] * q[3]; // ⟨p, q⟩ in R^{3,1}
    }
  }
  return G;
}

/**
 * The Gram matrix of a linear Coxeter diagram [a, b, c, …]: a path of N = k+1
 * walls whose consecutive pairs meet at angles π/a, π/b, … and whose
 * non-consecutive pairs are perpendicular (m = 2). E.g. the compact tetrahedron
 * [3, 5, 3].
 */
export function pathGram(edgeLabels: number[]): number[][] {
  const n = edgeLabels.length + 1;
  const labels: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 2)),
  );
  for (let i = 0; i < edgeLabels.length; i++) {
    labels[i][i + 1] = edgeLabels[i];
    labels[i + 1][i] = edgeLabels[i];
  }
  return gramFromLabels(labels);
}
