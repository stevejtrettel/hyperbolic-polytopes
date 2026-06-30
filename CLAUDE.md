# CLAUDE.md

Guidance for working in this repo. Read this first.

## What this is

`hyperbolic-polytopes` visualizes 2D and 3D **hyperbolic polytopes** — convex
polytopes in H² and H³ — built from either their vertices or their bounding
half-spaces, and drawn through swappable coordinate models (Klein, Poincaré,
upper-half). TypeScript + three.js + Vite. The user is a mathematician;
correctness and clean, close-to-the-math abstractions matter.

## Commands

- `npm run dev <demo>` — run a demo (Vite). Demos live in `demos/<name>/main.ts`;
  `scripts/run-demo.mjs` rewrites the `<script>` in the shared `index.html`.
- `npm run build <demo>` / `npm run preview <demo>`.
- `npm run typecheck` — `tsc --noEmit` (strict; `noUnusedLocals/Parameters`;
  `erasableSyntaxOnly` → **no TS parameter-properties / enums**).
- `npm run test` — vitest (`tests/*.test.ts`).

## The core idea (read this before touching the polytope engine)

Everything is Minkowski linear algebra. Ambient space is R^{2,1} (a Vector3
`(t,x,y)`) for H², R^{3,1} (a Vector4) for H³, with the form in `math/minkowski`.

- **Vertices** are timelike unit points on the hyperboloid ⟨v,v⟩ = -1.
- **Half-spaces** are spacelike unit poles ⟨n,n⟩ = +1 (`geometry/Hyperplane`);
  the half-space is { x : ⟨x,n⟩ ≤ 0 }. Points and planes are projectively dual.
- **Convex hull = Euclidean hull in the Klein chart.** Klein geodesics/planes are
  straight, so the combinatorics of a hyperbolic polytope is plain Euclidean
  convex geometry there. We compute the *combinatorics* via brute-force facet
  enumeration (degeneracy-robust; the symmetric polytopes we care about are
  maximally degenerate), and that incidence is **model-free** — store canonical
  points, draw through any model. We never hull on the hyperboloid itself.

## Architecture (each layer depends only on the ones above)

```
math/        minkowski (forms + causal classify), hyperboloid (exp/log/distance), anisotropy, symmetricEig (Jacobi)
geometry/    Geometry<P> (Hyperbolic2 Vector3 / Hyperbolic3 Vector4); Hyperplane<P> (pole/reflect/bisector)
models/      Model<P>: KleinDisk/PoincareDisk/UpperHalfPlane (2D) + KleinBall/PoincareBall/UpperHalfSpace (3D)
polytope/    Polytope<P> (V/E/F lattice), build.ts (fromVertices / fromHalfspaces, 2D + 3D), PolytopeView
coxeter/     gram (Gram from angles/lengths; regularPolygonGram; rightAngledDodecahedronGram), realize (directRepresentation + diagonalize→normals+signature, returns a `Realization`), canonicalPolygon (Porti minimum-perimeter n-gon: adjacent orders → normals/Gram/vertices via a 1-D root solve, no Gram needed; `canonicalPolygonRealization` bridges to the group), pairData + polygonSpec (lean input spine: Coxeter matrix → `CoxeterPairData` → cyclic polygon spec), polyhedron/ (3D Route-B solver: seeds (Euclidean seed solids → face planes → Lorentz normals; dodecahedron, truncated icosahedron/octahedron/tetrahedron, cube, n-prisms — all simple/trivalent), combinatorics (facet adjacency via the hull engine), edgeOrdering (uniform / by-face-type / matching / independent-edges schemes), andreev (compact-existence inequalities: local + prismatic-3), solve (Levenberg–Marquardt face-normal solve), realizePolyhedron (orchestrator → `Realization`)), CoxeterGroup (the representation: mirrors, reflections, word/image/images/orbit/tessellate/neighbor, fundamentalDomain, basePoint, cayleyGraph; `buildCoxeterGroup2/3` from Gram, `realization{2,3}ToGroup` from a `Realization`, `buildCanonicalCoxeterGroup2` from adjacent orders), words (parseWords), CayleyGraph + CayleyGraphView (graph of W realized via the orbit of a base point; edges coloured by generator), wythoff (the Wythoff/kaleidoscopic construction — a UNIFORM polytope/honeycomb, a different object from the chamber: the ringed Coxeter diagram fixes a seed point; each CELL is the seed's maximal-parabolic suborbit hulled into a `Polytope`, then `tessellate`-d over the orbit and deduped by centroid, so it draws solid through the usual `PolytopeView`; targets simplex chambers)
group/       orbit.ts (BFS over words in generators, geometric dedup)
render/      App harness (light theme + IBL), tube.ts, meshes.ts, boundary.ts (glassSphere / groundPlane / boundaryCircle / boundaryLine)
demos/       _shared/viewer.ts (App + model dropdown + camera/boundary scaffold; `show` for polytopes, `display` for any object e.g. a Cayley graph); polygons, polytopes (model dropdown); coxeter2D, coxeter3D (shape · model · orbit-depth); coxeterPolygon2D (canonical n-gon from adjacent orders, incl. irregular); coxeterPolyhedron3D (solved compact polyhedron from a seed + edge orders); wythoff2D, wythoff3D (Wythoff uniform tilings/honeycombs: triangle/tetrahedral group · ring toggles · model · depth); coxeterWords2D, coxeterWords3D (images of an explicit word list); cayley2D, cayley3D (Cayley graph · model · radius)
```

**Coxeter pipeline** (`coxeter/`): a Gram matrix $G_{ij}=\langle n_i,n_j\rangle$ (−cos(π/m), −1, or −cosh ℓ) →
`directRepresentation` (form = G, normals = e_i, reflections = root reflections; not drawn) →
`realize` (Jacobi-diagonalize, check signature (n,1), read off de Sitter normals in standard R^{n,1}; drop
zero eigenvalues so rank-3 → H², rank-4 → H³) → `buildCoxeterGroup2/3(gram)` wraps it as a **`CoxeterGroup`**:
the geometric representation ρ(s_i) = R_i ∈ O(n,1) (`reflections`/`mirrors`), with the reflections
implemented as the group action — `word()`, `orbit(N)` (BFS over words, geometric dedup via `group/orbit`),
`fundamentalDomain()` (= `fromHalfspaces(mirrors)`), and `tessellate(N)` (carry the chamber over the orbit).
v1 is COMPACT polytopes only (compact triangles/polygons in H², Lannér simplices + the right-angled
dodecahedron in H³); non-compact (ideal/hyperideal) cases are detected and warned, not yet drawn.
Element-equality is geometric (matrix key), not a Coxeter automaton (deferred).

**Two ways in.** (1) The *Gram path* above, when you can write the Gram matrix (triangles/simplices from
angles, or the closed forms in `gram.ts`). (2) The *canonical path* for general n-gons, where the Coxeter
data fixes only the vertex angles and leaves n−3 shape moduli (the ultraparallel side-distances are
unknown): `buildCanonicalCoxeterGroup2(adjacentOrders)` uses Porti's theorem to pick the unique
minimum-perimeter (inscribed-circle) chamber via a 1-D bisection, producing the normals directly — no
hand-derived Gram, no diagonalization. The lean input spine (`pairData` → `polygonSpec`) turns a raw
Coxeter matrix into the cyclic adjacent-order list that path consumes. (3) The *polyhedron-solver path*
in H³ (`coxeter/polyhedron`, "Route B"): start from a Euclidean SEED solid of the target combinatorial
type, read its combinatorics off the existing hull engine, assign a Coxeter order per edge, Andreev-gate
existence, then `realizeCoxeterPolyhedron(seed, order)` SOLVES (Levenberg–Marquardt on ⟨n_i,n_i⟩=1 and
⟨n_i,n_j⟩=−cos(π/m_ij)) for the supporting planes — the 3D analogue of Porti, but a damped Gauss–Newton
solve, not a scalar root — and verifies the solved normals realize the same combinatorics before handing a
`Realization` to `realization3ToGroup`. v1 ships several simple (trivalent) seeds — dodecahedron,
truncated icosahedron/octahedron/tetrahedron, cube, n-prisms — each with a family of edge-order assignments (`edgeOrdering`: uniform /
by-face-type / matching / independent-edges). All realize to machine precision via the direct LM solve
(the symmetric Euclidean seed is geometrically close): the fullerene seeds right-angled + angle families,
and the **cube → Lambert cube** (compact Coxeter cube: 3 mutually non-coplanar/non-adjacent edges at π/m,
9 at π/2) via `independentEdgeOrder`. (A uniform/right-angled cube is Euclidean, so the cube ONLY realizes
under the independent-edge scheme; the demo defaults it there.) `realizeCoxeterPolyhedron`'s `maxResidual`
is a lenient acceptance net (default 1e-8). Andreev v1 checks local + prismatic-3 only (no prismatic
4-/n-circuit), so for cube-type seeds the solve + combinatorics verification is the real existence gate.
Larger/asymmetric targets that the direct seed can't reach would need Roeder-style angle continuation +
gauge-fixing (explored, not landed; see COX_COMPUTE). Matrix→combinatorics inference ("Route A") is the
other extension.

**Word convention**: a word [i₀,…,i_k] is applied LEFT TO RIGHT (i₀ first); the element is the product
R_{i_k}···R_{i₀} (each generator composed on the left). `word()` and `orbit()` both follow this.
`image(word)` / `images(words)` draw the corresponding images of the fundamental domain; `coxeter/words`
parses word lists from text/files for them.

Generic over the canonical point type `P` (Vector3 / Vector4); the engine and
render layer never branch on dimension except where genuinely necessary
(vertex-solve cross products, face-loop ordering).

Key render trick: a vertex is a unit sphere transformed by `model.jacobianAt`
(round in conformal models, an ellipsoid in Klein). A face is tessellated by
renormalizing barycentric combinations of its vertices onto the hyperboloid —
they stay *exactly* on the face's hyperbolic plane (flat in Klein, a cap in the
ball), so no geodesic interpolation is needed.

## Scope / TODO

- v1 is **finite (compact) polytopes only** — vertices live on the hyperboloid.
  `Polytope.vertexKind` is carried so **ideal (lightlike) / hyperideal
  (spacelike)** vertices can be added later. The vertex-solve in `build.ts`
  currently skips non-timelike intersections (search `TODO`).
- Edge detection uses the "share ≥ d-1 facets" rule; fine for the polytopes we
  build, but exotic degeneracy could need a more careful 1-face test.
- Later: Coxeter/reflection-group tessellations (engine 2 = orbit BFS), Wythoff
  uniform polytopes, Dirichlet domains (`Hyperplane.bisector` is the seed),
  shaders, interactivity (a reactive param graph).

## Working norms

- Verify geometry claims with throwaway `node` scripts / vitest before asserting.
- Don't create branches or commit unless asked. Commit messages end with the
  `Co-Authored-By: Claude` line.
