# src/coxeter/polyhedron

The **3D compact Coxeter polyhedron solver** ("Route B"). A bare Coxeter matrix
doesn't give a non-simplex polyhedron's Gram matrix (the ultraparallel face
distances are unknown), and there's no 1-D shortcut as in 2D. So we start from a
geometric seed and solve for the supporting planes numerically. Builds on the
parent `coxeter/` plus `polytope/build` (the hull engine) and `math/linearSolve`.

## The mathematics

**Unknowns and equations.** One outward unit spacelike Lorentz normal `n_i` per
facet, satisfying

$$\langle n_i,n_i\rangle = 1 \quad(\text{unit}), \qquad \langle n_i,n_j\rangle = -\cos(\pi/m_{ij}) \quad(\text{adjacent facets } i,j).$$

For a simple polyhedron with N facets this is `N + E = 4N − 6` equations in `4N`
unknowns — **underdetermined by exactly 6**, the dimension of the isometry group
O⁺(3,1). We solve by damped Gauss–Newton (Levenberg–Marquardt); the λI damping
absorbs the 6-D gauge nullspace, so it converges to a valid realization in some
frame.

**Route B.** Rather than infer the combinatorics from the matrix (planar
embedding, Andreev, convex realization — the doc's "Route A"), take a **Euclidean
seed solid** of the target combinatorial type: read its combinatorics off the
existing hull engine, and use it as the solver's starting configuration. This
reuses code we already trust and collapses the hard front half of the pipeline.

**Existence.** A *compact* Coxeter polyhedron must be **simple** (trivalent) — a
≥4-valent vertex can only be ideal. Andreev's theorem then decides realizability
from the angles; we check the conditions that bite (non-obtuse, local
spherical-vertex `1/p+1/q+1/r>1`, prismatic 3-circuits). Prismatic 4-/n-circuit
clauses are not implemented, so for cube/prism-type seeds the **solve +
combinatorics verification** is the real existence gate. Notable realizations:
the right-angled dodecahedron (matches the closed-form Gram), the **Lambert cube**
(three non-coplanar edges at π/m, nine at π/2 — to machine precision), and
families on the soccer ball / truncated solids.

## Contents

| file | contents |
|---|---|
| `seeds.ts` | Euclidean seed solids → face planes → Lorentz normals (dodecahedron, truncated icosahedron/octahedron/tetrahedron, cube, n-prisms); all simple |
| `combinatorics.ts` | `analyzeCombinatorics` — facet adjacency, per-vertex incident facets, edge↔facet-pair map via `fromHalfspaces3` |
| `edgeOrdering.ts` | order-assignment schemes: `uniformOrder`, `faceTypeOrder`, `matchingOrder`, `independentEdgeOrder` (Lambert), `edgeClasses` |
| `andreev.ts` | `validateAndreev` — compact-existence inequalities (local vertex + prismatic-3) |
| `solve.ts` | `solveFaceNormals` — Levenberg–Marquardt with analytic sparse Jacobian |
| `realizePolyhedron.ts` | `realizeCoxeterPolyhedron(seed, order)` — orchestrate seed → Andreev → solve → verify → `Realization` |

## Used by

`realization3ToGroup` (in `coxeter/CoxeterGroup`) turns the `Realization` into a
`CoxeterGroup`; the `coxeterPolyhedron3D` demo drives it from a per-shape catalog.
