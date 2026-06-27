# hyperbolic-polytopes

Visualization software for 2D and 3D **hyperbolic polytopes** — convex polytopes
in H² and H³, built from their vertices or their bounding half-spaces and drawn
through swappable coordinate models. TypeScript + three.js + Vite.

## Quick start

```bash
npm install
npm run dev polygons            # convex H² polygons (hull / half-space), with a model dropdown
npm run dev polytopes           # convex H³ polytopes, with a model dropdown
npm run dev coxeter2D           # Coxeter polygons + their tilings (polygon · model · orbit-depth)
npm run dev coxeter3D           # Coxeter polytopes + honeycombs (incl. the right-angled dodecahedron)
npm run dev coxeterWords2D      # H² images of the fundamental domain under a word list (edit words.txt)
npm run dev coxeterWords3D      # H³ images of the fundamental cell under a word list
npm run dev cayley2D            # the Cayley graph of a 2D Coxeter group (edges coloured by generator)
npm run dev cayley3D            # the Cayley graph of a 3D Coxeter group
npm run dev polygons coxeter2D  # run several at once (one server per demo: :5173, :5174, …)
npm run test                    # the polytope + Coxeter behavior tests
```

Demos live in `demos/<name>/main.ts` — that's the only file; the HTML page is
synthesized by a Vite plugin, so there are no `index.html` files to manage. A
bare `npm run dev <name>` opens `/demos/<name>/`, and the dev server root `/`
lists every demo.

## How it works

A hyperbolic polytope is described in Minkowski space R^{n,1}: **vertices** are
timelike points on the hyperboloid ⟨v,v⟩ = −1, **facets** are spacelike poles
⟨n,n⟩ = +1 bounding a half-space ⟨x,n⟩ ≤ 0. In the **Klein (projective) model**
geodesics and geodesic planes are straight, so the combinatorics of a hyperbolic
polytope is exactly that of an ordinary Euclidean convex polytope there. We
compute that combinatorics once — it is model-independent — and then draw the
canonical points through any model:

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

## Status

First slice: the **polytope-from-data** engine (vertices ↔ half-spaces → full
V/E/F lattice) and draw commands for vertices, edges, and faces, for **finite**
(compact) polytopes. Ideal/hyperideal vertices, Coxeter-group tessellations,
Wythoff uniform polytopes, Dirichlet domains, shaders, and interactivity are
planned. See `CLAUDE.md` for the architecture.
