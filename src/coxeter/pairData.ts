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

/**
 * `CoxeterPairData` (complete pair orders) is the canonical data. A DIAGRAM is a
 * drawing of it, and Coxeter / Artin are two VIEWS of the same data, differing
 * only in which edges they HIDE:
 *  - 'coxeter' hides the order-2 edges — the Coxeter–Dynkin diagram, where an
 *    undrawn pair is perpendicular. Natural when most generators commute.
 *  - 'artin'   hides the order-∞ edges — where an undrawn pair is ultraparallel
 *    (no relation). Natural for hyperbolic polytopes: an n-gon is a cycle of edges.
 * The data is primary; a view is just a rendering. `drawnEdges` projects complete
 * data to the edges a view shows; `diagramToPairData` is the inverse, completing a
 * drawing back to full data (undrawn pairs = the view's hidden order). A drawn
 * edge always carries its explicit order.
 */
export type DiagramView = 'coxeter' | 'artin';

/** The order a view hides — hence the value an undrawn pair takes. */
export function hiddenOrder(view: DiagramView): CoxeterOrder {
  return view === 'coxeter' ? 2 : 'infinity';
}

/** A drawn edge of a Coxeter diagram, with its explicit order. */
export interface DiagramEdge {
  readonly a: GeneratorId;
  readonly b: GeneratorId;
  readonly order: CoxeterOrder;
}

/** A diagram: the drawn (visible) edges, interpreted in a view. */
export interface CoxeterDiagram {
  readonly generators: readonly GeneratorId[];
  readonly edges: readonly DiagramEdge[];
  readonly view: DiagramView;
}

/**
 * Complete the data from a diagram drawn in a view: each drawn edge keeps its
 * order; every other pair takes the view's hidden order. Inverse of `drawnEdges`.
 */
export function diagramToPairData(diagram: CoxeterDiagram): CoxeterPairData {
  const { generators: gens, edges, view } = diagram;
  if (new Set(gens).size !== gens.length) throw new Error('generator identifiers must be distinct.');
  const known = new Set(gens);
  const omitted = hiddenOrder(view);

  // Drawn edges, keyed by canonical unordered pair "a|b" with index(a) < index(b).
  const index = new Map(gens.map((g, i) => [g, i]));
  const drawn = new Map<string, CoxeterOrder>();
  for (const e of edges) {
    if (!known.has(e.a) || !known.has(e.b)) throw new Error(`edge references unknown generator: ${e.a}–${e.b}.`);
    if (e.a === e.b) throw new Error(`edge connects a generator to itself: ${e.a}.`);
    const m = e.order;
    if (!(m === 'infinity' || (Number.isInteger(m) && m >= 2))) throw new Error(`invalid edge order ${m} on ${e.a}–${e.b}.`);
    const [lo, hi] = index.get(e.a)! < index.get(e.b)! ? [e.a, e.b] : [e.b, e.a];
    drawn.set(`${lo}|${hi}`, m);
  }

  const relations: PairRelation[] = [];
  for (let i = 0; i < gens.length; i++) {
    for (let j = i + 1; j < gens.length; j++) {
      relations.push({ a: gens[i], b: gens[j], order: drawn.get(`${gens[i]}|${gens[j]}`) ?? omitted });
    }
  }
  return { generators: [...gens], relations };
}

/**
 * The edges a view draws for complete data: the pairs whose order isn't the
 * view's hidden one. Inverse of `diagramToPairData` (round-trips the data).
 */
export function drawnEdges(data: CoxeterPairData, view: DiagramView): DiagramEdge[] {
  const h = hiddenOrder(view);
  return data.relations.filter((r) => r.order !== h).map((r) => ({ a: r.a, b: r.b, order: r.order }));
}
