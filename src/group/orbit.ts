/**
 * Enumerating a finitely-generated group of isometries by breadth-first search
 * over words. Generic over the isometry type `I` (Matrix3 / Matrix4): the engine
 * only needs to make the identity, compose two elements, and hash an element for
 * deduplication.
 *
 * Deduplication is GEOMETRIC (option (a)): two elements are "the same" iff their
 * quantized matrix entries agree. This is exact enough for the modest word
 * lengths we tessellate to; it is NOT a combinatorial normal form (no Coxeter
 * automaton), so very deep orbits could split equal elements under float drift.
 */

export interface GroupOps<I> {
  identity(): I;
  /** The product g·h. */
  compose(g: I, h: I): I;
  /** A stable string key identifying an element up to the quantization. */
  key(g: I): string;
}

/** An enumerated group element: the isometry, the (shortest) word that produced it, and its length. */
export interface OrbitElement<I> {
  element: I;
  word: number[]; // generator indices
  depth: number; // = word.length
}

/**
 * All group elements reachable by words of length ≤ `maxWord` over `generators`,
 * breadth-first and deduplicated (so the identity and any element appear once,
 * with their shortest word). Stops early if `maxCount` distinct elements is hit.
 */
export function orbit<I>(
  ops: GroupOps<I>,
  generators: I[],
  maxWord: number,
  maxCount = 5000,
): OrbitElement<I>[] {
  const id = ops.identity();
  const seen = new Map<string, OrbitElement<I>>();
  seen.set(ops.key(id), { element: id, word: [], depth: 0 });

  let frontier: OrbitElement<I>[] = [seen.values().next().value!];
  for (let depth = 1; depth <= maxWord; depth++) {
    const next: OrbitElement<I>[] = [];
    for (const e of frontier) {
      for (let i = 0; i < generators.length; i++) {
        // Compose the new generator on the LEFT, matching the left-to-right word
        // convention: appending i to the word applies R_i last (leftmost in the
        // product). The set of elements reached is unchanged either way.
        const h = ops.compose(generators[i], e.element);
        const k = ops.key(h);
        if (seen.has(k)) continue;
        const child: OrbitElement<I> = { element: h, word: [...e.word, i], depth };
        seen.set(k, child);
        next.push(child);
        if (seen.size >= maxCount) return [...seen.values()];
      }
    }
    frontier = next;
    if (frontier.length === 0) break; // group exhausted (finite at this depth)
  }
  return [...seen.values()];
}

/**
 * The standard geometric dedup key for a matrix isometry: its entries rounded to
 * a quantum. Works for any object exposing a flat `elements` array (Matrix3 /
 * Matrix4). Larger `quantum` merges more aggressively.
 */
export function matrixKey(m: { elements: ArrayLike<number> }, quantum = 1e-5): string {
  const e = m.elements;
  let s = '';
  for (let i = 0; i < e.length; i++) s += `${Math.round(e[i] / quantum)},`;
  return s;
}
