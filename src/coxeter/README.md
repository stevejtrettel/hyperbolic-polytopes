# src/coxeter

Hyperbolic **Coxeter (reflection) groups**: turn abstract Coxeter data into a
geometric reflection representation acting on H² / H³, then use it to tile the
space, build its Cayley graph, and build uniform (Wythoff) polytopes. Builds on
`geometry/` and `polytope/`; the 3D polyhedron solver lives in
[`polyhedron/`](polyhedron).

## The mathematics

**Walls and the Gram matrix.** A Coxeter polytope is a chamber cut out by
mirrors. Mirror *i* is a spacelike unit pole `n_i` (⟨n_i,n_i⟩ = 1); its
reflection is `R_i(x) = x − 2⟨x,n_i⟩ n_i ∈ O(n,1)`. The whole representation is
fixed by the **Gram matrix** `G_ij = ⟨n_i, n_j⟩`:

$$G_{ii}=1,\quad G_{ij}=-\cos(\pi/m_{ij})\ \text{(walls meet at }\pi/m_{ij}),\quad G_{ij}=-1\ \text{(parallel)},\quad G_{ij}=-\cosh \ell_{ij}<-1\ \text{(ultraparallel)}.$$

**The core difficulty.** A bare Coxeter matrix gives the adjacent entries
(−cos π/m) but *not* the ultraparallel ones: for anything past a simplex you
must know the distances ℓ_ij between non-adjacent walls, which the angles alone
don't determine (an n-gon has n−3 shape moduli). Three **ways in** supply them:

1. **Gram path** (`gram.ts` → `realize.ts`). When the Gram matrix is known
   (a simplex from its angles, or a closed form — `triangleGram`,
   `regularPolygonGram`, `rightAngledDodecahedronGram`, `pathGram`):
   `realize` Jacobi-diagonalizes `G`, checks the signature is (n,1), and reads
   off de Sitter normals in standard R^{n,1}; `buildCoxeterGroup2/3` wraps them.
2. **2D canonical (Porti)** (`canonicalPolygon.ts`). For an n-gon the angles fix
   only the vertex orders; Porti's theorem selects the unique **minimum-perimeter
   = inscribed-circle** chamber. A single monotone 1-D root solve in `t = sech r`
   yields the normals/Gram/vertices directly — no Gram guesswork, no
   diagonalization. `buildCanonicalCoxeterGroup2(adjacentOrders)`.
3. **3D polyhedron solver** ([`polyhedron/`](polyhedron)). Start from a Euclidean
   seed solid, assign a Coxeter order per edge, and solve the supporting-plane
   equations directly (Levenberg–Marquardt). Returns a `Realization` too.

**The geometric representation.** All three routes produce a `Realization`
(normals + a chamber-interior point + signature), wrapped by
`realization{2,3}ToGroup` into a `CoxeterGroup`: the reflections ρ(s_i) = R_i as
the group action. From it: `word()` / `orbit(N)` (BFS over words, geometric
matrix-key dedup via `group/`), `fundamentalDomain()` (= `fromHalfspaces`),
`tessellate(N)` (carry the chamber over the orbit), `basePoint()` (the
equidistant chamber interior — base point for the Cayley graph), and
`cayleyGraph(N)`.

**Word convention.** A word `[i₀,…,i_k]` is applied **left to right** (i₀ first):
the element is `R_{i_k}···R_{i₀}` (each new generator composed on the left).

**Wythoff** (`wythoff.ts`) is a *different* object built from the same group:
orbit a single seed point (the ringed Coxeter diagram) into a uniform
polytope/honeycomb. A cell is the seed's maximal-parabolic suborbit hulled into a
`Polytope`, carried over the orbit like the chamber — so it draws solid through
the usual `PolytopeView`.

v1 is **compact** polytopes only (timelike vertices). Element-equality is
geometric (matrix key), not a Coxeter automaton.

## Contents

| file | contents |
|---|---|
| `gram.ts` | build a Gram matrix: `gramFromLabels`, `triangleGram`, `regularPolygonGram`, `rightAngledDodecahedronGram`, `pathGram` |
| `realize.ts` | `realize(gram)` — diagonalize → normals + signature + chamber interior; `directRepresentation`; exported `interiorPoint` |
| `canonicalPolygon.ts` | Porti minimum-perimeter n-gon: `buildCanonicalCoxeterPolygon` / `…FromAngles` (+ diagnostics); `canonicalPolygonRealization` bridges to the group |
| `pairData.ts` | the canonical complete pair data `CoxeterPairData`; `coxeterMatrixToPairData` (matrix → data); and the data ↔ diagram-**view** maps `drawnEdges` (project to the edges a view shows) / `diagramToPairData` (complete a drawing back to data). A view hides one order — Coxeter hides the 2s, Artin hides the ∞s |
| `polygonSpec.ts` | `interpretCompactPolygon` — pair data → cyclic `CoxeterPolygonSpec` (finite-relation cycle + hyperbolicity check) |
| `CoxeterGroup.ts` | the `CoxeterGroup` class + `buildCoxeterGroup2/3`, `realization{2,3}ToGroup`, `buildCanonicalCoxeterGroup2`, and `coxeterPolygonGroup(pairData)` (the one-call combinatorial-data → group bridge) |
| `CoxeterPolytope.ts` | a chamber image: a `Polytope` plus the word/element that placed it |
| `words.ts` | `parseWords` — read a word list from text/files |
| `CayleyGraph.ts` / `CayleyGraphView.ts` | the combinatorial graph of W (induced on a word-ball) and its geometric realization (node g at g·basePoint, edges coloured by generator) |
| `wythoff.ts` | the Wythoff construction: `wythoffPoint` (seed) + `wythoffTessellation` (uniform cells) |
| [`polyhedron/`](polyhedron) | the 3D compact-polyhedron solver (Route B) |

## Used by

The `coxeter*`, `cayley*`, and `wythoff*` demos. Depends on `geometry/`,
`polytope/`, `group/`, `math/`, and `render/` (views).
