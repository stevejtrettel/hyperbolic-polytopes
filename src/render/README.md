# src/render

The **three.js layer**: the scene/camera harness and the geometry primitives that
turn projected points into meshes. This is the only place that knows about
three.js materials and lighting; everything above hands it canonical points and a
`Model`. Depends on `geometry/` + `models/` (for projecting points) and three.js.

## What's here

- **`App`** — owns the renderer, scene, camera, orbit controls, a light studio
  theme with image-based lighting, and the render loop. Demos (via
  `demos/_shared/viewer.ts`) add objects to its scene.
- **Geodesic tubes** (`buildTubeGeometry`) — a swept tube along a polyline with
  per-point radii. Edges are drawn by sampling the geodesic between two endpoints
  *in the chosen model* (a straight segment in Klein, a curved arc in Poincaré)
  and tubing it; the per-point radius lets the tube taper with the model's
  `jacobianAt` so it reads as a uniform hyperbolic thickness.
- **Meshes** (`meshes.ts`):
  - `vertexMesh` — a unit sphere placed at `model.project(p)` and shaped by
    `model.jacobianAt(p)` (round in conformal models, an ellipsoid in Klein).
  - `edgeMesh` — a geodesic tube between two points.
  - `faceMesh` — a face as a tessellated geodesic polygon: fan-triangulate from
    the (hyperbolic) centroid and renormalize a barycentric grid onto the
    hyperboloid, so the patch lies exactly on the face's plane.
- **Ideal boundary** (`boundary.ts`) — the objects that mark infinity for each
  model domain: `glassSphere` (ball models), `groundPlane` (upper-half space),
  `boundaryCircle` (disk models), `boundaryLine` (upper-half plane).

## Contents

| file | contents |
|---|---|
| `App.ts` | the `App` harness: renderer, scene, camera, controls, IBL lighting, render loop |
| `tube.ts` | `buildTubeGeometry(points, radii, segments)` |
| `meshes.ts` | `vertexMesh`, `edgeMesh`, `faceMesh` |
| `boundary.ts` | `glassSphere`, `groundPlane`, `boundaryCircle`, `boundaryLine` |

## Used by

`polytope/PolytopeView`, `coxeter/CayleyGraphView`, and `demos/_shared/viewer.ts`
(which picks the camera framing + boundary from the model's `renderDim`/`domain`).
