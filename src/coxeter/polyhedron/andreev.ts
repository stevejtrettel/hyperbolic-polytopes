import type { PolyhedronCombinatorics } from './combinatorics';

/**
 * Andreev's theorem for compact non-obtuse hyperbolic polyhedra: given the
 * combinatorial type and a dihedral angle α_ij = π/m_ij on every edge, a finite
 * set of linear inequalities is NECESSARY AND SUFFICIENT for a (unique up to
 * isometry) compact convex hyperbolic realization. Validating here separates
 * "mathematically impossible input" from "the numerical solve failed".
 *
 * This v1 checks the conditions that bite for the seeds we support:
 *  - non-obtuse: every m_ij ≥ 2 (α ≤ π/2);
 *  - local vertex: at each trivalent vertex with edge orders (p,q,r), the link is
 *    spherical, 1/p + 1/q + 1/r > 1 (equality ⇒ ideal, less ⇒ hyperideal);
 *  - prismatic 3-circuit: three pairwise-adjacent facets that do NOT share a
 *    vertex must satisfy α₁ + α₂ + α₃ < π, i.e. 1/m₁ + 1/m₂ + 1/m₃ < 1.
 *
 * Prismatic 4-circuit and quadrilateral-facet clauses are not yet implemented.
 * The fullerene seeds (dodecahedron, soccer ball) have neither, so this check is
 * complete for them; cube- and prism-type seeds DO have prismatic 4-/n-circuits,
 * so for those the solve + combinatorics verification is the real existence gate.
 * See COX_COMPUTE for the full statement.
 */

export type AndreevConditionKind = 'non-obtuse' | 'vertex' | 'prismatic-3-circuit';

export interface AndreevViolation {
  readonly kind: AndreevConditionKind;
  readonly facets: number[];
  readonly orders: number[];
  readonly detail: string;
}

export interface AndreevResult {
  readonly ok: boolean;
  readonly violations: AndreevViolation[];
}

export function validateAndreev(
  combinatorics: PolyhedronCombinatorics,
  order: (i: number, j: number) => number,
): AndreevResult {
  const violations: AndreevViolation[] = [];
  const { facetPairs, vertexFacets } = combinatorics;

  // Non-obtuse: every assigned order ≥ 2.
  for (const [i, j] of facetPairs) {
    const m = order(i, j);
    if (!Number.isInteger(m) || m < 2) {
      violations.push({ kind: 'non-obtuse', facets: [i, j], orders: [m], detail: `order ${m} must be an integer ≥ 2` });
    }
  }

  // Local vertex (spherical link): 1/p + 1/q + 1/r > 1.
  for (const facets of vertexFacets) {
    const orders = pairOrders(facets, order);
    const recip = orders.reduce((s, m) => s + 1 / m, 0);
    if (!(recip > 1 + 1e-12)) {
      violations.push({
        kind: 'vertex',
        facets,
        orders,
        detail: `Σ1/m = ${recip.toFixed(4)} ≤ 1 ⇒ ${recip < 1 - 1e-12 ? 'hyperideal' : 'ideal'} vertex, not compact`,
      });
    }
  }

  // Prismatic 3-circuits: triangles in the facet-adjacency graph that are not
  // vertices. Require Σ1/m < 1.
  const vertexKeys = new Set(vertexFacets.map((f) => [...f].sort((a, b) => a - b).join(',')));
  for (const tri of facetTriangles(facetPairs)) {
    if (vertexKeys.has(tri.join(','))) continue; // it's a genuine vertex, not prismatic
    const orders = pairOrders(tri, order);
    const recip = orders.reduce((s, m) => s + 1 / m, 0);
    if (!(recip < 1 - 1e-12)) {
      violations.push({
        kind: 'prismatic-3-circuit',
        facets: tri,
        orders,
        detail: `Σ1/m = ${recip.toFixed(4)} ≥ 1 violates the prismatic 3-circuit condition`,
      });
    }
  }

  return { ok: violations.length === 0, violations };
}

/** The three pairwise orders among a facet triple. */
function pairOrders(facets: number[], order: (i: number, j: number) => number): number[] {
  const out: number[] = [];
  for (let a = 0; a < facets.length; a++) {
    for (let b = a + 1; b < facets.length; b++) out.push(order(facets[a], facets[b]));
  }
  return out;
}

/** All triangles (3-cliques) in the facet-adjacency graph. */
function facetTriangles(facetPairs: [number, number][]): number[][] {
  const adj = new Map<number, Set<number>>();
  const add = (a: number, b: number) => {
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(a)!.add(b);
  };
  for (const [i, j] of facetPairs) {
    add(i, j);
    add(j, i);
  }
  const tris: number[][] = [];
  const nodes = [...adj.keys()].sort((a, b) => a - b);
  for (const i of nodes) {
    for (const j of adj.get(i)!) {
      if (j <= i) continue;
      for (const k of adj.get(j)!) {
        if (k <= j) continue;
        if (adj.get(i)!.has(k)) tris.push([i, j, k]);
      }
    }
  }
  return tris;
}
