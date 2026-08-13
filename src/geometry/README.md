# src/geometry

Intrinsic hyperbolic geometry on the hyperboloid model — described with **no
reference to any picture** (that's what `models/` is for). This is where the
abstract `math/` engine becomes typed H² / H³ objects, plus the isometry-group
operations the Coxeter code needs. Depends only on `math/`.

## The mathematics

**`Geometry<P>`** is a hyperbolic space presented on its hyperboloid: curvature
−1/ρ², the Minkowski `form`, and `distance / exp / log / geodesic / normalize`
(all deferred to `math/hyperboloid`). Generic over the canonical point type `P`:
`Hyperbolic2` uses `Vector3` (ambient R^{2,1}), `Hyperbolic3` uses `Vector4`
(R^{3,1}).

**Isometries and reflections.** Each `Geometry` also exposes its isometry group
as matrices acting on the ambient space (`identity / apply / compose / inverse`),
so it doubles as the `GroupGeometry` a `CoxeterGroup` runs on. The reflection in
the geodesic hyperplane with unit spacelike pole `n` is

$$R_n = I - 2\,n\,n^{\mathsf T} J, \qquad J=\operatorname{diag}(-1,1,\dots,1),$$

an element of O(n,1) fixing the hyperplane pointwise (`R_n² = I`,
`R_nᵀ J R_n = J`).

**`Hyperplane<P>`** is a geodesic hyperplane = a unit spacelike pole `n`
(⟨n,n⟩ = 1). `side(x) = ⟨x,n⟩` says which half-space `x` is in (interior:
≤ 0); `reflect` is `R_n`. `bisector(p,q)` is the perpendicular bisector of two
points — its pole is `p − q` normalized under the form, the seed for **Dirichlet
domains**. `fromNormal` normalizes raw input to a unit pole.

## Contents

| file | contents |
|---|---|
| `types.ts` | the `Geometry<P>` interface; `Point2 = Vector3`, `Point3 = Vector4` |
| `Hyperbolic2.ts` | H²(k) on R^{2,1}: form, geodesic ops, `origin`, and the Matrix3 isometry group (`identity/apply/compose/inverse/reflection`) |
| `Hyperbolic3.ts` | H³(k) on R^{3,1}, with the Matrix4 isometry group |
| `Hyperplane.ts` | `Hyperplane<P>`: unit spacelike pole; `fromNormal`, `bisector`, `side`, `reflect` |

## Used by

`polytope/` (facets are `Hyperplane`s; hull/transform use the geometry),
`coxeter/` (the reflection representation and the `GroupGeometry`), `models/`
(charts are defined relative to a `Geometry`), and the render layer.
