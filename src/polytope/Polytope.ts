import type { Hyperplane } from '../geometry/Hyperplane';
import type { Vec } from '../math/hyperboloid';
import type { Causal } from '../math/minkowski';

/** A 2-face: its vertices as a cyclically-ordered loop, plus the facet it lies on. */
export interface PolytopeFace {
  /** Vertex indices, cyclically ordered around the facet plane. */
  loop: number[];
  /** Index into `Polytope.facets` of the supporting hyperplane. */
  facet: number;
}

/**
 * The combinatorial + geometric data of a convex hyperbolic polytope: canonical
 * vertices (on the hyperboloid), the half-spaces that bound it (facet poles),
 * and the face lattice connecting them. Generic over the canonical point type
 * `P` (Vector3 for H², Vector4 for H³).
 *
 * v1 represents only FINITE (timelike) vertices; `vertexKind` is carried so that
 * ideal (lightlike) and hyperideal (spacelike) vertices can be added later
 * without changing the shape of this type. (TODO: ideal / hyperideal support.)
 */
export class Polytope<P extends Vec<P>> {
  readonly dim: number;
  /** Canonical vertices on the hyperboloid (finite vertices only, for now). */
  readonly vertices: P[];
  /** Causal kind of each vertex: 'timelike' = finite. */
  readonly vertexKind: Causal[];
  /** Edges as vertex-index pairs. */
  readonly edges: [number, number][];
  /** 2-faces (empty in 2D — there the polytope itself is the polygon). */
  readonly faces: PolytopeFace[];
  /** The bounding half-spaces (facet poles, ⟨n,n⟩ = +1). */
  readonly facets: Hyperplane<P>[];

  constructor(
    dim: number,
    vertices: P[],
    vertexKind: Causal[],
    edges: [number, number][],
    faces: PolytopeFace[],
    facets: Hyperplane<P>[],
  ) {
    this.dim = dim;
    this.vertices = vertices;
    this.vertexKind = vertexKind;
    this.edges = edges;
    this.faces = faces;
    this.facets = facets;
  }
}
