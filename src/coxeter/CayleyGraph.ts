/**
 * The Cayley graph of a Coxeter group as an ABSTRACT (combinatorial) object:
 * nodes are group elements, edges join g to gR_i (one per generator). It is the
 * dual graph of the tiling — one node per chamber, one edge per shared wall.
 *
 * Each node carries its group element (a matrix), so the GEOMETRIC realization
 * is immediate: place node g at g·p₀ for a base point p₀ (the chamber incenter /
 * centroid), and draw edges as the geodesics between node points. That placement
 * is the orbit of p₀ — Wythoff's construction at a generic point — and lives in
 * the view layer (CayleyGraphView), keeping this object purely combinatorial.
 */

export interface CayleyNode<I> {
  /** The group element g (this node's chamber is g·F). */
  element: I;
  /** A word reaching g from the identity (left to right). */
  word: number[];
  /** Geometric dedup key for the element. */
  key: string;
  /** Word-length ball depth at which g was first reached. */
  depth: number;
}

/** An undirected edge {a, b} = {g, gR_i}, labelled by the generator i. */
export interface CayleyEdge {
  a: number; // node index
  b: number; // node index
  generator: number;
}

export interface CayleyGraph<I> {
  nodes: CayleyNode<I>[];
  edges: CayleyEdge[];
}
