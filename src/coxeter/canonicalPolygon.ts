import type { Realization } from './realize';

/**
 * Canonical geometric realization of a hyperbolic Coxeter polygon (Porti's
 * minimum-perimeter convention).
 *
 * A bare Coxeter matrix records the consecutive vertex angles β_i = π/m_i but,
 * for n > 3 sides, leaves n−3 shape moduli undetermined: the ultraparallel
 * distances between non-adjacent sides are not fixed by the angles alone. This
 * is exactly the data the generic Gram → realize pipeline cannot supply.
 *
 * Porti's theorem (Geom. Dedicata 156 (2012), 165–170) selects a canonical
 * representative: among all compact convex hyperbolic polygons with the given
 * cyclic angle list, the unique one of MINIMUM PERIMETER — equivalently, the
 * unique one with an inscribed circle tangent to every side. It is intrinsic,
 * unique up to isometry, and realizes every combinatorial symmetry of the angle
 * list (all-equal angles → the regular polygon).
 *
 * The construction needs only a single monotone 1-D root solve. With incenter
 * o = (0,0,1), inradius r, and t = sech r, the outward unit normals sit at
 * angular gaps θ_i(t) = 2·arcsin(t·cos(β_i/2)); they close up (Σθ_i = 2π)
 * exactly at the unique root of
 *
 *     F(t) = Σ 2·arcsin(t·cos(β_i/2)) − 2π,   F: [0,1] → ℝ strictly increasing.
 *
 * Once t is known the normals, Gram, vertices and reflections follow in closed
 * form — no multidimensional optimizer, and no diagonalization (the normals are
 * built directly in R^{2,1}).
 *
 * Lorentz convention IN THIS MODULE follows the source note: coordinates
 * (x, y, t) with form ⟨a,b⟩ = a₀b₀ + a₁b₁ − a₂b₂ (J = diag(1,1,−1)), timelike
 * LAST. The project elsewhere uses (t, x, y) with timelike FIRST; the bridge
 * `canonicalPolygonRealization` reorders coordinates at the boundary. The Gram
 * matrix is convention-free, so it is identical in either ordering.
 */

type Vec3 = [number, number, number];

type Mat3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number],
];

export interface CanonicalPolygonOptions {
  /** Number of bisection iterations. 80 is ample for Float64. */
  readonly bisectionIterations?: number;
  /** Geometric validation tolerance. */
  readonly tolerance?: number;
}

export interface CanonicalPolygonDiagnostics {
  /** Σθ_i − 2π at the solved root (should be ~0). */
  readonly closureError: number;
  /** max |⟨e_i,e_i⟩ − 1| over normals. */
  readonly maxNormalNormError: number;
  /** max |G_{i,i+1} + cos β_i| over edges. */
  readonly maxAdjacentGramError: number;
  /** max |⟨v_i, e_i⟩|, |⟨v_i, e_{i+1}⟩| over vertices. */
  readonly maxVertexIncidenceError: number;
  /** max half-space violation: max_{i,j} ⟨v_i, e_j⟩ (should be ≤ ~0). */
  readonly maxHalfSpaceViolation: number;
  /** max ‖R_i² − I‖∞. */
  readonly maxReflectionInvolutionError: number;
  /** max ‖R_iᵀ J R_i − J‖∞. */
  readonly maxLorentzIsometryError: number;
}

export interface CanonicalHyperbolicPolygon {
  /** Interior angle β_i, occurring at vertex v_i between mirrors i and i+1. */
  readonly angles: readonly number[];
  /** Coxeter order m_i, when the input came from Coxeter data. */
  readonly adjacentOrders?: readonly number[];
  /** t = sech r. */
  readonly sechInradius: number;
  readonly inradius: number;
  /** θ_i = φ_{i+1} − φ_i, the angular gap between consecutive outward normals. */
  readonly normalGaps: readonly number[];
  /** φ_0 = 0, then cumulative normal gaps. */
  readonly normalAngles: readonly number[];
  /** Outward unit spacelike Lorentz normals, in (x, y, t) order. */
  readonly normals: readonly Vec3[];
  /** G_ij = ⟨e_i, e_j⟩ (convention-free). */
  readonly gram: readonly (readonly number[])[];
  /** v_i = H_i ∩ H_{i+1}, on the hyperboloid, in (x, y, t) order. */
  readonly vertices: readonly Vec3[];
  /** Edge i joins v_{i-1} to v_i. */
  readonly edgeLengths: readonly number[];
  readonly perimeter: number;
  /** R_i = I − 2 e_i e_iᵀ J, acting on (x, y, t) column vectors. */
  readonly reflections: readonly Mat3[];
  readonly diagnostics: CanonicalPolygonDiagnostics;
}

const TWO_PI = 2 * Math.PI;

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/** Lorentz inner product in (x,y,t): a₀b₀ + a₁b₁ − a₂b₂. */
function lorentzDot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] - a[2] * b[2];
}

/** J(a ×_Euclidean b), with J = diag(1,1,−1); Lorentz-orthogonal to both a and b. */
function lorentzCross(a: Vec3, b: Vec3): Vec3 {
  const c0 = a[1] * b[2] - a[2] * b[1];
  const c1 = a[2] * b[0] - a[0] * b[2];
  const c2 = a[0] * b[1] - a[1] * b[0];
  return [c0, c1, -c2];
}

/** Normalize a timelike vector onto the hyperboloid, future-pointing (t > 0). */
function normalizeFutureTimelike(v: Vec3, tolerance: number): Vec3 {
  const n2 = lorentzDot(v, v);
  if (!(n2 < -tolerance)) {
    throw new Error(`Expected timelike vector; Lorentz norm squared was ${n2}.`);
  }
  const s = 1 / Math.sqrt(-n2);
  const r: Vec3 = [v[0] * s, v[1] * s, v[2] * s];
  return r[2] < 0 ? [-r[0], -r[1], -r[2]] : r;
}

function hyperbolicDistance(a: Vec3, b: Vec3): number {
  return Math.acosh(Math.max(1, -lorentzDot(a, b)));
}

/** R = I − 2 e (eᵀJ), the reflection in the mirror with unit spacelike pole e. */
function reflectionMatrix(e: Vec3): Mat3 {
  const co: Vec3 = [e[0], e[1], -e[2]]; // J·e as a covector
  const R: Mat3 = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      R[i][j] = (i === j ? 1 : 0) - 2 * e[i] * co[j];
    }
  }
  return R;
}

/**
 * Build the canonical (minimum-perimeter) hyperbolic polygon from a cyclic list
 * of interior angles β_i with 0 < β_i < π and Σ(π − β_i) > 2π (the compact
 * convexity condition). β_i is the angle at the vertex where side i meets side
 * i+1 (indices mod n).
 */
export function buildCanonicalPolygonFromAngles(
  inputAngles: readonly number[],
  options: CanonicalPolygonOptions = {},
): CanonicalHyperbolicPolygon {
  const iterations = options.bisectionIterations ?? 80;
  const tolerance = options.tolerance ?? 1e-12;

  const angles = [...inputAngles];
  const n = angles.length;
  if (n < 3) throw new Error('A polygon requires at least three angles.');

  for (let i = 0; i < n; i++) {
    const beta = angles[i];
    if (!Number.isFinite(beta) || !(beta > 0 && beta < Math.PI)) {
      throw new Error(`angles[${i}] must satisfy 0 < β < π; received ${beta}.`);
    }
  }

  const exteriorAngleSum = angles.reduce((s, beta) => s + Math.PI - beta, 0);
  if (!(exteriorAngleSum > TWO_PI)) {
    throw new Error(
      'The ordered angles do not define a compact convex hyperbolic polygon: ' +
        `Σ(π − β_i) = ${exteriorAngleSum} must exceed 2π = ${TWO_PI}.`,
    );
  }

  const halfAngleCosines = angles.map((beta) => Math.cos(beta / 2));

  // F(t) = Σ 2·arcsin(t·cos(β_i/2)) − 2π is strictly increasing with F(0) = −2π
  // < 0 and F(1) = Σ(π − β_i) − 2π > 0. Bisect for its unique root.
  const closure = (t: number): number => {
    let sum = 0;
    for (const c of halfAngleCosines) sum += 2 * Math.asin(clamp(t * c, -1, 1));
    return sum - TWO_PI;
  };
  let lower = 0;
  let upper = 1;
  for (let k = 0; k < iterations; k++) {
    const mid = 0.5 * (lower + upper);
    if (closure(mid) < 0) lower = mid;
    else upper = mid;
  }
  const t = 0.5 * (lower + upper);

  const normalGaps = halfAngleCosines.map((c) => 2 * Math.asin(clamp(t * c, -1, 1)));
  const closureError = normalGaps.reduce((s, g) => s + g, 0) - TWO_PI;

  const normalAngles = new Array<number>(n);
  normalAngles[0] = 0;
  for (let i = 1; i < n; i++) normalAngles[i] = normalAngles[i - 1] + normalGaps[i - 1];

  const coshR = 1 / t;
  const sinhR = Math.sqrt((1 - t) * (1 + t)) / t; // stable near t = 1
  const inradius = Math.acosh(coshR);

  const normals: Vec3[] = normalAngles.map((phi) => [
    coshR * Math.cos(phi),
    coshR * Math.sin(phi),
    sinhR,
  ]);

  // Stable closed form: G_ij = 1 − 2·[sin((φ_i − φ_j)/2) / t]².
  const gram: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      const q = Math.sin(0.5 * (normalAngles[i] - normalAngles[j])) / t;
      return 1 - 2 * q * q;
    }),
  );

  const vertices: Vec3[] = Array.from({ length: n }, (_, i) =>
    normalizeFutureTimelike(lorentzCross(normals[i], normals[(i + 1) % n]), tolerance),
  );

  const edgeLengths: number[] = Array.from({ length: n }, (_, i) =>
    hyperbolicDistance(vertices[(i - 1 + n) % n], vertices[i]),
  );
  const perimeter = edgeLengths.reduce((s, l) => s + l, 0);

  const reflections = normals.map(reflectionMatrix);

  const diagnostics = computeDiagnostics(angles, normals, gram, vertices, reflections, closureError);

  return {
    angles,
    sechInradius: t,
    inradius,
    normalGaps,
    normalAngles,
    normals,
    gram,
    vertices,
    edgeLengths,
    perimeter,
    reflections,
    diagnostics,
  };
}

/**
 * Build the canonical polygon from a cyclic list of adjacent Coxeter orders
 * m_i = ord(s_i s_{i+1}); validates each m_i ≥ 2 integer and sets β_i = π/m_i.
 */
export function buildCanonicalCoxeterPolygon(
  adjacentOrders: readonly number[],
  options: CanonicalPolygonOptions = {},
): CanonicalHyperbolicPolygon {
  const angles = adjacentOrders.map((m, i) => {
    if (!Number.isInteger(m) || m < 2 || !Number.isFinite(m)) {
      throw new Error(`adjacentOrders[${i}] must be a finite integer ≥ 2; received ${m}.`);
    }
    return Math.PI / m;
  });
  return { ...buildCanonicalPolygonFromAngles(angles, options), adjacentOrders: [...adjacentOrders] };
}

/**
 * Bridge the canonical polygon into the project's group machinery as a
 * `Realization` (see realize.ts), bypassing the Gram → diagonalize round-trip.
 * Reorders normals (x,y,t) → (t,x,y) and uses the incenter o = (1,0,0) as the
 * chamber-interior base point (equidistant from every wall).
 */
export function canonicalPolygonRealization(
  adjacentOrders: readonly number[],
  options?: CanonicalPolygonOptions,
): Realization {
  const poly = buildCanonicalCoxeterPolygon(adjacentOrders, options);
  const n = poly.normals.length;
  return {
    dim: 2,
    signature: { pos: 2, neg: 1, zero: n - 3 },
    normals: poly.normals.map(([x, y, time]) => [time, x, y]),
    interior: [1, 0, 0],
  };
}

function computeDiagnostics(
  angles: readonly number[],
  normals: readonly Vec3[],
  gram: readonly (readonly number[])[],
  vertices: readonly Vec3[],
  reflections: readonly Mat3[],
  closureError: number,
): CanonicalPolygonDiagnostics {
  const n = normals.length;
  let maxNormalNormError = 0;
  let maxAdjacentGramError = 0;
  let maxVertexIncidenceError = 0;
  let maxHalfSpaceViolation = -Infinity;

  for (let i = 0; i < n; i++) {
    maxNormalNormError = Math.max(maxNormalNormError, Math.abs(lorentzDot(normals[i], normals[i]) - 1));
    maxAdjacentGramError = Math.max(
      maxAdjacentGramError,
      Math.abs(gram[i][(i + 1) % n] + Math.cos(angles[i])),
    );
    maxVertexIncidenceError = Math.max(
      maxVertexIncidenceError,
      Math.abs(lorentzDot(vertices[i], normals[i])),
      Math.abs(lorentzDot(vertices[i], normals[(i + 1) % n])),
    );
    for (let j = 0; j < n; j++) {
      maxHalfSpaceViolation = Math.max(maxHalfSpaceViolation, lorentzDot(vertices[i], normals[j]));
    }
  }

  const J: Vec3 = [1, 1, -1];
  let maxReflectionInvolutionError = 0;
  let maxLorentzIsometryError = 0;
  for (const R of reflections) {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let sq = 0;
        for (let k = 0; k < 3; k++) sq += R[i][k] * R[k][j];
        maxReflectionInvolutionError = Math.max(maxReflectionInvolutionError, Math.abs(sq - (i === j ? 1 : 0)));
        // (RᵀJR)_ij = Σ_{a,b} R[a][i] J_a δ_{ab} R[b][j] = Σ_a R[a][i] J_a R[a][j]
        let g = 0;
        for (let a = 0; a < 3; a++) g += R[a][i] * J[a] * R[a][j];
        maxLorentzIsometryError = Math.max(maxLorentzIsometryError, Math.abs(g - (i === j ? J[i] : 0)));
      }
    }
  }

  return {
    closureError,
    maxNormalNormError,
    maxAdjacentGramError,
    maxVertexIncidenceError,
    maxHalfSpaceViolation,
    maxReflectionInvolutionError,
    maxLorentzIsometryError,
  };
}
