import type { Vec } from '../math/hyperboloid';
import type { Hyperplane } from '../geometry/Hyperplane';
import { Polytope } from './Polytope';

/**
 * Moving a polytope by an isometry. An isometry of H^n carries a polytope to a
 * NEW polytope — its image — with the SAME combinatorial face lattice but moved
 * geometry. So we never re-run the convex hull: we just map the components
 *   vertex v ↦ g·v,   facet pole n ↦ g·n,
 * and copy the (invariant) edges / faces / incidence. This is O(V + F) and exact
 * — the combinatorics cannot change under an isometry. The original polytope is
 * untouched; a fresh Polytope is returned, ready to draw alongside it.
 *
 * Note: a reflection reverses orientation, so face loops come back wound the
 * opposite way. Rendering is double-sided with recomputed normals, so this is
 * currently invisible (revisit if/when outward orientation matters).
 */

/** What `transformPolytope` needs of a geometry: apply an isometry, and re-project onto the sheet. */
interface IsometryMover<P, I> {
  apply(g: I, p: P): P;
  normalize(p: P): P;
}

/** What `reflectPolytope` needs: re-project a point onto the sheet. */
interface PointNormalizer<P> {
  normalize(p: P): P;
}

function mapComponents<P extends Vec<P>>(
  poly: Polytope<P>,
  mapPoint: (p: P) => P,
  mapNormal: (n: P) => P,
): Polytope<P> {
  return new Polytope(
    poly.dim,
    poly.vertices.map(mapPoint),
    poly.vertexKind.slice(),
    poly.edges.map((e) => [e[0], e[1]] as [number, number]),
    poly.faces.map((f) => ({ loop: f.loop.slice(), facet: f.facet })),
    poly.facets.map((f) => f.mapped(mapNormal)),
  );
}

/** The image g(P): the polytope carried by the isometry `g` (a Matrix3/Matrix4 in O(n,1)). */
export function transformPolytope<P extends Vec<P>, I>(
  poly: Polytope<P>,
  geom: IsometryMover<P, I>,
  g: I,
): Polytope<P> {
  return mapComponents(
    poly,
    (p) => geom.normalize(geom.apply(g, p)),
    (n) => geom.apply(g, n),
  );
}

/** The mirror image of P across `mirror` — the special case g = reflection in that hyperplane. */
export function reflectPolytope<P extends Vec<P>>(
  poly: Polytope<P>,
  geom: PointNormalizer<P>,
  mirror: Hyperplane<P>,
): Polytope<P> {
  return mapComponents(
    poly,
    (p) => geom.normalize(mirror.reflect(p)),
    (n) => mirror.reflect(n),
  );
}
