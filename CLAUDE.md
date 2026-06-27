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
coxeter/     gram (Gram from angles/lengths; regularPolygonGram; rightAngledDodecahedronGram), realize (directRepresentation + diagonalize→normals+signature), CoxeterGroup (the representation: mirrors, reflections, word/image/images/orbit/tessellate/neighbor, fundamentalDomain, basePoint, cayleyGraph), words (parseWords), CayleyGraph + CayleyGraphView (graph of W realized via the orbit of a base point; edges coloured by generator)
group/       orbit.ts (BFS over words in generators, geometric dedup)
render/      App harness (light theme + IBL), tube.ts, meshes.ts, boundary.ts (glassSphere / groundPlane / boundaryCircle / boundaryLine)
demos/       _shared/viewer.ts (App + model dropdown + camera/boundary scaffold; `show` for polytopes, `display` for any object e.g. a Cayley graph); polygons, polytopes (model dropdown); coxeter2D, coxeter3D (shape · model · orbit-depth); coxeterWords2D, coxeterWords3D (images of an explicit word list); cayley2D, cayley3D (Cayley graph · model · radius)
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
