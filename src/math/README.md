# src/math

The numerical foundation: the Minkowski form, the geodesic engine on the
hyperboloid, and two small dense linear-algebra routines. Everything above this
layer is phrased through these and never re-derives them. No three.js beyond the
`Vector3`/`Vector4` value types.

## The mathematics

**Minkowski space.** Hyperbolic space lives inside R^{n,1} with the Lorentzian
form. We use the **time-first** convention `(t, x, y[, z])`, signature
(−,+,…,+):

$$\langle a,b\rangle = -a_t b_t + a_x b_x + a_y b_y\;(+\,a_z b_z).$$

A vector is **timelike** (⟨v,v⟩ < 0), **lightlike** (= 0), or **spacelike**
(> 0). Hyperbolic space H^n is the upper sheet of the hyperboloid
⟨p,p⟩ = −ρ² (curvature −1/ρ²; ρ = 1 here), a future-pointing timelike unit
vector. Its dual objects — geodesic hyperplanes — are the **spacelike** unit
poles ⟨n,n⟩ = +1 (de Sitter space); the half-space is { x : ⟨x,n⟩ ≤ 0 }, and
⟨p,n⟩ = 0 ⟺ p lies on the plane.

**The geodesic engine.** A tangent `v` at `p` is spacelike with ⟨p,v⟩ = 0. The
geodesic from `p` with velocity `v` is

$$\exp_p(t\,v) = \cosh\!\Big(\tfrac{t\,s}{\rho}\Big)\,p + \frac{\rho}{s}\,\sinh\!\Big(\tfrac{t\,s}{\rho}\Big)\,v,\qquad s = \sqrt{\langle v,v\rangle},$$

with `log` its inverse and `distance(p,q) = ρ·arcosh(−⟨p,q⟩/ρ²)`. These are
written once over an abstract `form`, so the identical code runs in R^{2,1} and
R^{3,1}.

**Symmetric eigendecomposition** (`symmetricEig`) is the cyclic **Jacobi**
algorithm: rotate away off-diagonal entries until the matrix is diagonal,
accumulating the orthogonal eigenvectors. It's how `coxeter/realize` diagonalizes
a Gram matrix to read off the wall normals and the signature.

## Contents

| file | contents |
|---|---|
| `minkowski.ts` | the forms `mink3` / `mink4`, and `classify` (timelike / lightlike / spacelike by sign, with tolerance) |
| `hyperboloid.ts` | the geodesic engine — `distanceH`, `expH`, `logH`, `geodesicH`, `normalizeH` — over a passed-in `form`; the minimal `Vec<V>` interface (`clone` / `multiplyScalar` / `addScaledVector`) that `Vector3`/`Vector4` satisfy |
| `symmetricEig.ts` | Jacobi eigenvalue/eigenvector decomposition of a real symmetric matrix |
| `linearSolve.ts` | `solveLinear` — Gaussian elimination with partial pivoting for small dense systems (normal equations, least-squares interiors, Newton steps) |
| `anisotropy.ts` | `radialAnisotropy` — the symmetric render-space distortion matrix (scale `rad` along a direction, `tang` across it) the Klein models use to draw a round intrinsic ball as a radially-flattened ellipsoid |

## Used by

`geometry/` builds `Geometry<P>` on the geodesic engine; `models/` use
`radialAnisotropy`; `coxeter/realize` uses `symmetricEig` + `linearSolve`; the
solvers in `coxeter/` use `linearSolve`.
