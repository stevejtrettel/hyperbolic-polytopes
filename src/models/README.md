# src/models

The **coordinate models** (charts): each turns a canonical hyperboloid point into
renderable coordinates. The geometry and combinatorics are computed once,
model-free; a `Model` is only the final picture, so the same polytope can be
redrawn in any chart by swapping the model. Depends on `geometry/` and `math/`.

## The mathematics

A `Model<P>` provides `project(p): Vector3` (canonical point → render space),
`jacobianAt(p)` (the chart's local linear distortion, so a unit *intrinsic* ball
renders with the right shape), a `renderDim` (2 or 3), and a `domain` (the
ideal-boundary shape: `disk` / `sphere` / `halfplane` / `plane`). For a point
`(t, x, y[, z])` on the hyperboloid:

- **Klein (projective):** `y_K = (spatial)/t`. Geodesics and geodesic planes are
  **straight** — which is exactly why polytope combinatorics is Euclidean here.
  The metric is **anisotropic**, so a round intrinsic ball renders as a radially
  flattened ellipsoid; `jacobianAt` uses `math/radialAnisotropy`. Domain: the
  unit disk / ball.
- **Poincaré (conformal):** `y_P = (spatial)/(t+1)`. **Angle-preserving** — balls
  render round (`jacobianAt` is a scalar); geodesics are circular arcs meeting
  the boundary at right angles. Domain: the unit disk / ball.
- **Upper-half:** a Möbius image of the Poincaré model; also conformal, with the
  ideal boundary a line (2D) / plane (3D). Domain: `halfplane` / `plane`.

## Contents

| file | contents |
|---|---|
| `types.ts` | the `Model<P>` interface and `Domain` (boundary-shape union) |
| `KleinDisk.ts` / `KleinBall.ts` | the projective model (straight geodesics, anisotropic) in H² / H³ |
| `PoincareDisk.ts` / `PoincareBall.ts` | the conformal disk/ball model |
| `UpperHalfPlane.ts` / `UpperHalfSpace.ts` | the conformal upper-half model |

## Used by

`polytope/PolytopeView` and the `render/` meshes (which call `project` /
`jacobianAt`); every demo picks a model from a dropdown. The viewer reads
`renderDim` + `domain` to frame the camera and draw the ideal boundary.
