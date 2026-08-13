# src/polytope

The **polytope-from-data** engine: build a convex hyperbolic polytope's full
V/E/F lattice from either its vertices or its bounding half-spaces, move it by
isometries, and draw it through any model. Model-independent — the combinatorics
is computed once on the hyperboloid. Depends on `geometry/`, `math/`, and (for
the view) `models/` + `render/`.

## The mathematics

**Convex hull = Euclidean hull in the Klein chart.** Geodesics and geodesic
planes are straight in the Klein model, so a hyperbolic polytope's combinatorics
is exactly that of an ordinary Euclidean convex polytope there. We never hull on
the hyperboloid: we work the incidences out in the projective picture and store
canonical points.

**From half-spaces** (`fromHalfspaces2/3`). Given facet poles `n_i`, a candidate
vertex is the point Minkowski-orthogonal to `d` of them — the **Lorentz cross
product** `J(n_i ×_Euclidean n_j [×_Euclidean n_k])`. Keep it iff it is timelike
(a finite vertex) and lies in every half-space (⟨v, n_k⟩ ≤ 0 for all k). This
brute-force facet enumeration is **degeneracy-robust**, which matters because the
symmetric polytopes we care about are maximally degenerate. Edges join vertices
sharing ≥ d−1 facets; faces are the cyclic loop of vertices on each facet plane.

**From vertices** (`fromVertices2/3`): the dual — find the supporting
hyperplanes, then run the half-space builder.

**Isometry transforms** (`transform.ts`): an isometry carries a polytope to a new
one with the **same** face lattice, so we never re-hull — just map `v ↦ g·v` and
`n ↦ g·n` and copy the (invariant) edges/faces. O(V+F) and exact.

**Drawing faces** (`PolytopeView`): a face is tessellated by renormalizing
barycentric combinations of its vertices onto the hyperboloid. Because a positive
ambient combination of points on one hyperbolic plane stays on that plane after
renormalizing, the patch lies *exactly* on the face (flat in Klein, a spherical
cap in the Poincaré ball) — no geodesic interpolation needed. A vertex is a unit
sphere transformed by `model.jacobianAt`; an edge is a geodesic tube.

v1 carries `vertexKind` but represents only **finite** (timelike) vertices;
ideal/hyperideal are scaffolded for later (the vertex-solve skips non-timelike
intersections).

## Contents

| file | contents |
|---|---|
| `Polytope.ts` | the `Polytope<P>` value: canonical vertices, `vertexKind`, edges, 2-faces (loop + facet), facet poles |
| `build.ts` | `fromHalfspaces2/3`, `fromVertices2/3`, `hullOfPolytopes2/3` (hull of a union); the facet-enumeration core |
| `transform.ts` | `transformPolytope` (isometry image) and `reflectPolytope` |
| `PolytopeView.ts` | the three.js view: vertices / edges / faces through a `Model`, with per-polytope `PolytopeStyle` |

## Used by

`coxeter/` (the chamber is `fromHalfspaces`; `tessellate` and Wythoff use
`transformPolytope`; cells are `fromVertices` hulls), and every polytope-drawing
demo.
