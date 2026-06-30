/**
 * The normalized algebraic representation of a Coxeter system: a list of
 * generators and, for every unordered pair of distinct generators, an explicit
 * order m_ij ∈ {2, 3, …} ∪ {∞}. This is the stable internal form that all
 * external notations reduce to (v1 supports the Coxeter-matrix notation; diagram
 * / Artin / pair-graph front ends can be added later, all normalizing to this).
 *
 * `"infinity"` is used instead of JS `Infinity` so the data serializes to JSON.
 * Pairs are stored canonically with index(a) < index(b).
 */

export type GeneratorId = string;
export type CoxeterOrder = number | 'infinity';

export interface PairRelation {
  readonly a: GeneratorId;
  readonly b: GeneratorId;
  readonly order: CoxeterOrder;
}

export interface CoxeterPairData {
  readonly generators: readonly GeneratorId[];
  /** Exactly one relation per unordered pair of distinct generators, a-before-b by index. */
  readonly relations: readonly PairRelation[];
}

/** A raw Coxeter matrix entry: 1 on the diagonal, else an integer ≥ 2 or "infinity". */
export type CoxeterMatrixEntry = number | 'infinity';

function isValidOrder(value: CoxeterMatrixEntry): boolean {
  return value === 'infinity' || (typeof value === 'number' && Number.isInteger(value) && value >= 2);
}

/**
 * Normalize a Coxeter matrix into `CoxeterPairData`. Validates that the matrix
 * is square, sized to match `generators` (defaulting to s0,s1,…), symmetric,
 * with diagonal 1 and every off-diagonal a valid Coxeter order.
 */
export function coxeterMatrixToPairData(
  matrix: readonly (readonly CoxeterMatrixEntry[])[],
  generators?: readonly GeneratorId[],
): CoxeterPairData {
  const n = matrix.length;
  for (const row of matrix) {
    if (row.length !== n) throw new Error(`Coxeter matrix must be square; got a ${n}×${row.length} row.`);
  }
  const gens = generators ?? Array.from({ length: n }, (_, i) => `s${i}`);
  if (gens.length !== n) throw new Error(`generators length ${gens.length} does not match matrix size ${n}.`);
  if (new Set(gens).size !== gens.length) throw new Error('generator identifiers must be distinct.');

  const relations: PairRelation[] = [];
  for (let i = 0; i < n; i++) {
    if (matrix[i][i] !== 1) throw new Error(`diagonal entry [${i}][${i}] must be 1; got ${matrix[i][i]}.`);
    for (let j = i + 1; j < n; j++) {
      const m = matrix[i][j];
      if (m !== matrix[j][i]) throw new Error(`Coxeter matrix must be symmetric; [${i}][${j}] ≠ [${j}][${i}].`);
      if (!isValidOrder(m)) throw new Error(`invalid Coxeter order at [${i}][${j}]: ${m}.`);
      relations.push({ a: gens[i], b: gens[j], order: m });
    }
  }
  return { generators: gens, relations };
}

/** Look up the order of an unordered pair; returns 2 for an absent relation (a right angle). */
export function pairOrder(data: CoxeterPairData, a: GeneratorId, b: GeneratorId): CoxeterOrder {
  for (const r of data.relations) {
    if ((r.a === a && r.b === b) || (r.a === b && r.b === a)) return r.order;
  }
  return 2;
}
