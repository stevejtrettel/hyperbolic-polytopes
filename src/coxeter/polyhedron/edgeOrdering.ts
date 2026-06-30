import type { PolyhedronCombinatorics } from './combinatorics';

/**
 * Ways to assign a Coxeter order m_ij to every edge of a seed polyhedron — the
 * dihedral-angle data the solver realizes. An ordering is just a callback
 * `order(i, j)` over adjacent facet indices; these helpers build common ones.
 */
export type EdgeOrder = (i: number, j: number) => number;

/** Number of sides of each facet (its face-loop length), indexed by facet. */
function facetSizes(c: PolyhedronCombinatorics): number[] {
  const sizes = new Array<number>(c.mirrors.length).fill(0);
  for (const f of c.polytope.faces) sizes[f.facet] = f.loop.length;
  return sizes;
}

/** Canonical key for an edge's symmetry class by the sorted pair of face sizes. */
function faceTypeKey(sizes: number[], i: number, j: number): string {
  return [sizes[i], sizes[j]].sort((a, b) => a - b).join('-');
}

/** The distinct face-type edge classes present, e.g. ['5-6','6-6'] for a soccer ball. */
export function edgeClasses(c: PolyhedronCombinatorics): string[] {
  const sizes = facetSizes(c);
  const keys = new Set<string>();
  for (const [i, j] of c.facetPairs) keys.add(faceTypeKey(sizes, i, j));
  return [...keys].sort();
}

/** Every edge gets order m. (Only m = 2 is compact on a simple polyhedron.) */
export function uniformOrder(m: number): EdgeOrder {
  return () => m;
}

/**
 * Order by face-type class: `orders[key]` for the sorted face-size pair (see
 * `faceTypeKey`), falling back to `fallback`. The natural symmetric scheme — on a
 * soccer ball it sets the pentagon–hexagon and hexagon–hexagon edges separately.
 */
export function faceTypeOrder(c: PolyhedronCombinatorics, orders: Record<string, number>, fallback = 2): EdgeOrder {
  const sizes = facetSizes(c);
  return (i, j) => orders[faceTypeKey(sizes, i, j)] ?? fallback;
}

/**
 * Order m on a greedy matching of edges (each vertex covered at most once),
 * order 2 elsewhere — so most trivalent vertices become (2, 2, m). A simple way
 * to get compact polyhedra with no closed form. Deterministic (edge order is
 * deterministic).
 */
export function matchingOrder(c: PolyhedronCombinatorics, m: number): EdgeOrder {
  const covered = new Set<number>();
  const matched = new Set<string>();
  c.polytope.edges.forEach(([a, b], e) => {
    if (covered.has(a) || covered.has(b)) return;
    covered.add(a);
    covered.add(b);
    matched.add(c.edgeFacets[e].join(','));
  });
  return (i, j) => (matched.has([i, j].sort((x, y) => x - y).join(',')) ? m : 2);
}

/**
 * Order m on a maximal set of mutually INDEPENDENT edges — no two sharing a
 * vertex OR a facet — order 2 elsewhere. On the cube this is the Lambert cube
 * (three non-coplanar, non-adjacent edges at π/m, the other nine at π/2); on
 * other solids it's the analogous "no two special edges touch" assignment.
 * Deterministic.
 */
export function independentEdgeOrder(c: PolyhedronCombinatorics, m: number): EdgeOrder {
  const usedFacets = new Set<number>();
  const usedVertices = new Set<number>();
  const chosen = new Set<string>();
  c.polytope.edges.forEach(([va, vb], e) => {
    const [fa, fb] = c.edgeFacets[e];
    if (usedFacets.has(fa) || usedFacets.has(fb) || usedVertices.has(va) || usedVertices.has(vb)) return;
    usedFacets.add(fa);
    usedFacets.add(fb);
    usedVertices.add(va);
    usedVertices.add(vb);
    chosen.add([fa, fb].sort((x, y) => x - y).join(','));
  });
  return (i, j) => (chosen.has([i, j].sort((x, y) => x - y).join(',')) ? m : 2);
}
