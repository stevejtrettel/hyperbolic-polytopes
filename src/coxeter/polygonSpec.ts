import type { CoxeterPairData, GeneratorId } from './pairData';
import { pairOrder } from './pairData';

/**
 * Solver-ready combinatorial description of a compact Coxeter polygon: the
 * cyclic list of side mirrors and the Coxeter order between each consecutive
 * pair. `orders[i] = ord(s_i s_{i+1})` is the angle datum β_i = π/orders[i] at
 * the vertex where side i meets side i+1 (indices mod n). This is the stable
 * contract consumed by the Porti realizer (see canonicalPolygon.ts).
 */
export interface CoxeterPolygonSpec {
  readonly sideGenerators: readonly GeneratorId[];
  readonly orders: readonly number[];
}

/**
 * Interpret normalized pair data as a compact polygon. The finite-relation graph
 * (an edge wherever m_ij < ∞) must be a single cycle: every wall meets exactly
 * two neighbours and the others are ultraparallel. Traversing that cycle gives
 * the cyclic side order; the result is canonicalized (rotation + reversal) for
 * determinism and checked against the hyperbolicity inequality Σ 1/m_i < n − 2.
 */
export function interpretCompactPolygon(data: CoxeterPairData): CoxeterPolygonSpec {
  const gens = data.generators;
  const n = gens.length;
  if (n < 3) throw new Error(`a polygon needs at least 3 sides; got ${n} generators.`);

  // Adjacency = finite-order pairs.
  const adj = new Map<GeneratorId, GeneratorId[]>(gens.map((g) => [g, []]));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const m = pairOrder(data, gens[i], gens[j]);
      if (m !== 'infinity') {
        adj.get(gens[i])!.push(gens[j]);
        adj.get(gens[j])!.push(gens[i]);
      }
    }
  }

  // Every vertex must have degree exactly 2 (single cycle).
  const degrees = new Map<GeneratorId, number>(gens.map((g) => [g, adj.get(g)!.length]));
  for (const g of gens) {
    if (degrees.get(g) !== 2) {
      throw new Error(
        `finite-relation graph is not a cycle: wall "${g}" has degree ${degrees.get(g)} ` +
          `(expected 2). A compact Coxeter polygon needs each wall adjacent to exactly two others.`,
      );
    }
  }

  // Traverse the cycle from gens[0].
  const order: GeneratorId[] = [gens[0]];
  let prev: GeneratorId | null = null;
  let curr = gens[0];
  for (let step = 0; step < n - 1; step++) {
    const next = adj.get(curr)!.find((g) => g !== prev);
    if (next === undefined) throw new Error('finite-relation graph traversal stalled; not a single cycle.');
    order.push(next);
    prev = curr;
    curr = next;
  }
  // Close-up check: the last wall must be adjacent back to the first.
  if (!adj.get(curr)!.includes(gens[0]) || order.length !== n) {
    throw new Error('finite-relation graph is disconnected or not a single cycle.');
  }

  const canonical = canonicalizeCycle(order);
  const orders = canonical.map((g, i) => {
    const m = pairOrder(data, g, canonical[(i + 1) % n]);
    if (m === 'infinity') throw new Error('internal error: consecutive sides have infinite order.');
    return m;
  });

  const reciprocalSum = orders.reduce((s, m) => s + 1 / m, 0);
  if (!(reciprocalSum < n - 2 - 1e-12)) {
    throw new Error(
      `polygon is not hyperbolic: Σ 1/m_i = ${reciprocalSum.toFixed(6)} must be < n − 2 = ${n - 2} ` +
        `(= would be Euclidean, > would be spherical).`,
    );
  }

  return { sideGenerators: canonical, orders };
}

/**
 * Canonical representative of an unmarked cycle: rotate so the lexicographically
 * smallest generator leads, then pick the lexicographically smaller of the two
 * orientations (forward vs reversed).
 */
function canonicalizeCycle(cycle: readonly GeneratorId[]): GeneratorId[] {
  const n = cycle.length;
  const rotateToMin = (seq: readonly GeneratorId[]): GeneratorId[] => {
    let best = 0;
    for (let i = 1; i < n; i++) if (seq[i] < seq[best]) best = i;
    return [...seq.slice(best), ...seq.slice(0, best)];
  };
  const forward = rotateToMin(cycle);
  // Reverse the cycle, then re-rotate to the smallest lead.
  const reversed = rotateToMin([...cycle].reverse());
  const less = (a: GeneratorId[], b: GeneratorId[]): boolean => {
    for (let i = 0; i < n; i++) {
      if (a[i] < b[i]) return true;
      if (a[i] > b[i]) return false;
    }
    return false;
  };
  return less(reversed, forward) ? reversed : forward;
}
