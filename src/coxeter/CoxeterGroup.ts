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
import { realize } from './realize';

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

  constructor(
    geom: GroupGeometry<P, I>,
    mirrors: Hyperplane<P>[],
    reflections: I[],
    signature: { pos: number; neg: number; zero: number },
    makeDomain: () => Polytope<P>,
  ) {
    this.geom = geom;
    this.mirrors = mirrors;
    this.reflections = reflections;
    this.signature = signature;
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
   * A generic interior point of the fundamental domain — the centroid of its
   * vertices. Every non-identity element of W moves it (W acts freely on chamber
   * interiors), so its orbit bijects with W: it's the right base point for the
   * Cayley graph. (A point on a wall would have a nontrivial stabilizer and give
   * a uniform polytope instead — Wythoff's construction.)
   */
  basePoint(): P {
    const verts = this.fundamentalDomain().vertices;
    const sum = verts[0].clone().multiplyScalar(0);
    for (const v of verts) sum.addScaledVector(v, 1);
    return this.geom.normalize(sum);
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

/** Realize a rank-3 (signature (2,1)) Coxeter Gram matrix as a group acting on H². */
export function buildCoxeterGroup2(gram: number[][]): CoxeterGroup<Vector3, Matrix3> {
  const r = realize(gram);
  if (r.dim !== 2) throw new Error(`buildCoxeterGroup2 expects an H² (rank-3) Gram matrix; got H${r.dim}.`);
  const geom = new Hyperbolic2(-1);
  const form = (a: Vector3, b: Vector3) => geom.form(a, b);
  const mirrors = r.normals.map((c) => Hyperplane.fromNormal(form, new Vector3(c[0], c[1], c[2])));
  const reflections = mirrors.map((m) => geom.reflection(m.normal));
  return new CoxeterGroup(geom, mirrors, reflections, r.signature, () => fromHalfspaces2(geom, mirrors));
}

/** Realize a rank-4 (signature (3,1)) Coxeter Gram matrix as a group acting on H³. */
export function buildCoxeterGroup3(gram: number[][]): CoxeterGroup<Vector4, Matrix4> {
  const r = realize(gram);
  if (r.dim !== 3) throw new Error(`buildCoxeterGroup3 expects an H³ (rank-4) Gram matrix; got H${r.dim}.`);
  const geom = new Hyperbolic3(-1);
  const form = (a: Vector4, b: Vector4) => geom.form(a, b);
  const mirrors = r.normals.map((c) => Hyperplane.fromNormal(form, new Vector4(c[0], c[1], c[2], c[3])));
  const reflections = mirrors.map((m) => geom.reflection(m.normal));
  return new CoxeterGroup(geom, mirrors, reflections, r.signature, () => fromHalfspaces3(geom, mirrors));
}
