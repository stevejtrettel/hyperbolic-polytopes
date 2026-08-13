import { Vector3, Vector4, type Matrix3, type Matrix4 } from 'three';
import { Hyperbolic2 } from '../geometry/Hyperbolic2';
import { Hyperbolic3 } from '../geometry/Hyperbolic3';
import { Hyperplane } from '../geometry/Hyperplane';
import { fromHalfspaces2, fromHalfspaces3 } from '../polytope/build';
import { transformPolytope } from '../polytope/transform';
import type { Polytope } from '../polytope/Polytope';
import type { Geometry } from '../geometry/types';
import type { Vec } from '../math/hyperboloid';
import { orbit as runOrbit, matrixKey, type OrbitElement } from '../group/orbit';
import { CoxeterPolytope } from './CoxeterPolytope';
import type { CayleyGraph, CayleyNode, CayleyEdge } from './CayleyGraph';
import { realize, type Realization } from './realize';
import { canonicalPolygonRealization } from './canonicalPolygon';
import type { CoxeterPairData } from './pairData';
import { interpretCompactPolygon } from './polygonSpec';

/**
 * A hyperbolic geometry that also exposes its isometry group: the full
 * Geometry<P> (form, exp/log/geodesic for rendering) plus the group operations
 * on its isometry type `I` and the reflection in a pole. Hyperbolic2 (I = Matrix3)
 * and Hyperbolic3 (I = Matrix4) satisfy it.
 */
export interface GroupGeometry<P, I> extends Geometry<P> {
  identity(): I;
  apply(g: I, p: P): P;
  compose(g: I, h: I): I;
  inverse(g: I): I;
  reflection(n: P): I;
}

/**
 * A hyperbolic Coxeter group as a GEOMETRIC REPRESENTATION. Built from a Gram
 * matrix (see `buildCoxeterGroup2` / `…3`), it holds the realized walls and the
 * generating reflections ρ(s_i) = R_i ∈ O(n,1) — the representation itself —
 * and implements the reflections as the group action: compose words, enumerate
 * the orbit, and carry the fundamental domain to tile the space.
 *
 * Generic over the canonical point type `P` (Vector3 / Vector4) and isometry
 * type `I` (Matrix3 / Matrix4). The combinatorial face-lattice construction is
 * the only dimension-specific dependency, injected as `makeDomain`.
 */
export class CoxeterGroup<P extends Vec<P>, I> {
  readonly geom: GroupGeometry<P, I>;
  /** The walls (mirrors): unit spacelike poles in de Sitter space. */
  readonly mirrors: Hyperplane<P>[];
  /** The generating reflections ρ(s_i) = R_i ∈ O(n,1). */
  readonly reflections: I[];
  readonly signature: { pos: number; neg: number; zero: number };

  private readonly makeDomain: () => Polytope<P>;
  private domain?: Polytope<P>;
  /** A chamber-interior point on the hyperboloid (hull-independent; see basePoint). */
  private readonly interior: P;

  constructor(
    geom: GroupGeometry<P, I>,
    mirrors: Hyperplane<P>[],
    reflections: I[],
    signature: { pos: number; neg: number; zero: number },
    interior: P,
    makeDomain: () => Polytope<P>,
  ) {
    this.geom = geom;
    this.mirrors = mirrors;
    this.reflections = reflections;
    this.signature = signature;
    this.interior = geom.normalize(interior);
    this.makeDomain = makeDomain;
  }

  /** Number of generators (= number of walls). */
  get rank(): number {
    return this.reflections.length;
  }

  /** The generating reflection ρ(s_i). */
  reflect(i: number): I {
    return this.reflections[i];
  }

  /**
   * The group element of a word, applied LEFT TO RIGHT: word [i₀,…,i_k] means
   * "apply R_{i₀} first, then …, then R_{i_k}". On a point that is
   * x ↦ R_{i_k}(…R_{i₀}(x)…), so the element is the matrix product
   * R_{i_k}···R_{i₀} — each new generator composed on the LEFT. (identity for [])
   */
  word(indices: number[]): I {
    return indices.reduce((g, i) => this.geom.compose(this.reflections[i], g), this.geom.identity());
  }

  /** The fundamental domain (chamber): the intersection of the mirror half-spaces. Memoized. */
  fundamentalDomain(): Polytope<P> {
    if (!this.domain) this.domain = this.makeDomain();
    return this.domain;
  }

  /**
   * A generic interior point of the fundamental chamber — the point equidistant
   * from the walls (⟨p, n_i⟩ all equal), straight from the realization. Every
   * non-identity element of W moves it (W acts freely on chamber interiors), so
   * its orbit bijects with W: it's the right base point for the Cayley graph. (A
   * point on a wall would have a nontrivial stabilizer and give a uniform polytope
   * instead — Wythoff's construction.) Hull-independent, so it stays valid for
   * non-compact chambers where the fundamental-domain hull is incomplete.
   */
  basePoint(): P {
    return this.interior.clone();
  }

  /**
   * The Cayley graph out to word-length `maxWord`: nodes are the group elements
   * in that ball, edges join g to gR_i whenever both are present (the induced
   * subgraph). Combinatorial only — realize geometrically by placing node g at
   * g·basePoint() (see CayleyGraphView).
   */
  cayleyGraph(maxWord: number, maxCount?: number): CayleyGraph<I> {
    const nodes: CayleyNode<I>[] = this.orbit(maxWord, maxCount).map((e) => ({
      element: e.element,
      word: e.word,
      key: matrixKey(e.element as unknown as { elements: ArrayLike<number> }),
      depth: e.depth,
    }));
    const index = new Map<string, number>();
    nodes.forEach((n, i) => index.set(n.key, i));

    const edges: CayleyEdge[] = [];
    for (let a = 0; a < nodes.length; a++) {
      for (let i = 0; i < this.reflections.length; i++) {
        const neighbor = this.geom.compose(nodes[a].element, this.reflections[i]); // g·R_i
        const b = index.get(matrixKey(neighbor as unknown as { elements: ArrayLike<number> }));
        if (b !== undefined && a < b) edges.push({ a, b, generator: i }); // each undirected edge once
      }
    }
    return { nodes, edges };
  }

  /** The image of the fundamental domain under `word` (applied left to right). */
  image(word: number[]): CoxeterPolytope<P, I> {
    const element = this.word(word);
    return new CoxeterPolytope(transformPolytope(this.fundamentalDomain(), this.geom, element), word, element);
  }

  /** The images of the fundamental domain under each word. */
  images(words: number[][]): CoxeterPolytope<P, I>[] {
    return words.map((word) => this.image(word));
  }

  /**
   * The tile adjacent to `tile` across its i-th wall (the image of mirror i). If
   * `tile = g·F` then this is `(g·R_i)·F`, with word `[i, …tile.word]` — exactly
   * "apply R_i first, then the rest", consistent with the left-to-right convention.
   */
  neighbor(tile: CoxeterPolytope<P, I>, i: number): CoxeterPolytope<P, I> {
    const element = this.geom.compose(tile.element, this.reflections[i]); // g·R_i
    const word = [i, ...tile.word];
    return new CoxeterPolytope(transformPolytope(this.fundamentalDomain(), this.geom, element), word, element);
  }

  /**
   * The subgroup generated by `generators` (e.g. a parabolic ⟨R_i, R_j⟩ from the
   * standard generators, or any elements via `word()`), enumerated by BFS over
   * the generators and their inverses, deduplicated. Subgroups of an infinite
   * Coxeter group are usually infinite, so `maxCount` bounds the enumeration.
   */
  subgroup(generators: I[], maxCount = 5000): I[] {
    const key = (g: I) => matrixKey(g as unknown as { elements: ArrayLike<number> });
    const id = this.geom.identity();
    const seen = new Map<string, I>([[key(id), id]]);
    const steps = [...generators, ...generators.map((g) => this.geom.inverse(g))];

    let frontier: I[] = [id];
    while (frontier.length > 0) {
      const next: I[] = [];
      for (const e of frontier) {
        for (const g of steps) {
          const h = this.geom.compose(e, g);
          const k = key(h);
          if (seen.has(k)) continue;
          seen.set(k, h);
          next.push(h);
          if (seen.size >= maxCount) return [...seen.values()];
        }
      }
      frontier = next;
    }
    return [...seen.values()];
  }

  /** All group elements reachable by words of length ≤ `maxWord` (deduplicated). */
  orbit(maxWord: number, maxCount?: number): OrbitElement<I>[] {
    const ops = {
      identity: () => this.geom.identity(),
      compose: (a: I, b: I) => this.geom.compose(a, b),
      key: (g: I) => matrixKey(g as unknown as { elements: ArrayLike<number> }),
    };
    return runOrbit(ops, this.reflections, maxWord, maxCount);
  }

  /**
   * Tile the space: carry the fundamental domain by every element of the orbit
   * up to word length `maxWord`, as CoxeterPolytopes (each remembers its word, so
   * `.depth` = word length is handy for colouring). The chamber is a fundamental
   * domain (trivial stabilizer), so distinct elements give distinct tiles.
   */
  tessellate(maxWord: number, maxCount?: number): CoxeterPolytope<P, I>[] {
    const domain = this.fundamentalDomain();
    return this.orbit(maxWord, maxCount).map(
      (e) => new CoxeterPolytope(transformPolytope(domain, this.geom, e.element), e.word, e.element),
    );
  }
}

/**
 * Assemble an H² Coxeter group from a `Realization` (normals + interior, already
 * in standard R^{2,1}). Shared by both the Gram path (`buildCoxeterGroup2`) and
 * the Porti canonical-polygon path (`buildCanonicalCoxeterGroup2`), so neither
 * re-diagonalizes a Gram it has already realized.
 */
function realization2ToGroup(r: Realization): CoxeterGroup<Vector3, Matrix3> {
  if (r.dim !== 2) throw new Error(`expected an H² (rank-3) realization; got H${r.dim}.`);
  const geom = new Hyperbolic2(-1);
  const form = (a: Vector3, b: Vector3) => geom.form(a, b);
  const mirrors = r.normals.map((c) => Hyperplane.fromNormal(form, new Vector3(c[0], c[1], c[2])));
  const reflections = mirrors.map((m) => geom.reflection(m.normal));
  const interior = new Vector3(r.interior[0], r.interior[1], r.interior[2]);
  return new CoxeterGroup(geom, mirrors, reflections, r.signature, interior, () => fromHalfspaces2(geom, mirrors));
}

/** Realize a rank-3 (signature (2,1)) Coxeter Gram matrix as a group acting on H². */
export function buildCoxeterGroup2(gram: number[][]): CoxeterGroup<Vector3, Matrix3> {
  return realization2ToGroup(realize(gram));
}

/**
 * Build an H² Coxeter group directly from a cyclic list of adjacent orders
 * m_i = ord(s_i s_{i+1}), via Porti's canonical minimum-perimeter polygon (see
 * canonicalPolygon.ts). This is the user-friendly path for n-gons: it supplies
 * the ultraparallel distances the bare Coxeter data leaves undetermined, with no
 * hand-derived Gram and no diagonalization round-trip.
 */
export function buildCanonicalCoxeterGroup2(adjacentOrders: readonly number[]): CoxeterGroup<Vector3, Matrix3> {
  return realization2ToGroup(canonicalPolygonRealization(adjacentOrders));
}

/**
 * The one-call bridge from abstract combinatorial data to a 2D Coxeter group:
 * normalized pair data (from a Coxeter matrix or a diagram — see pairData) →
 * cyclic polygon spec → canonical (Porti) realization. Throws via
 * `interpretCompactPolygon` if the data isn't a compact hyperbolic polygon.
 */
export function coxeterPolygonGroup(data: CoxeterPairData): CoxeterGroup<Vector3, Matrix3> {
  return buildCanonicalCoxeterGroup2(interpretCompactPolygon(data).orders);
}

/**
 * Assemble an H³ Coxeter group from a `Realization` (normals + interior in
 * standard R^{3,1}). Shared by the Gram path (`buildCoxeterGroup3`) and the
 * polyhedron-solver path (see coxeter/polyhedron), so a solved set of normals
 * feeds the group without a Gram round-trip.
 */
export function realization3ToGroup(r: Realization): CoxeterGroup<Vector4, Matrix4> {
  if (r.dim !== 3) throw new Error(`expected an H³ (rank-4) realization; got H${r.dim}.`);
  const geom = new Hyperbolic3(-1);
  const form = (a: Vector4, b: Vector4) => geom.form(a, b);
  const mirrors = r.normals.map((c) => Hyperplane.fromNormal(form, new Vector4(c[0], c[1], c[2], c[3])));
  const reflections = mirrors.map((m) => geom.reflection(m.normal));
  const interior = new Vector4(r.interior[0], r.interior[1], r.interior[2], r.interior[3]);
  return new CoxeterGroup(geom, mirrors, reflections, r.signature, interior, () => fromHalfspaces3(geom, mirrors));
}

/** Realize a rank-4 (signature (3,1)) Coxeter Gram matrix as a group acting on H³. */
export function buildCoxeterGroup3(gram: number[][]): CoxeterGroup<Vector4, Matrix4> {
  return realization3ToGroup(realize(gram));
}
