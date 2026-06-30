import { Vector4 } from 'three';
import type { Hyperbolic3 } from '../../geometry/Hyperbolic3';
import { Hyperplane } from '../../geometry/Hyperplane';
import { fromHalfspaces3 } from '../../polytope/build';
import type { Polytope } from '../../polytope/Polytope';

/**
 * The combinatorial cell complex of a compact polyhedron, read off a set of
 * facet poles via the existing half-space builder. This is what the 3D doc
 * derives through planar embedding; with a geometric seed we get it directly:
 * `fromHalfspaces3` enumerates vertices/edges/faces, and facet adjacency follows
 * from which facets each vertex lies on.
 *
 * For a compact non-obtuse (simple) polyhedron every vertex is trivalent, so
 * `vertexFacets[v]` has length 3 and each edge borders exactly two facets.
 */
export interface PolyhedronCombinatorics {
  readonly polytope: Polytope<Vector4>;
  readonly mirrors: Hyperplane<Vector4>[];
  /** Facet indices each vertex lies on (length 3 for a simple polyhedron). */
  readonly vertexFacets: number[][];
  /** The two facets bordering each polytope edge, aligned with `polytope.edges`. */
  readonly edgeFacets: [number, number][];
  /** Unordered adjacent facet pairs [i,j] (i<j), one per geometric edge. */
  readonly facetPairs: [number, number][];
}

/** Build the polytope from facet poles and extract its facet-level combinatorics. */
export function analyzeCombinatorics(
  geom: Hyperbolic3,
  normals: number[][],
  eps = 1e-7,
): PolyhedronCombinatorics {
  const form = (a: Vector4, b: Vector4) => geom.form(a, b);
  const mirrors = normals.map((c) => Hyperplane.fromNormal(form, new Vector4(c[0], c[1], c[2], c[3])));
  const polytope = fromHalfspaces3(geom, mirrors);

  // A vertex lies on facet k iff ⟨vertex, n_k⟩ ≈ 0.
  const vertexFacets = polytope.vertices.map((v) => {
    const on: number[] = [];
    for (let k = 0; k < mirrors.length; k++) {
      if (Math.abs(form(v, mirrors[k].normal)) < eps) on.push(k);
    }
    return on;
  });

  // Each edge borders the facets shared by both endpoints.
  const edgeFacets: [number, number][] = polytope.edges.map(([a, b]) => {
    const shared = vertexFacets[a].filter((f) => vertexFacets[b].includes(f));
    if (shared.length !== 2) {
      throw new Error(`edge (${a},${b}) borders ${shared.length} facets (expected 2); seed combinatorics is not simple.`);
    }
    return [shared[0], shared[1]].sort((x, y) => x - y) as [number, number];
  });

  // Dedup the facet pairs (one per geometric edge already, but be defensive).
  const seen = new Set<string>();
  const facetPairs: [number, number][] = [];
  for (const [i, j] of edgeFacets) {
    const key = `${i},${j}`;
    if (!seen.has(key)) {
      seen.add(key);
      facetPairs.push([i, j]);
    }
  }

  return { polytope, mirrors, vertexFacets, edgeFacets, facetPairs };
}
