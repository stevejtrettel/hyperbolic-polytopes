# Canonical Hyperbolic Coxeter Polygons from Porti's Minimum-Perimeter Theorem

## Purpose

This note specifies a canonical geometric realization for a hyperbolic Coxeter polygon when the abstract Coxeter data determines the consecutive mirror angles but does not determine the polygonal shape.

The intended application is visualization software in which:

- users specify a Coxeter group abstractly;
- elements are represented as words in distinguished reflections;
- the software constructs a geometric reflection representation;
- that representation is used to draw chambers, tilings, Cayley graphs, and related objects.

For a hyperbolic triangle, the Coxeter angles determine the chamber uniquely up to isometry. For an \(n\)-gon with \(n>3\), they do not: fixed-angle hyperbolic \(n\)-gons have \(n-3\) moduli.

The canonical convention adopted here is:

> **Among all compact convex hyperbolic polygons with the prescribed cyclic angle list, choose the unique polygon of minimum perimeter.**

By a theorem of Joan Porti, this is equivalently:

> **Choose the unique polygon with an inscribed hyperbolic circle tangent to every side.**

The theorem supplies the canonicality. Porti's uniqueness proof also leads to a direct construction requiring only a one-dimensional monotone root solve. There is no need to optimize over the full \((n-3)\)-dimensional moduli space.

---

## 1. Scope

This document treats a cyclically ordered list of **compact** hyperbolic polygon angles

\[
0<\beta_i<\pi,
\qquad i=0,\ldots,n-1,
\]

satisfying

\[
\sum_{i=0}^{n-1}(\pi-\beta_i)>2\pi.
\]

Equivalently,

\[
\sum_{i=0}^{n-1}\beta_i<(n-2)\pi.
\]

For Coxeter polygons,

\[
\beta_i=\frac{\pi}{m_i},
\qquad m_i\in\{2,3,4,\ldots\},
\]

where \(m_i\) is the order of the product of the reflections in side \(i\) and side \(i+1\).

### Not covered in the first implementation

Porti's theorem, as stated in the paper, assumes \(0<\beta_i<\pi\), so the first implementation should reject:

- ideal vertices, for which \(\beta_i=0\) or \(m_i=\infty\);
- hyperideal or truncated vertices;
- noncompact chambers;
- spherical and Euclidean chambers;
- higher-dimensional Coxeter polytopes.

The formula has a natural limiting behavior as \(\beta_i\to0\), but ideal vertices should be added only as a deliberate second step with separate tests.

---

## 2. Mathematical source

The source is:

> Joan Porti, *Hyperbolic polygons of minimal perimeter with given angles*,  
> **Geometriae Dedicata** 156 (2012), 165–170.  
> DOI: `10.1007/s10711-011-9597-9`  
> arXiv: `1010.1380`

Porti fixes an ordered angle list and studies the space \(\mathcal P\) of compact convex hyperbolic polygons with those angles.

The main theorem is:

> The perimeter has a unique global minimum on \(\mathcal P\), realized by the unique polygon possessing an inscribed circle tangent to every edge.

The proof is organized around the following facts.

1. The space of polygons with fixed ordered angles is a smooth analytic manifold of codimension \(3\) in edge-length space.
2. A polygon is a critical point of perimeter exactly when it has an inscribed circle.
3. Boundary points of the polygon space, where edges collapse, admit inward deformations that strictly decrease perimeter.
4. There is exactly one polygon with an inscribed circle.

For implementation, item 4 is the constructive part. Porti proves it by decomposing a tangential polygon into quadrilaterals around the incenter and solving a scalar closure condition.

### Important attribution distinction

Porti's paper establishes the theorem and the monotone one-variable uniqueness argument. The explicit formulas below for the closure angles, Lorentz normals, Gram matrix, vertices, and reflection matrices are derived here for implementation; they are not all written explicitly in the paper.

---

## 3. Why this convention is canonical

The abstract polygon Coxeter presentation records the consecutive angles but generally leaves \(n-3\) geometric moduli.

The minimum-perimeter convention has several desirable properties.

### 3.1 Intrinsic

It is defined using only hyperbolic geometry and the prescribed ordered angle list.

### 3.2 Unique up to isometry

Porti's theorem gives a unique minimizing polygon up to hyperbolic isometry.

### 3.3 Equivariant under relabeling

Cyclic reindexing or reversal of the angle list changes the coordinate placement of the output but not its intrinsic geometry.

### 3.4 Symmetry-preserving

Suppose the angle sequence has a combinatorial symmetry, such as a cyclic shift or reversal preserving all labels. Applying that relabeling to the canonical polygon produces another minimum-perimeter polygon with the same ordered angles. By uniqueness, it must be congruent to the original polygon.

Thus every symmetry of the labeled cyclic angle data is realized geometrically.

When all angles are equal, this recovers the usual regular polygon.

### 3.5 Balanced with respect to the walls

The canonical polygon has a point \(o\) satisfying

\[
d(o,H_i)=r
\]

for every side mirror \(H_i\). Thus all reflecting walls sit at the same hyperbolic distance from a distinguished center.

This is a precise replacement for the informal goal of making the chamber "as symmetric as possible."

### 3.6 Better behaved than diameter minimization

Minimum diameter is a plausible aesthetic rule, but it is not the convention used here because:

- the diameter is a nonsmooth maximum;
- the pair of points realizing the diameter can change;
- uniqueness is not automatic;
- it does not directly produce a constructive formula.

The minimum-perimeter/incircle convention is proven unique and directly computable.

---

## 4. Lorentz-model conventions

Use

\[
\mathbb R^{2,1}=\mathbb R^3
\]

with bilinear form

\[
\langle x,y\rangle
=
x_0y_0+x_1y_1-x_2y_2.
\]

In matrix notation,

\[
J=\operatorname{diag}(1,1,-1),
\qquad
\langle x,y\rangle=x^{\mathsf T}Jy.
\]

The hyperboloid model is

\[
\mathbb H^2
=
\{x\in\mathbb R^{2,1}:
\langle x,x\rangle=-1,\ x_2>0\}.
\]

A geodesic mirror is represented by a unit spacelike normal \(e\):

\[
\langle e,e\rangle=1,
\]

with mirror

\[
H_e=\{x\in\mathbb H^2:\langle x,e\rangle=0\}.
\]

We orient the normal outward, so the polygonal half-space is

\[
\langle x,e\rangle\le 0.
\]

Reflection in \(H_e\) is

\[
R_e(x)=x-2\langle x,e\rangle e.
\]

As a matrix acting on column vectors,

\[
R_e=I-2ee^{\mathsf T}J.
\]

For two consecutive outward unit normals \(e_i,e_{i+1}\) whose mirrors meet at interior angle \(\beta_i\),

\[
\langle e_i,e_{i+1}\rangle=-\cos\beta_i.
\]

This document uses the coordinate order \((x,y,t)\) and signature \((+,+,-)\). Porti uses an equivalent sign/order convention. Do not mix the two conventions inside one implementation.

---

## 5. Porti's quadrilateral decomposition

Let \(P\) be a tangential polygon with:

- incenter \(o\);
- inradius \(r>0\);
- prescribed vertex angles \(\beta_i\).

At vertex \(v_i\), draw the two radius segments from \(o\) to the tangency points on the two incident sides. Together with the two tangent segments from \(v_i\), these form a quadrilateral whose ordered angles are

\[
\beta_i,\quad \frac{\pi}{2},\quad \theta_i(r),\quad \frac{\pi}{2}.
\]

The two sides adjacent to the angle \(\theta_i(r)\) have length \(r\).

The quadrilaterals glue around the incenter exactly when

\[
\sum_{i=0}^{n-1}\theta_i(r)=2\pi.
\]

Porti proves that:

\[
\theta_i(0)=\pi-\beta_i,
\]

\[
\theta_i(r)\to0
\quad\text{as }r\to\infty,
\]

and \(\theta_i(r)\) is strictly decreasing. Therefore the closure equation has exactly one solution.

For code, we now derive an explicit formula.

---

## 6. Explicit closure-angle formula

Place the incenter at

\[
o=(0,0,1).
\]

Every outward unit normal to a mirror at distance \(r\) from \(o\) can be written

\[
e(\phi)=
\begin{pmatrix}
\cosh r\cos\phi\\
\cosh r\sin\phi\\
\sinh r
\end{pmatrix}.
\]

Indeed,

\[
\langle e(\phi),e(\phi)\rangle=1
\]

and

\[
\langle o,e(\phi)\rangle=-\sinh r.
\]

The oriented distance formula therefore puts every mirror at distance \(r\) from \(o\).

Let consecutive normals have angular difference

\[
\theta_i=\phi_{i+1}-\phi_i.
\]

Then

\[
\langle e(\phi_i),e(\phi_{i+1})\rangle
=
\cosh^2r\cos\theta_i-\sinh^2r.
\]

To realize interior angle \(\beta_i\), require

\[
\cosh^2r\cos\theta_i-\sinh^2r
=
-\cos\beta_i.
\]

Using \(\cosh^2r-\sinh^2r=1\),

\[
\cos\theta_i
=
1-\frac{1+\cos\beta_i}{\cosh^2r}.
\]

Because

\[
1+\cos\beta_i=2\cos^2\frac{\beta_i}{2},
\]

we get

\[
\sin\frac{\theta_i}{2}
=
\frac{\cos(\beta_i/2)}{\cosh r}.
\]

Hence

\[
\boxed{
\theta_i(r)
=
2\arcsin\left(
\frac{\cos(\beta_i/2)}{\cosh r}
\right).
}
\]

The relevant branch satisfies

\[
0<\theta_i<\pi.
\]

---

## 7. Reparameterize by \(t=\operatorname{sech}r\)

For numerical work, do not solve directly for \(r\). Define

\[
t=\operatorname{sech}r=\frac1{\cosh r},
\qquad 0<t<1.
\]

Then

\[
\boxed{
\theta_i(t)
=
2\arcsin\left(
t\cos\frac{\beta_i}{2}
\right).
}
\]

Define the closure function

\[
F(t)
=
\sum_{i=0}^{n-1}
2\arcsin\left(
t\cos\frac{\beta_i}{2}
\right)
-2\pi.
\]

We have

\[
F(0)=-2\pi.
\]

At \(t=1\),

\[
2\arcsin\left(\cos\frac{\beta_i}{2}\right)
=
\pi-\beta_i,
\]

because \(0<\beta_i<\pi\). Therefore

\[
F(1)
=
\sum_i(\pi-\beta_i)-2\pi
>0.
\]

Also,

\[
F'(t)
=
\sum_i
\frac{
2\cos(\beta_i/2)
}{
\sqrt{1-t^2\cos^2(\beta_i/2)}
}
>0.
\]

Thus:

\[
\boxed{
F:[0,1]\to\mathbb R
\text{ is strictly increasing and has a unique zero.}
}
\]

This makes bisection an ideal solver.

After solving for \(t\),

\[
\cosh r=\frac1t,
\]

\[
\sinh r=\frac{\sqrt{1-t^2}}{t},
\]

\[
r=\operatorname{arcosh}\frac1t.
\]

For slightly improved floating-point behavior near \(t=1\), compute

```ts
const sinhR = Math.sqrt((1 - t) * (1 + t)) / t;
```

rather than first forming `1 - t * t`.

---

## 8. Complete geometric construction

### 8.1 Input convention

The input is a cyclic angle list

\[
(\beta_0,\ldots,\beta_{n-1}).
\]

Angle \(\beta_i\) is the angle at the vertex where side \(i\) meets side \(i+1\), with indices modulo \(n\).

For a Coxeter polygon:

\[
\beta_i=\frac{\pi}{m_i},
\]

where \(m_i=\operatorname{ord}(s_is_{i+1})\).

### 8.2 Solve for the inradius parameter

Find the unique \(t\in(0,1)\) satisfying

\[
F(t)=0.
\]

### 8.3 Compute normal gaps

Set

\[
\theta_i
=
2\arcsin\left(
t\cos\frac{\beta_i}{2}
\right).
\]

These are the angular gaps between consecutive outward normals.

### 8.4 Fix a coordinate gauge

Set

\[
\phi_0=0,
\]

and recursively

\[
\phi_{i+1}=\phi_i+\theta_i.
\]

The closure equation implies

\[
\phi_n=2\pi.
\]

The choices \(o=(0,0,1)\) and \(\phi_0=0\) remove the ambient isometry freedom. They are coordinate conventions, not additional geometry.

### 8.5 Construct outward unit normals

Define

\[
\boxed{
e_i=
\begin{pmatrix}
\cos\phi_i/t\\
\sin\phi_i/t\\
\sqrt{1-t^2}/t
\end{pmatrix}.
}
\]

Then

\[
\langle e_i,e_i\rangle=1,
\]

and

\[
\langle o,e_i\rangle
=
-\frac{\sqrt{1-t^2}}{t}
=
-\sinh r.
\]

Thus all side mirrors are tangent to the same circle centered at \(o\).

### 8.6 Construct the Gram matrix

The direct formula is

\[
G_{ij}
=
\langle e_i,e_j\rangle
=
\frac{\cos(\phi_i-\phi_j)}{t^2}
-
\frac{1-t^2}{t^2}.
\]

A more stable equivalent expression is

\[
\boxed{
G_{ij}
=
1-
2\left(
\frac{
\sin((\phi_i-\phi_j)/2)
}{t}
\right)^2.
}
\]

This avoids subtracting two large, nearly equal hyperbolic quantities.

Automatically,

\[
G_{ii}=1,
\]

and

\[
G_{i,i+1}=-\cos\beta_i.
\]

The matrix has rank at most \(3\) because its entries come from vectors in \(\mathbb R^{2,1}\). For a nondegenerate polygon its signature is

\[
(2,1,n-3\text{ zero directions}).
\]

### 8.7 Construct reflection matrices

For each normal \(e_i\),

\[
\boxed{
R_i=I-2e_ie_i^{\mathsf T}J.
}
\]

Then

\[
R_i^2=I,
\]

\[
R_i^{\mathsf T}JR_i=J,
\]

and \(R_i\) fixes \(H_i\) pointwise.

For a Coxeter angle \(\beta_i=\pi/m_i\),

\[
(R_iR_{i+1})^{m_i}=I.
\]

### 8.8 Construct vertices

Vertex \(v_i\) is the intersection of mirrors \(H_i\) and \(H_{i+1}\).

Define the Lorentz cross product by

\[
u\boxtimes v
=
J(u\times_{\mathrm{Euc}}v).
\]

Then

\[
\langle u\boxtimes v,u\rangle
=
\langle u\boxtimes v,v\rangle
=
0.
\]

Set

\[
w_i=e_i\boxtimes e_{i+1}.
\]

For intersecting adjacent mirrors, \(w_i\) is timelike. Normalize it:

\[
v_i=\frac{w_i}{\sqrt{-\langle w_i,w_i\rangle}},
\]

and choose the sign for which the time coordinate is positive.

Then

\[
v_i\in\mathbb H^2,
\qquad
\langle v_i,e_i\rangle
=
\langle v_i,e_{i+1}\rangle
=
0.
\]

### 8.9 Hyperbolic distances

For hyperboloid points \(x,y\),

\[
\cosh d(x,y)=-\langle x,y\rangle,
\]

so

\[
d(x,y)
=
\operatorname{arcosh}
\left(
\max(1,-\langle x,y\rangle)
\right).
\]

Edge \(i\) lies on mirror \(H_i\) and joins vertices \(v_{i-1}\) and \(v_i\). Hence

\[
\ell_i=d(v_{i-1},v_i).
\]

### 8.10 Optional Poincaré and Klein coordinates

For

\[
x=(x_0,x_1,x_2)\in\mathbb H^2,
\]

the Poincaré disk coordinate is

\[
p(x)
=
\left(
\frac{x_0}{x_2+1},
\frac{x_1}{x_2+1}
\right).
\]

The Klein disk coordinate is

\[
k(x)
=
\left(
\frac{x_0}{x_2},
\frac{x_1}{x_2}
\right).
\]

---

## 9. Side-length formula from the incircle

This formula is not required to build the normals, but it is useful as an independent check.

At vertex \(v_i\), the angle bisector cuts the associated quadrilateral into two congruent right triangles. Let \(q_i\) be the distance from \(v_i\) to either adjacent tangency point. Hyperbolic right-triangle trigonometry gives

\[
\boxed{
\sinh q_i
=
\tanh r\cot\frac{\beta_i}{2}.
}
\]

Thus

\[
q_i
=
\operatorname{arsinh}
\left(
\tanh r\cot\frac{\beta_i}{2}
\right).
\]

Edge \(i\) runs from vertex \(v_{i-1}\) to vertex \(v_i\), so its tangency point divides it into lengths \(q_{i-1}\) and \(q_i\). Therefore

\[
\boxed{
\ell_i=q_{i-1}+q_i.
}
\]

The total perimeter is

\[
\boxed{
L
=
2\sum_i q_i
=
2\sum_i
\operatorname{arsinh}
\left(
\tanh r\cot\frac{\beta_i}{2}
\right).
}
\]

This should agree numerically with the perimeter computed from the hyperboloid vertices.

---

## 10. Translation lengths of nonconsecutive reflection products

Once the canonical normals are known, all previously missing pairwise mirror data is determined.

For two ultraparallel mirrors,

\[
G_{ij}=\langle e_i,e_j\rangle=-\cosh d(H_i,H_j).
\]

Hence

\[
d(H_i,H_j)
=
\operatorname{arcosh}(-G_{ij}),
\]

and the product \(R_iR_j\) is hyperbolic with translation length

\[
\boxed{
\operatorname{len}(R_iR_j)
=
2\operatorname{arcosh}(-G_{ij}).
}
\]

This is exactly the extra geometric information not present in the abstract statement that \(m_{ij}=\infty\).

For compact nonobtuse Coxeter polygons, nonconsecutive side mirrors should be ultraparallel, so valid canonical outputs should satisfy

\[
G_{ij}<-1
\]

for nonconsecutive \(i,j\). Treat violations as a failed geometric invariant rather than silently accepting them.

---

## 11. Recommended TypeScript API

The abstract Coxeter layer and the geometric realization layer should remain separate.

```ts
export type Vec3 = readonly [number, number, number];

export type Mat3 = readonly [
  readonly [number, number, number],
  readonly [number, number, number],
  readonly [number, number, number],
];

export interface CanonicalHyperbolicPolygon {
  /** Interior angle beta_i occurs between mirrors i and i+1. */
  readonly angles: readonly number[];

  /** Coxeter order m_i, if the input came from Coxeter data. */
  readonly adjacentOrders?: readonly number[];

  /** t = sech(r). */
  readonly sechInradius: number;

  readonly inradius: number;

  /** theta_i = phi_{i+1} - phi_i. */
  readonly normalGaps: readonly number[];

  /** phi_0 = 0, then cumulative normal gaps. */
  readonly normalAngles: readonly number[];

  /** Outward unit spacelike Lorentz normals. */
  readonly normals: readonly Vec3[];

  /** G_ij = <e_i,e_j>. */
  readonly gram: readonly (readonly number[])[];

  /** v_i = H_i intersect H_{i+1}. */
  readonly vertices: readonly Vec3[];

  /** Edge i joins v_{i-1} to v_i. */
  readonly edgeLengths: readonly number[];

  readonly perimeter: number;

  readonly reflections: readonly Mat3[];

  readonly diagnostics: {
    readonly closureError: number;
    readonly maxNormalNormError: number;
    readonly maxAdjacentGramError: number;
    readonly maxVertexIncidenceError: number;
    readonly maxReflectionInvolutionError: number;
    readonly maxLorentzIsometryError: number;
  };
}
```

Suggested entry points:

```ts
export function buildCanonicalPolygonFromAngles(
  angles: readonly number[],
  options?: CanonicalPolygonOptions,
): CanonicalHyperbolicPolygon;
```

and

```ts
export function buildCanonicalCoxeterPolygon(
  adjacentOrders: readonly number[],
  options?: CanonicalPolygonOptions,
): CanonicalHyperbolicPolygon;
```

The second function should validate each \(m_i\) and call the first with

```ts
const angles = adjacentOrders.map(m => Math.PI / m);
```

---

## 12. Core reference implementation

The following is dependency-free reference code. Adapt names and immutable data structures to the project architecture.

```ts
export type Vec3 = [number, number, number];

export type Mat3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number],
];

export interface CanonicalPolygonOptions {
  /** Number of bisection iterations. 80 is ample for Float64. */
  readonly bisectionIterations?: number;

  /** Geometric validation tolerance. */
  readonly tolerance?: number;
}

export interface CanonicalHyperbolicPolygon {
  readonly angles: readonly number[];
  readonly sechInradius: number;
  readonly inradius: number;
  readonly normalGaps: readonly number[];
  readonly normalAngles: readonly number[];
  readonly normals: readonly Vec3[];
  readonly gram: readonly (readonly number[])[];
  readonly vertices: readonly Vec3[];
  readonly edgeLengths: readonly number[];
  readonly perimeter: number;
  readonly reflections: readonly Mat3[];
  readonly closureError: number;
}

const TWO_PI = 2 * Math.PI;

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function lorentzDot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] - a[2] * b[2];
}

function euclideanCross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/**
 * J(a x_Euclidean b), with J = diag(1,1,-1).
 * The result is Lorentz-orthogonal to both a and b.
 */
function lorentzCross(a: Vec3, b: Vec3): Vec3 {
  const c = euclideanCross(a, b);
  return [c[0], c[1], -c[2]];
}

function normalizeFutureTimelike(
  vector: Vec3,
  tolerance: number,
): Vec3 {
  const normSquared = lorentzDot(vector, vector);

  if (!(normSquared < -tolerance)) {
    throw new Error(
      `Expected timelike vector; Lorentz norm squared was ${normSquared}.`,
    );
  }

  const scale = 1 / Math.sqrt(-normSquared);

  let result: Vec3 = [
    vector[0] * scale,
    vector[1] * scale,
    vector[2] * scale,
  ];

  if (result[2] < 0) {
    result = [-result[0], -result[1], -result[2]];
  }

  return result;
}

function intersectMirrors(
  firstNormal: Vec3,
  secondNormal: Vec3,
  tolerance: number,
): Vec3 {
  return normalizeFutureTimelike(
    lorentzCross(firstNormal, secondNormal),
    tolerance,
  );
}

function hyperbolicDistance(a: Vec3, b: Vec3): number {
  return Math.acosh(Math.max(1, -lorentzDot(a, b)));
}

function reflectionMatrix(normal: Vec3): Mat3 {
  // R = I - 2 e (e^T J)
  const covector: Vec3 = [
    normal[0],
    normal[1],
    -normal[2],
  ];

  const result: Mat3 = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) {
      result[row][column] =
        (row === column ? 1 : 0)
        - 2 * normal[row] * covector[column];
    }
  }

  return result;
}

export function buildCanonicalPolygonFromAngles(
  inputAngles: readonly number[],
  options: CanonicalPolygonOptions = {},
): CanonicalHyperbolicPolygon {
  const iterations = options.bisectionIterations ?? 80;
  const tolerance = options.tolerance ?? 1e-12;

  const angles = [...inputAngles];
  const n = angles.length;

  if (n < 3) {
    throw new Error("A polygon requires at least three angles.");
  }

  for (let i = 0; i < n; i++) {
    const beta = angles[i];

    if (!Number.isFinite(beta) || !(beta > 0 && beta < Math.PI)) {
      throw new Error(
        `angles[${i}] must satisfy 0 < beta < pi; received ${beta}.`,
      );
    }
  }

  const exteriorAngleSum = angles.reduce(
    (sum, beta) => sum + Math.PI - beta,
    0,
  );

  if (!(exteriorAngleSum > TWO_PI)) {
    throw new Error(
      "The ordered angles do not define a compact convex hyperbolic polygon: "
      + `sum(pi - beta_i) = ${exteriorAngleSum}, `
      + `which must be greater than 2*pi = ${TWO_PI}.`,
    );
  }

  const halfAngleCosines = angles.map(
    beta => Math.cos(beta / 2),
  );

  const closureFunction = (t: number): number => {
    let sum = 0;

    for (const cosine of halfAngleCosines) {
      const argument = clamp(t * cosine, -1, 1);
      sum += 2 * Math.asin(argument);
    }

    return sum - TWO_PI;
  };

  // F(0) < 0 and F(1) > 0.
  let lower = 0;
  let upper = 1;

  for (let iteration = 0; iteration < iterations; iteration++) {
    const middle = 0.5 * (lower + upper);

    if (closureFunction(middle) < 0) {
      lower = middle;
    } else {
      upper = middle;
    }
  }

  const t = 0.5 * (lower + upper);

  const normalGaps = halfAngleCosines.map(
    cosine => 2 * Math.asin(clamp(t * cosine, -1, 1)),
  );

  const closureError =
    normalGaps.reduce((sum, gap) => sum + gap, 0)
    - TWO_PI;

  const normalAngles = new Array<number>(n);
  normalAngles[0] = 0;

  for (let i = 1; i < n; i++) {
    normalAngles[i] =
      normalAngles[i - 1] + normalGaps[i - 1];
  }

  const coshR = 1 / t;
  const sinhR = Math.sqrt((1 - t) * (1 + t)) / t;
  const inradius = Math.acosh(coshR);

  const normals: Vec3[] = normalAngles.map(phi => [
    coshR * Math.cos(phi),
    coshR * Math.sin(phi),
    sinhR,
  ]);

  // Stable closed formula:
  // G_ij = 1 - 2 [sin((phi_i - phi_j)/2) / t]^2.
  const gram = Array.from(
    { length: n },
    (_, i) =>
      Array.from({ length: n }, (_, j) => {
        const halfDifference =
          0.5 * (normalAngles[i] - normalAngles[j]);

        const quotient = Math.sin(halfDifference) / t;

        return 1 - 2 * quotient * quotient;
      }),
  );

  // Vertex i is H_i intersect H_{i+1}.
  const vertices = Array.from(
    { length: n },
    (_, i) =>
      intersectMirrors(
        normals[i],
        normals[(i + 1) % n],
        tolerance,
      ),
  );

  // Edge i lies in H_i and joins v_{i-1} to v_i.
  const edgeLengths = Array.from(
    { length: n },
    (_, i) =>
      hyperbolicDistance(
        vertices[(i - 1 + n) % n],
        vertices[i],
      ),
  );

  const perimeter = edgeLengths.reduce(
    (sum, length) => sum + length,
    0,
  );

  const reflections = normals.map(reflectionMatrix);

  return {
    angles,
    sechInradius: t,
    inradius,
    normalGaps,
    normalAngles,
    normals,
    gram,
    vertices,
    edgeLengths,
    perimeter,
    reflections,
    closureError,
  };
}

export function buildCanonicalCoxeterPolygon(
  adjacentOrders: readonly number[],
  options: CanonicalPolygonOptions = {},
): CanonicalHyperbolicPolygon {
  const angles = adjacentOrders.map((order, i) => {
    if (
      !Number.isInteger(order)
      || order < 2
      || !Number.isFinite(order)
    ) {
      throw new Error(
        `adjacentOrders[${i}] must be a finite integer >= 2; `
        + `received ${order}.`,
      );
    }

    return Math.PI / order;
  });

  return buildCanonicalPolygonFromAngles(angles, options);
}
```

---

## 13. Required validation invariants

Do not rely only on visual output. The implementation should validate the following.

### 13.1 Root and closure

\[
|F(t)|\le\varepsilon,
\]

and

\[
\left|
\sum_i\theta_i-2\pi
\right|
\le\varepsilon.
\]

### 13.2 Unit spacelike normals

For every \(i\),

\[
|\langle e_i,e_i\rangle-1|
\le\varepsilon.
\]

### 13.3 Equal distance from the incenter

For every \(i\),

\[
\langle o,e_i\rangle=-\sinh r.
\]

### 13.4 Prescribed adjacent angles

For every \(i\),

\[
\left|
G_{i,i+1}+\cos\beta_i
\right|
\le\varepsilon.
\]

### 13.5 Vertex incidence

For every \(i\),

\[
\langle v_i,e_i\rangle\approx0,
\]

\[
\langle v_i,e_{i+1}\rangle\approx0,
\]

\[
\langle v_i,v_i\rangle\approx-1,
\]

and

\[
(v_i)_2>0.
\]

### 13.6 Half-space containment

Every vertex should lie in every polygonal half-space:

\[
\langle v_i,e_j\rangle\le\varepsilon
\]

for all \(i,j\).

This catches sign and cyclic-order errors.

### 13.7 Reflection identities

For each \(R_i\),

\[
R_i^2\approx I,
\]

and

\[
R_i^{\mathsf T}JR_i\approx J.
\]

### 13.8 Coxeter relations

When \(\beta_i=\pi/m_i\),

\[
(R_iR_{i+1})^{m_i}\approx I.
\]

### 13.9 Gram rank/signature

Numerically, \(G\) should have:

- two positive eigenvalues;
- one negative eigenvalue;
- \(n-3\) eigenvalues near zero.

Scale the zero threshold relative to the largest absolute eigenvalue rather than using a fixed absolute threshold.

Because the implementation already constructs the normals directly in \(\mathbb R^{2,1}\), spectral factorization of \(G\) is not needed for the canonical polygon. The Gram matrix can still be passed into an existing generic realization pipeline.

---

## 14. Regression tests

### 14.1 Regular right-angled pentagon

Set

\[
n=5,
\qquad
\beta_i=\frac{\pi}{2}.
\]

Then all normal gaps are equal:

\[
\theta_i=\frac{2\pi}{5}.
\]

The scalar parameter is exactly

\[
t
=
\sqrt2\sin\frac{\pi}{5}.
\]

Let

\[
\varphi=\frac{1+\sqrt5}{2}.
\]

The nonconsecutive Gram entries must be

\[
G_{i,i+2}=G_{i,i+3}=-\varphi.
\]

Suggested test:

```ts
it("recovers the regular right-angled pentagon", () => {
  const polygon = buildCanonicalCoxeterPolygon([2, 2, 2, 2, 2]);

  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  const expectedT = Math.SQRT2 * Math.sin(Math.PI / 5);

  expect(polygon.sechInradius).toBeCloseTo(expectedT, 12);

  for (let i = 0; i < 5; i++) {
    expect(polygon.normalGaps[i])
      .toBeCloseTo(2 * Math.PI / 5, 12);

    expect(polygon.gram[i][(i + 1) % 5])
      .toBeCloseTo(0, 12);

    expect(polygon.gram[i][(i + 2) % 5])
      .toBeCloseTo(-goldenRatio, 12);
  }
});
```

### 14.2 Triangle regression

For any valid hyperbolic triangle, the fixed-angle moduli space has dimension \(0\). The Porti construction must therefore recover the ordinary unique triangle.

A strong test is a Coxeter triangle such as

\[
\left(\frac{\pi}{2},\frac{\pi}{3},\frac{\pi}{7}\right).
\]

Verify:

```ts
it("constructs the canonical (2,3,7) triangle", () => {
  const polygon = buildCanonicalCoxeterPolygon([2, 3, 7]);

  expect(polygon.gram[0][1])
    .toBeCloseTo(-Math.cos(Math.PI / 2), 12);

  expect(polygon.gram[1][2])
    .toBeCloseTo(-Math.cos(Math.PI / 3), 12);

  expect(polygon.gram[2][0])
    .toBeCloseTo(-Math.cos(Math.PI / 7), 12);
});
```

### 14.3 Cyclic-equivariance test

Cyclically shift the input angle list. The resulting Gram matrix should be the same up to the corresponding cyclic permutation of rows and columns.

### 14.4 Reversal-equivariance test

Reverse the cyclic angle list. The result should be related by reversing the mirror indices and an orientation-reversing ambient isometry.

At minimum, the pairwise Gram data should agree under the index reversal.

### 14.5 Perimeter cross-check

Compute the perimeter in two independent ways:

1. by hyperbolic distances between vertices;
2. by
   \[
   2\sum_i
   \operatorname{arsinh}
   \left(
   \tanh r\cot\frac{\beta_i}{2}
   \right).
   \]

They should agree within tolerance.

---

## 15. Common implementation mistakes

### Mistake 1: confusing vertices with mirrors

The list \(\beta_i\) indexes vertices, while \(e_i\) indexes mirrors.

The convention used here is:

\[
v_i=H_i\cap H_{i+1},
\]

and \(\beta_i\) is the angle at \(v_i\).

### Mistake 2: using inward normals in one place and outward normals in another

This document uses outward normals and polygon interior

\[
\langle x,e_i\rangle\le0.
\]

With this convention,

\[
G_{i,i+1}=-\cos\beta_i.
\]

Changing all normal signs simultaneously preserves the mirrors but reverses all half-space inequalities. Changing only some signs corrupts the Gram data.

### Mistake 3: mixing Lorentz signatures

The formulas here assume

\[
J=\operatorname{diag}(1,1,-1).
\]

If the project uses

\[
\operatorname{diag}(-1,1,1),
\]

convert every formula consistently.

### Mistake 4: minimizing numerically over polygon moduli

Do not run a generic optimizer over \(n-3\) shape parameters. Porti's theorem and Lemma 12 reduce the canonical construction to one monotone scalar root.

### Mistake 5: solving for \(r\) when \(t=\operatorname{sech}r\) is simpler

The variable \(t\in(0,1)\) has a fixed bracket and a strictly increasing closure function.

### Mistake 6: forcing the final normal gap to close exactly

Do not replace the final \(\theta_i\) by

\[
2\pi-\sum_{j<i}\theta_j.
\]

That would destroy the prescribed final angle. Improve the root solve instead and record the closure residual.

### Mistake 7: independently overwriting adjacent Gram entries

Do not compute the full Gram matrix and then manually replace adjacent entries by \(-\cos\beta_i\). That can destroy exact rank consistency. Use the geometric construction and treat adjacent discrepancies as diagnostics.

### Mistake 8: treating the coordinate gauge as geometric asymmetry

The choice \(\phi_0=0\) privileges the first mirror only in coordinates. Intrinsically, the output is canonical up to isometry.

---

## 16. Architectural recommendation

Keep three layers separate.

### Abstract Coxeter data

Contains:

- generators;
- words;
- Coxeter matrix;
- diagram combinatorics;
- reduction algorithms.

### Canonical polygon realization

Consumes a cyclic list of adjacent Coxeter orders and returns:

- Lorentz normals;
- mirrors;
- vertices;
- reflections;
- Gram matrix;
- conversion data for rendering.

### Rendering

Consumes the geometric realization and draws:

- the base chamber;
- reflected chambers;
- mirror geodesics;
- Cayley graph vertices and edges;
- labels and interaction data.

The abstract group should not depend on the canonical realization. The realization is one selected representation of the abstract group.

---

## 17. Implementation task for the coding LLM

Implement the Porti canonical hyperbolic polygon realization as follows.

1. Add a module for the Lorentz model \(\mathbb R^{2,1}\) with signature \((+,+,-)\).
2. Add `buildCanonicalPolygonFromAngles`.
3. Add `buildCanonicalCoxeterPolygon`.
4. Solve the unique scalar closure equation in \(t=\operatorname{sech}r\) by bisection.
5. Construct the outward normals directly.
6. Construct the full Gram matrix using the stable half-angle formula.
7. Construct vertices using the Lorentz cross product.
8. Construct reflection matrices.
9. Return diagnostics rather than silently accepting invalid geometry.
10. Add the regression and invariant tests listed above.
11. Do not add support for ideal vertices in the first implementation.
12. Do not use a multidimensional optimizer.
13. Do not diagonalize the Gram matrix merely to recover normals that have already been constructed explicitly.
14. Preserve the input cyclic order exactly.

The mathematical source of canonicality is Porti's theorem. The computational core is the unique root of

\[
\sum_i
2\arcsin\left(
t\cos\frac{\beta_i}{2}
\right)
=
2\pi.
\]

Once \(t\) is known, the entire geometric reflection representation follows explicitly.
