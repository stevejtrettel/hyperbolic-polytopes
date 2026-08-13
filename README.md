# hyperbolic-polytopes

Visualization software for 2D and 3D **hyperbolic polytopes** — convex polytopes
in H² and H³, the **Coxeter reflection groups** that tile hyperbolic space, and
the **uniform (Wythoff)** tilings built from them — drawn through swappable
coordinate models. TypeScript + three.js + Vite.

## Quick start

```bash
npm install
# polytopes from data
npm run dev polygons            # convex H² polygons (hull / half-space), model dropdown
npm run dev polytopes           # convex H³ polytopes, model dropdown
# Coxeter groups: chambers + their tilings/honeycombs
npm run dev coxeter2D           # Coxeter polygons + tilings (shape · model · orbit-depth)
npm run dev coxeter3D           # Coxeter polytopes + honeycombs (Lannér simplices, right-angled dodecahedron)
npm run dev coxeterPolygon2D    # canonical n-gon from a list of vertex orders (regular & irregular)
npm run dev coxeterInput        # build a 2D Coxeter group by drawing a diagram (interactive editor; Coxeter/Artin views of the same data)
npm run dev coxeterPolyhedron3D # solved compact polyhedron from a seed solid + edge orders
npm run dev coxeterWords2D      # H² images of the chamber under a word list (edit words.txt)
npm run dev coxeterWords3D      # H³ images of the chamber under a word list
# uniform polytopes
npm run dev wythoff2D           # Wythoff uniform tilings of H² (ring toggles)
npm run dev wythoff3D           # Wythoff uniform honeycombs of H³
# Cayley graphs
npm run dev cayley2D            # Cayley graph of a 2D Coxeter group (edges coloured by generator)
npm run dev cayley3D            # Cayley graph of a 3D Coxeter group
npm run dev polygons coxeter2D  # run several at once (one server per demo: :5173, :5174, …)
npm run test                    # vitest behavior tests
npm run typecheck               # tsc --noEmit (strict)
```

Demos live in `demos/<name>/main.ts` — that's the only file; the HTML page is
synthesized by a Vite plugin, so there are no `index.html` files to manage. A
bare `npm run dev <name>` opens `/demos/<name>/`, and the dev-server root `/`
lists every demo.

## How it works

Everything is **Minkowski linear algebra** in R^{n,1} (a `Vector3` `(t,x,y)` for
H², a `Vector4` `(t,x,y,z)` for H³, time component first). A hyperbolic polytope
is described there: **vertices** are timelike points on the hyperboloid
⟨v,v⟩ = −1, **facets** are spacelike poles ⟨n,n⟩ = +1 bounding a half-space
⟨x,n⟩ ≤ 0. Points and planes are projectively dual.

In the **Klein (projective) model** geodesics and geodesic planes are *straight*,
so the combinatorics of a hyperbolic polytope is exactly that of an ordinary
Euclidean convex polytope there. We compute that combinatorics once — it is
model-independent — and then draw the canonical points through any model:

| | 2D (H²) | 3D (H³) |
|---|---|---|
| Klein | `KleinDisk` | `KleinBall` |
| Poincaré | `PoincareDisk` | `PoincareBall` |
| Upper-half | `UpperHalfPlane` | `UpperHalfSpace` |

```ts
import { Hyperbolic3 } from './src/geometry/Hyperbolic3';
import { PoincareBall } from './src/models/PoincareBall';
import { fromVertices3 } from './src/polytope/build';
import { PolytopeView } from './src/polytope/PolytopeView';

const geom = new Hyperbolic3(-1);
const polytope = fromVertices3(geom, vertices);          // geodesic convex hull
scene.add(new PolytopeView(polytope, geom, new PoincareBall(geom)));
```

Build from half-spaces instead with `fromHalfspaces3(geom, facets)` (and the 2D
counterparts `fromVertices2` / `fromHalfspaces2`).

## Coxeter groups

A Coxeter (reflection) group is realized from a **Gram matrix** of its wall
inner products, `G_ij = ⟨n_i, n_j⟩`. The bottleneck is producing that matrix:
for anything past a simplex, the non-adjacent (ultraparallel) entries encode
distances the abstract Coxeter data doesn't give you. There are three **ways in**:

1. **Gram path** — when you can write the Gram matrix directly (triangles /
   simplices from angles, or the closed forms in `coxeter/gram.ts`):
   `buildCoxeterGroup2/3(gram)`.
2. **2D canonical (Porti)** — for general n-gons, where the angles leave n−3 shape
   moduli: `buildCanonicalCoxeterGroup2(adjacentOrders)` picks the unique
   minimum-perimeter chamber via a 1-D root solve.
3. **3D polyhedron solver** — for compact polyhedra: start from a Euclidean seed
   solid, assign a Coxeter order per edge, and solve for the supporting planes
   (`coxeter/polyhedron/realizeCoxeterPolyhedron`).

Either way you get a `CoxeterGroup`: the geometric representation (mirrors,
reflections), the fundamental chamber, `tessellate(N)` (carry the chamber over
the orbit), the `CayleyGraph`, and the **Wythoff** construction (orbit a seed
point into a uniform polytope — `coxeter/wythoff.ts`).

## Source layout

Each `src/` subfolder has a `README.md` covering its contents and the
mathematics. The dependency direction is top-to-bottom:

| folder | what it is |
|---|---|
| [`src/math`](src/math) | Minkowski form, the hyperboloid geodesic engine, symmetric eigendecomposition, linear solve |
| [`src/geometry`](src/geometry) | `Geometry<P>` (H² / H³) and `Hyperplane<P>` — intrinsic hyperbolic geometry |
| [`src/models`](src/models) | `Model<P>`: Klein / Poincaré / upper-half charts that turn canonical points into renderable coordinates |
| [`src/polytope`](src/polytope) | `Polytope<P>` (V/E/F lattice), hull / half-space builders, isometry transforms, `PolytopeView` |
| [`src/coxeter`](src/coxeter) | Gram → realization, the canonical-polygon and polyhedron solvers, `CoxeterGroup`, Cayley graphs, Wythoff |
| [`src/group`](src/group) | orbit enumeration (BFS over generators, geometric dedup) |
| [`src/render`](src/render) | the three.js harness: app, geodesic tubes, vertex/edge/face meshes, ideal-boundary objects |

See [`CLAUDE.md`](CLAUDE.md) for terse working guidance and conventions.

## Status

The **polytope engine** (vertices ↔ half-spaces → full V/E/F lattice) and all
three **Coxeter realization** paths are implemented for **compact** polytopes,
along with chamber tilings, Cayley graphs, and Wythoff uniform tilings/
honeycombs. Planned: ideal/hyperideal (cusped) vertices, a robust 3D solver
(angle continuation + gauge-fixing) for asymmetric polyhedra, Dirichlet domains,
and matrix→combinatorics inference for the 3D solver. See the per-folder READMEs.
