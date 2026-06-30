# From a Coxeter Matrix to a Hyperbolic Coxeter Polyhedron

## Purpose

This document specifies a computational pipeline for constructing a three-dimensional hyperbolic Coxeter polyhedron from small combinatorial Coxeter data.

The initial target is the **compact** case. In that setting:

- generators correspond to reflecting facets;
- every dihedral angle is of the form \(\pi/m\), hence is non-obtuse;
- exactly three facets meet at each vertex;
- Andreev's theorem decides existence and uniqueness from combinatorics and dihedral angles;
- the geometric realization can be found numerically by solving directly for its supporting hyperplanes.

The intended pipeline is

\[
\boxed{
\text{Coxeter matrix}
\longrightarrow
\text{dual graph}
\longrightarrow
\text{abstract polyhedron}
\longrightarrow
\text{Andreev validation}
\longrightarrow
\text{convex seed}
\longrightarrow
\text{hyperbolic supporting planes}
\longrightarrow
\text{reflection representation}.
}
\]

The Gram matrix is not the main construction object. It can be recovered afterward if useful.

---

## 1. Scope and assumptions

We begin with a symmetric Coxeter matrix

\[
M=(m_{ij})_{1\le i,j\le N},
\]

where

\[
m_{ii}=1,
\qquad
m_{ij}\in\{2,3,4,\dots,\infty\}.
\]

The generator \(s_i\) is intended to be reflection in facet \(F_i\).

For adjacent facets,

\[
m_{ij}<\infty
\]

and their interior dihedral angle is

\[
\alpha_{ij}=\frac{\pi}{m_{ij}}.
\]

Because \(m_{ij}\ge 2\),

\[
0<\alpha_{ij}\le \frac{\pi}{2}.
\]

Thus every Coxeter polyhedron is non-obtuse.

For the first implementation, assume:

1. the desired object is a convex polyhedron in \(\mathbb H^3\);
2. it is compact;
3. every generator corresponds to an actual facet;
4. \(m_{ij}<\infty\) exactly when facets \(F_i,F_j\) share an edge;
5. the number of facets is at least five.

Hyperbolic Coxeter tetrahedra should be implemented separately. Their combinatorics is trivial and their full facet-normal Gram matrix is already prescribed.

Later extensions will allow ideal vertices, hyperideal vertices, truncations, and more general infinite-volume domains.

---

# Part I. Recover the abstract polyhedron

## 2. Construct the dual adjacency graph

Create a graph \(G^\ast\) with one vertex for every Coxeter generator:

\[
V(G^\ast)=\{1,\dots,N\}.
\]

Add an edge between \(i\) and \(j\) exactly when

\[
m_{ij}<\infty.
\]

Store \(m_{ij}\) as the edge label.

This is intended to be the one-skeleton of the **dual polyhedron**:

| Dual object | Primal object |
|---|---|
| vertex \(i\) | facet \(F_i\) |
| edge \(ij\) | polyhedron edge \(F_i\cap F_j\) |
| triangular face \(ijk\) | vertex \(F_i\cap F_j\cap F_k\) |

The graph alone is not yet the full polyhedron. We also need its embedding on \(S^2\), because the complementary regions of that embedding determine primal vertices.

---

## 3. Validate the proposed dual graph

For a compact non-obtuse hyperbolic polyhedron, the primal polyhedron is simple: exactly three facets meet at each vertex. Therefore its dual is a simplicial convex polyhedron, and \(G^\ast\) must be a triangulation of the sphere.

Perform the following checks.

### 3.1 Matrix checks

Verify:

- \(M\) is square;
- \(M\) is symmetric;
- \(m_{ii}=1\);
- every off-diagonal entry lies in \(\{2,3,\dots,\infty\}\).

### 3.2 Graph checks

Verify that \(G^\ast\):

- is simple;
- is connected;
- is planar;
- is \(3\)-vertex-connected.

By Steinitz's theorem, a simple graph is the graph of a convex Euclidean polyhedron exactly when it is planar and \(3\)-connected.

By Whitney's theorem, a \(3\)-connected planar graph has a unique spherical embedding up to orientation. Thus the combinatorial embedding is canonical except for reflection.

### 3.3 Triangulation check

Compute a planar rotation system and enumerate the complementary faces of the embedded graph.

Require every dual face to be a triangle.

Equivalently, if \(N^\ast,E^\ast,F^\ast\) are the dual counts, verify

\[
N^\ast-E^\ast+F^\ast=2,
\]

and

\[
3F^\ast=2E^\ast.
\]

Failure means the input cannot describe a compact non-obtuse Coxeter polyhedron under the current assumptions.

---

## 4. Recover the primal incidence structure

Once the spherical embedding of \(G^\ast\) has been computed, construct the primal polyhedron \(C\).

### 4.1 Primal facets

For each dual vertex \(i\), create a primal facet \(F_i\).

### 4.2 Primal edges

For each dual edge \(ij\), create a primal edge

\[
e_{ij}=F_i\cap F_j.
\]

Attach:

\[
m(e_{ij})=m_{ij},
\qquad
\alpha(e_{ij})=\frac{\pi}{m_{ij}}.
\]

### 4.3 Primal vertices

For each oriented triangular dual face \((i,j,k)\), create a primal vertex

\[
v_{ijk}=F_i\cap F_j\cap F_k.
\]

Each dual edge borders exactly two dual triangles, so each primal edge receives exactly two endpoints.

### 4.4 Facet boundary cycles

The rotation system around dual vertex \(i\) gives the cyclic order of dual edges incident to \(i\). Dually, this gives the cyclic order of primal edges and vertices along the boundary of facet \(F_i\).

Store this order explicitly. It will later be needed for:

- mesh construction;
- validation of the numerical result;
- drawing facet polygons;
- traversing adjacent chambers.

---

## 5. Suggested internal data model

```ts
export type FaceId = number;
export type EdgeId = number;
export type VertexId = number;

export type CoxeterOrder = number | typeof Infinity;

export interface CoxeterFace {
  readonly id: FaceId;

  /** Cyclic boundary order. */
  readonly boundaryEdges: readonly EdgeId[];
  readonly boundaryVertices: readonly VertexId[];
  readonly adjacentFaces: readonly FaceId[];
}

export interface CoxeterEdge {
  readonly id: EdgeId;
  readonly faceA: FaceId;
  readonly faceB: FaceId;

  readonly order: number;
  readonly angle: number;

  readonly vertexA: VertexId;
  readonly vertexB: VertexId;
}

export interface CoxeterVertex {
  readonly id: VertexId;

  /** Length three in the compact non-obtuse case. */
  readonly incidentFaces: readonly [FaceId, FaceId, FaceId];
  readonly incidentEdges: readonly [EdgeId, EdgeId, EdgeId];

  readonly kind: "finite";
}

export interface AbstractCoxeterPolyhedron {
  readonly faces: readonly CoxeterFace[];
  readonly edges: readonly CoxeterEdge[];
  readonly vertices: readonly CoxeterVertex[];

  /**
   * Cyclic order of neighbors around each vertex of the dual graph.
   * The key is a primal face id.
   */
  readonly dualRotationSystem:
    ReadonlyMap<FaceId, readonly FaceId[]>;
}
```

The first major function should be purely combinatorial:

```ts
export function buildCompactCoxeterPolyhedron(
  matrix: readonly (readonly CoxeterOrder[])[]
): AbstractCoxeterPolyhedron;
```

It should fail with a precise structured error rather than a generic exception.

Possible failure types include:

```ts
type CoxeterCombinatoricsError =
  | { kind: "invalid-matrix"; message: string }
  | { kind: "disconnected-dual-graph" }
  | { kind: "nonplanar-dual-graph" }
  | { kind: "dual-graph-not-3-connected" }
  | { kind: "dual-face-not-triangular"; face: readonly FaceId[] }
  | { kind: "incidence-consistency-failure"; message: string };
```

---

# Part II. Decide whether the angle assignment is realizable

## 6. Why the Andreev stage is separate

The graph and incidence checks answer:

> Does the input define an abstract convex polyhedron?

They do **not** answer:

> Can this abstract polyhedron carry the specified hyperbolic dihedral angles?

Andreev's theorem answers the second question for compact polyhedra with non-obtuse dihedral angles.

For a fixed combinatorial polyhedron \(C\) with at least five facets, the theorem gives finitely many linear inequalities in the edge angles. These inequalities are necessary and sufficient for the existence of a compact convex hyperbolic realization. The realization is then unique up to hyperbolic isometry.

This stage does not construct coordinates. Its purpose is to distinguish:

- impossible mathematical input;
- a later numerical failure.

If the Andreev check passes, then a unique target exists. A failed numerical solve must therefore be caused by initialization, conditioning, algorithmic limitations, or a software bug.

---

## 7. Local vertex conditions

At a compact trivalent vertex with incident edge orders \(p,q,r\), require

\[
\frac{\pi}{p}+\frac{\pi}{q}+\frac{\pi}{r}>\pi.
\]

Equivalently,

\[
\frac1p+\frac1q+\frac1r>1.
\]

For Coxeter labels, the spherical triples are, up to permutation,

\[
(2,2,n),\qquad
(2,3,3),\qquad
(2,3,4),\qquad
(2,3,5).
\]

Equality would produce an ideal vertex rather than a compact one.

This local test is necessary but not sufficient.

---

## 8. Global Andreev conditions

The full compact non-obtuse theorem contains five classes of inequalities. The implementation should follow a precise statement of the theorem rather than an informal reconstruction.

The combinatorial structures that must be detected include:

- every vertex;
- every prismatic \(3\)-circuit;
- every prismatic \(4\)-circuit;
- the exceptional configurations associated with quadrilateral facets.

A **prismatic \(k\)-circuit** is a cyclic list of \(k\) facets in which consecutive facets share an edge, but the corresponding dual cycle does not bound a dual face.

In the dual graph:

- a prismatic \(3\)-circuit is a \(3\)-cycle that is not one of the triangular dual faces;
- a prismatic \(4\)-circuit is a suitable embedded \(4\)-cycle crossing four distinct primal edges and not collapsing to local facet-boundary data.

For a prismatic \(3\)-circuit with crossed edge angles \(\alpha_1,\alpha_2,\alpha_3\), require

\[
\alpha_1+\alpha_2+\alpha_3<\pi.
\]

For a prismatic \(4\)-circuit with crossed edge angles
\(\alpha_1,\dots,\alpha_4\), require

\[
\alpha_1+\alpha_2+\alpha_3+\alpha_4<2\pi.
\]

The quadrilateral-facet clauses must be implemented directly from the chosen theorem statement, with unit tests built from known realizable and nonrealizable examples.

Suggested interface:

```ts
export interface AndreevValidationSuccess {
  readonly ok: true;
}

export interface AndreevViolation {
  readonly condition:
    | "non-obtuse"
    | "vertex"
    | "prismatic-3-circuit"
    | "prismatic-4-circuit"
    | "quadrilateral-facet";
  readonly involvedFaces: readonly FaceId[];
  readonly involvedEdges: readonly EdgeId[];
  readonly lhs: number;
  readonly rhs: number;
  readonly comparison: "<" | ">";
}

export interface AndreevValidationFailure {
  readonly ok: false;
  readonly violations: readonly AndreevViolation[];
}

export type AndreevValidationResult =
  | AndreevValidationSuccess
  | AndreevValidationFailure;
```

The validator should report all detected violations, not merely the first.

---

# Part III. Produce an initial geometric realization

## 9. The role of the seed

The nonlinear hyperbolic solver needs an initial numerical configuration of supporting planes.

The seed does **not** determine the combinatorics. The combinatorics was already recovered exactly in Parts I and II.

The seed only provides coordinates near enough to the desired solution for numerical iteration.

A useful seed should satisfy:

- the half-space intersection is nonempty;
- every intended facet is present;
- the face lattice equals the prescribed abstract polyhedron;
- all vertices lie inside the Klein ball after scaling;
- the dihedral angles may be wrong.

---

## 10. Construct a convex Euclidean dual

Produce coordinates

\[
q_i\in\mathbb R^3
\]

whose convex hull

\[
Q=\operatorname{conv}\{q_1,\dots,q_N\}
\]

has one-skeleton exactly \(G^\ast\).

Possible methods include:

1. a dedicated realization algorithm for \(3\)-connected planar graphs;
2. Tutte embedding followed by a convex lifting;
3. a spring embedding on \(S^2\), followed by convex hull and combinatorial verification;
4. numerical convex optimization with the desired face incidences.

Whatever method is used, verify afterward that:

- every prescribed dual edge appears in \(\operatorname{conv}\{q_i\}\);
- no extra dual edge appears;
- the hull facets are exactly the prescribed dual triangles.

Do not trust a visual spherical layout without this combinatorial verification.

Translate \(Q\) so that

\[
0\in\operatorname{int}(Q).
\]

---

## 11. Polarize to obtain the primal seed

Define the Euclidean polar

\[
Q^\circ
=
\left\{
y\in\mathbb R^3:
q_i\cdot y\le 1
\text{ for every }i
\right\}.
\]

The polar reverses incidence:

- each vertex \(q_i\) of \(Q\) becomes a facet of \(Q^\circ\);
- each edge of \(Q\) becomes an edge of \(Q^\circ\);
- each triangular facet of \(Q\) becomes a trivalent vertex of \(Q^\circ\).

Therefore \(Q^\circ\) has exactly the required primal combinatorics.

Scale the entire configuration so that

\[
Q^\circ\subset B^3,
\]

where \(B^3\) is the Klein ball.

Now \(Q^\circ\) is a genuine compact convex hyperbolic polyhedron in the Klein model, though with incorrect dihedral angles.

---

## 12. Convert Klein supporting planes to Lorentz normals

Use Minkowski space

\[
\mathbb R^{3,1},
\qquad
\langle x,y\rangle_J
=
-x_0y_0+x_1y_1+x_2y_2+x_3y_3.
\]

The hyperboloid model is

\[
\mathbb H^3
=
\{x:\langle x,x\rangle_J=-1,\ x_0>0\}.
\]

Suppose a facet of the Klein seed has equation

\[
u_i\cdot y=\rho_i,
\qquad
\|u_i\|=1,
\qquad
0<\rho_i<1.
\]

Set

\[
d_i=\operatorname{artanh}(\rho_i).
\]

Then the corresponding outward unit spacelike Lorentz normal is

\[
n_i
=
(\sinh d_i,\ \cosh d_i\,u_i),
\]

and

\[
\langle n_i,n_i\rangle_J=1.
\]

The oriented hyperbolic half-space is

\[
H_i
=
\{x\in\mathbb H^3:\langle x,n_i\rangle_J\le 0\}.
\]

The seed polyhedron is

\[
P_0=\bigcap_i H_i.
\]

---

# Part IV. Solve directly for the target supporting planes

## 13. Unknowns

Assign one unknown Lorentz vector

\[
n_i\in\mathbb R^{3,1}
\]

to every facet.

Each \(n_i\) represents an oriented supporting plane.

Do not solve for vertices first. Do not solve for unknown nonedge distances. Do not complete the full Gram matrix.

---

## 14. Equations

For every facet \(i\), impose the unit spacelike condition

\[
\langle n_i,n_i\rangle_J=1.
\]

For every primal edge \(e_{ij}\), impose the target dihedral angle:

\[
\langle n_i,n_j\rangle_J
=
-\cos\alpha_{ij}
=
-\cos\left(\frac{\pi}{m_{ij}}\right).
\]

Thus the residuals are

\[
r_i(n)
=
\langle n_i,n_i\rangle_J-1,
\]

and

\[
r_{ij}(n)
=
\langle n_i,n_j\rangle_J
+
\cos\left(\frac{\pi}{m_{ij}}\right).
\]

For a compact simple polyhedron with \(N\) facets,

\[
E=3N-6.
\]

There are \(4N\) scalar unknowns and

\[
N+E=4N-6
\]

equations. The missing six equations correspond exactly to the six-dimensional isometry group of \(\mathbb H^3\).

---

## 15. Gauge fixing

The geometric equations are invariant under the action of

\[
O^+(3,1).
\]

Without gauge fixing, the Jacobian has a six-dimensional nullspace.

A clean gauge is to choose one primal vertex incident to facets \(a,b,c\) and fix those three normals in a canonical configuration.

Their prescribed \(3\times 3\) Gram matrix is

\[
A=
\begin{pmatrix}
1 & -\cos\alpha_{ab} & -\cos\alpha_{ac}\\
-\cos\alpha_{ab} & 1 & -\cos\alpha_{bc}\\
-\cos\alpha_{ac} & -\cos\alpha_{bc} & 1
\end{pmatrix}.
\]

For a finite vertex, \(A\) is positive definite.

Factor

\[
A=Q^TQ
\]

and let \(q_a,q_b,q_c\in\mathbb R^3\) be its three column vectors. Fix

\[
n_a=(0,q_a),
\qquad
n_b=(0,q_b),
\qquad
n_c=(0,q_c).
\]

These three planes meet at

\[
x_\ast=(1,0,0,0)\in\mathbb H^3.
\]

Now solve only for the remaining \(N-3\) normals.

The number of unknown scalar coordinates is

\[
4(N-3)=4N-12.
\]

The remaining equations are:

- \(N-3\) unit-normal equations;
- \(E-3\) edge-angle equations.

Their total is

\[
(N-3)+(E-3)
=
N+E-6
=
4N-12.
\]

So the gauge-fixed system is square.

---

## 16. Analytic sparse Jacobian

Let

\[
J=\operatorname{diag}(-1,1,1,1).
\]

Then

\[
\langle x,y\rangle_J=x^TJy.
\]

For a norm residual,

\[
r_i=n_i^TJn_i-1,
\]

the derivative with respect to \(n_i\) is

\[
D_{n_i}r_i=2(Jn_i)^T.
\]

For an edge residual,

\[
r_{ij}=n_i^TJn_j+\cos\alpha_{ij},
\]

the nonzero derivative blocks are

\[
D_{n_i}r_{ij}=(Jn_j)^T,
\qquad
D_{n_j}r_{ij}=(Jn_i)^T.
\]

Each residual involves at most two facets, so the Jacobian is sparse.

---

## 17. Numerical method

The first implementation should use a robust nonlinear least-squares method rather than bare undamped Newton.

Recommended choices:

- Levenberg-Marquardt;
- trust-region reflective least squares;
- damped Newton with line search.

The solve is

\[
\min_n \frac12\|r(n)\|^2.
\]

Accept a result only when:

- the residual norm is below tolerance;
- every normal is spacelike and correctly oriented;
- the half-space intersection has the expected combinatorics;
- all reconstructed vertices are finite;
- no unintended facet intersections appear.

---

## 18. Direct solve versus continuation

There is only one geometric equation solver.

A **direct solve** calls it once at the target angle vector using the Euclidean-polar seed.

A **continuation solve** calls the same solver repeatedly along a path of angle vectors:

\[
\alpha(t)
=
(1-t)\alpha^{(0)}
+
t\alpha^{(1)}.
\]

At each stage, the previous solution is the initial guess for the next stage.

For combinatorial types with at least five facets, the non-obtuse Andreev angle region is convex. Therefore, if both endpoint angle assignments are valid for the same combinatorics, the straight segment remains valid.

Continuation is a robustness strategy, not a second kind of solver.

The first prototype should attempt:

1. direct solve from the Euclidean-polar seed;
2. adaptive continuation if direct solve fails.

The more elaborate Whitehead-move homotopy from Roeder's construction can be added later as a guaranteed global initialization mechanism.

---

# Part V. Reconstruct and verify the solved polyhedron

## 19. Recover vertices

For each combinatorial vertex incident to facets \(i,j,k\), solve

\[
\langle x,n_i\rangle_J
=
\langle x,n_j\rangle_J
=
\langle x,n_k\rangle_J
=0.
\]

Equivalently, find a nonzero vector spanning the nullspace of

\[
\begin{pmatrix}
n_i^TJ\\
n_j^TJ\\
n_k^TJ
\end{pmatrix}.
\]

For a compact vertex, require

\[
\langle x,x\rangle_J<0.
\]

Normalize the future-pointing solution:

\[
\widehat x
=
\frac{x}{\sqrt{-\langle x,x\rangle_J}},
\qquad
\widehat x_0>0.
\]

---

## 20. Verify half-space containment

For every combinatorial vertex \(v\) and every facet \(F_\ell\), check

\[
\langle \widehat x_v,n_\ell\rangle_J\le \varepsilon.
\]

For incident facets, this value should be approximately zero.

For nonincident facets, it should be strictly negative up to tolerance.

This confirms that each proposed vertex lies in the complete half-space intersection.

---

## 21. Verify exact combinatorics

Numerically reconstruct the half-space intersection or its vertex-edge-facet incidences and compare them with the abstract polyhedron.

Check:

- every prescribed facet is nonredundant;
- every prescribed vertex exists;
- every prescribed edge connects the expected endpoints;
- each facet boundary has the prescribed cyclic order;
- no extra vertices occur;
- no extra edges occur;
- no nonincident facet becomes active at a vertex.

This validation is not optional. The algebraic angle equations can have roots that do not realize the intended convex polyhedron.

---

## 22. Optional Gram matrix

After solving, the full Gram matrix is available as derived data:

\[
G_{ij}=\langle n_i,n_j\rangle_J.
\]

For adjacent facets,

\[
G_{ij}=-\cos(\pi/m_{ij}).
\]

For disjoint ultraparallel facets,

\[
G_{ij}=-\cosh d_{ij},
\]

so their distance is

\[
d_{ij}=\operatorname{arcosh}(-G_{ij}).
\]

The Gram matrix is therefore useful for diagnostics and derived geometry, but it need not appear in the construction pipeline.

---

## 23. Reflection representation

Reflection in facet \(F_i\) is

\[
R_i(x)
=
x-2\langle x,n_i\rangle_J n_i.
\]

As a matrix,

\[
R_i
=
I-2n_i n_i^T J.
\]

The solver has therefore produced both:

- the hyperbolic polyhedron;
- a concrete Lorentzian representation of the Coxeter generators.

No quotient or diagonalization stage is necessary.

---

# Part VI. Centering and rendering

## 24. Convert to standard models

A hyperboloid point

\[
x=(x_0,x_1,x_2,x_3)
\]

maps to the Klein ball by

\[
y_K
=
\frac{(x_1,x_2,x_3)}{x_0}.
\]

It maps to the Poincare ball by

\[
y_P
=
\frac{(x_1,x_2,x_3)}{x_0+1}.
\]

Use the Klein model for straight-edged polyhedral mesh construction and the Poincare model when conformal appearance is more important.

---

## 25. Post-solve centering

Gauge fixing is required during the solve, but its chosen origin need not be the best viewing origin.

After solving, apply a Lorentz isometry to move a preferred center to

\[
(1,0,0,0).
\]

Possible centers include:

- the center of the largest inscribed hyperbolic ball;
- a hyperbolic Karcher mean of the finite vertices;
- an analytic center obtained by maximizing facet slack.

Then choose a deterministic orientation using:

- a selected combinatorial flag;
- principal axes of the vertex set;
- symmetry information when available.

This display normalization is independent of the geometric construction.

---

# Part VII. Extension to cusps

## 26. What remains unchanged

For finite-volume polyhedra with ideal vertices:

- generators still correspond to facets;
- finite \(m_{ij}\) still label actual edges;
- all edge angles are still non-obtuse;
- supporting planes are still represented by unit spacelike normals;
- edge equations are unchanged.

The principal changes occur in the combinatorics and vertex validation.

---

## 27. Dual faces need not be triangular

At an ideal vertex, more than three facets may meet.

In the dual cellulation:

- a triangular dual face still represents a trivalent vertex;
- a quadrilateral dual face can represent a four-valent all-right cusp.

Thus the compact requirement “every dual face is triangular” must be replaced by a classification of allowed Euclidean Coxeter links.

For a trivalent vertex with labels \((p,q,r)\):

\[
\frac1p+\frac1q+\frac1r
\begin{cases}
>1 & \text{finite},\\
=1 & \text{ideal},\\
<1 & \text{hyperideal}.
\end{cases}
\]

The Euclidean Coxeter triples are

\[
(3,3,3),\qquad
(2,4,4),\qquad
(2,3,6).
\]

The other non-obtuse ideal possibility is the four-valent all-right cusp.

---

## 28. Ideal vertex equations

A reconstructed ideal vertex is represented by a future-pointing null vector \(x\):

\[
\langle x,x\rangle_J=0,
\qquad
\langle x,n_i\rangle_J=0
\]

for every incident facet.

Trivalent ideal vertices can often be obtained as limiting solutions of the same face-normal equations.

For a four-valent cusp, explicit common-incidence equations may be useful because pairwise right-angle equations alone should not be trusted to impose the intended common ideal point numerically.

---

## 29. Later hyperideal and infinite-volume support

Hyperideal vertices correspond to projective intersection points \(x\) satisfying

\[
\langle x,x\rangle_J>0.
\]

Their polar planes provide canonical truncation facets.

A natural later extension is the Bao-Bonahon theory of hyperideal polyhedra, in which combinatorics and dihedral angles again determine the object under appropriate inequalities.

Completely general infinite-volume Coxeter domains may require additional end and incidence data. Do not assume that the compact Andreev pipeline extends unchanged to every noncompact case.

---

# Part VIII. Software architecture

## 30. Recommended modules

```text
coxeter/
  CoxeterMatrix.ts
  CoxeterOrders.ts

combinatorics/
  DualGraph.ts
  PlanarEmbedding.ts
  RotationSystem.ts
  AbstractPolyhedron.ts
  BuildCompactPolyhedron.ts

validation/
  MatrixValidation.ts
  CombinatorialValidation.ts
  AndreevValidation.ts

initialization/
  ConvexDualRealization.ts
  PolarPolyhedron.ts
  KleinSeed.ts
  LorentzSeed.ts

solver/
  FaceNormalResidual.ts
  FaceNormalJacobian.ts
  GaugeFixing.ts
  NonlinearSolve.ts
  AngleContinuation.ts

geometry/
  Minkowski.ts
  Hyperboloid.ts
  Klein.ts
  Poincare.ts
  HyperbolicPlane.ts
  Reflection.ts

verification/
  VertexRecovery.ts
  HalfSpaceVerification.ts
  CombinatoricsVerification.ts

rendering/
  PolyhedronMesh.ts
  ChamberTraversal.ts
```

Keep the following layers separate:

1. **Combinatorics:** exact discrete structures.
2. **Existence validation:** theorem-level angle checks.
3. **Initialization:** arbitrary but combinatorially correct coordinates.
4. **Nonlinear geometry:** solve for supporting planes.
5. **Verification:** prove numerically that the output realizes the requested object.
6. **Rendering:** convert the verified result into drawable data.

---

# Part IX. Milestones

## Milestone 1: exact compact combinatorics

Implement:

\[
M\longmapsto C.
\]

Deliverables:

- finite-relation graph;
- planarity and \(3\)-connectivity checks;
- unique rotation system;
- triangular dual faces;
- full primal incidence structure;
- strong unit tests.

No floating-point hyperbolic geometry yet.

## Milestone 2: Andreev validator

Implement:

\[
(C,\alpha)\longmapsto
\text{valid or explicit violations}.
\]

Deliverables:

- local spherical vertex checks;
- prismatic \(3\)-circuit enumeration;
- prismatic \(4\)-circuit enumeration;
- quadrilateral-facet conditions;
- tests against known examples.

## Milestone 3: Euclidean convex seed

Implement:

\[
C
\longmapsto
Q
\longmapsto
Q^\circ\subset B^3.
\]

Deliverables:

- convex realization of the dual;
- polar primal;
- exact combinatorial verification;
- Lorentz normal conversion.

## Milestone 4: face-normal solver

Implement:

\[
(C,\alpha,n^{(0)})
\longmapsto
(n_1,\dots,n_N).
\]

Deliverables:

- gauge-fixed residual system;
- analytic sparse Jacobian;
- robust least-squares solve;
- convergence diagnostics.

## Milestone 5: output verification

Implement:

- vertex reconstruction;
- half-space checks;
- full face-lattice comparison;
- reflection matrices;
- Klein and Poincare mesh output.

## Milestone 6: continuation

Add adaptive angle continuation for cases where the direct solve is unreliable.

## Milestone 7: cusps

Generalize the dual cellulation, vertex types, existence checks, gauge choices, and numerical verification to ideal vertices.

---

# Part X. End-to-end contract

The main public API might eventually look like:

```ts
export interface HyperbolicCoxeterPolyhedron {
  readonly combinatorics: AbstractCoxeterPolyhedron;

  /** One outward unit spacelike Lorentz normal per facet. */
  readonly faceNormals: readonly Vec4[];

  /** One Lorentz reflection matrix per Coxeter generator. */
  readonly reflections: readonly Mat4[];

  /** Hyperboloid coordinates of finite vertices. */
  readonly vertices: readonly Vec4[];

  readonly diagnostics: {
    readonly residualNorm: number;
    readonly maxAngleError: number;
    readonly maxHalfSpaceViolation: number;
    readonly combinatoricsVerified: boolean;
  };
}

export function realizeCompactCoxeterPolyhedron(
  matrix: readonly (readonly CoxeterOrder[])[]
): HyperbolicCoxeterPolyhedron;
```

Internally this function performs:

```text
validate matrix
    ↓
build finite-relation dual graph
    ↓
compute spherical planar embedding
    ↓
recover abstract primal polyhedron
    ↓
check Andreev inequalities
    ↓
construct convex Euclidean dual
    ↓
take polar and place inside Klein ball
    ↓
convert facets to Lorentz normals
    ↓
solve target angle equations
    ↓
reconstruct vertices
    ↓
verify half-space intersection and combinatorics
    ↓
construct reflection matrices
```

The output is already the desired geometric representation.

---

# References

1. Roland K. W. Roeder, **Constructing Hyperbolic Polyhedra Using Newton's Method**, *Experimental Mathematics* 16 (2007), no. 4, 463–492.  
   Preprint: <https://arxiv.org/abs/math/0603552>

2. Roland K. W. Roeder, John H. Hubbard, and William D. Dunbar, **Andreev's Theorem on Hyperbolic Polyhedra**, *Annales de l'Institut Fourier* 57 (2007), no. 3, 825–882.  
   Preprint: <https://arxiv.org/abs/math/0601146>

3. Roland K. W. Roeder, **Compact Hyperbolic Tetrahedra with Non-Obtuse Dihedral Angles**.  
   Preprint: <https://arxiv.org/abs/math/0601148>

4. Xiliang Bao and Francis Bonahon, **Hyperideal Polyhedra in Hyperbolic 3-Space**, *Bulletin de la Société Mathématique de France* 130 (2002), no. 3, 457–491.
