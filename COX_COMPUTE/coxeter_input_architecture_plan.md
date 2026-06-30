# Input Architecture for Coxeter Geometry Software

## Purpose

This document defines a clean software boundary between:

1. the many ways users may describe a Coxeter or Artin system;
2. the normalized algebraic pair-relation data;
3. the dimension-specific combinatorial interpretation;
4. the numerical geometric realization.

The central principle is:

\[
\boxed{
\text{external notation}
\longrightarrow
\text{complete pair-order data}
\longrightarrow
\text{geometric cell complex}
\longrightarrow
\text{hyperbolic realization}.
}
\]

A Coxeter matrix is one important input format, but it should not be the only one. Coxeter diagrams, Artin graphs, hand-written edge-labeled graphs, imported data, and explicit polygon/polyhedron descriptions should all reduce to the same stable internal representation.

---

# 1. Why a Coxeter matrix should not be the solver input

A Coxeter matrix records pairwise generator orders:

\[
M=(m_{ij}),
\qquad
m_{ii}=1,
\qquad
m_{ij}\in\{2,3,4,\dots,\infty\}.
\]

This is natural algebraic input, but the geometric solvers need more structured data.

The 2D solver needs:

- a cyclic list of sides;
- a cyclic list of adjacent Coxeter orders;
- the corresponding interior angles.

The 3D solver needs:

- facets;
- edges;
- vertices;
- incidence relations;
- the cyclic boundary of every facet;
- the dual rotation system;
- the Coxeter order attached to every polyhedral edge.

Therefore the numerical solvers should not consume raw matrices or diagrams. They should consume explicit polygon or polyhedron specifications.

The software should have a preprocessing pipeline that converts group-theoretic input into this geometric-combinatorial form.

---

# 2. Architectural layers

The recommended architecture has four layers.

## Layer A: external notation

Examples:

- Coxeter matrix;
- standard Coxeter diagram;
- Artin graph;
- complete pair-relation list;
- custom edge-labeled graph;
- explicit polygon;
- explicit polyhedron.

## Layer B: normalized pair-order data

Every unordered pair of generators receives an explicit order.

No convention remains implicit.

## Layer C: geometric interpretation

The normalized pair orders are interpreted as:

- a polygon in dimension two;
- a compact polyhedron in dimension three;
- later, a finite-volume or hyperideal polyhedron.

This stage reconstructs the combinatorial cell complex.

## Layer D: numerical realization

The polygon or polyhedron solver constructs:

- supporting geodesics in \(\mathbb H^2\);
- supporting planes in \(\mathbb H^3\);
- reflection matrices;
- drawable geometry.

The dependency direction should always be:

```text
notation
    ↓
pair relations
    ↓
cell complex
    ↓
geometry
```

The numerical layer should not know how a Coxeter diagram suppresses order-2 edges or how an Artin graph encodes braid relations.

---

# 3. Generator identifiers

Use stable string identifiers rather than relying only on array positions.

```ts
export type GeneratorId = string;
```

Examples:

```ts
["a", "b", "c"]
```

```ts
["s0", "s1", "s2", "s3"]
```

```ts
["left", "right", "top", "bottom"]
```

Array indices may still be used internally for performance, but the normalized model should preserve generator names for diagnostics, UI, and serialization.

---

# 4. Coxeter orders

Use an explicit serializable representation for infinity.

```ts
export type FiniteCoxeterOrder = number;

export type CoxeterOrder =
  | FiniteCoxeterOrder
  | "infinity";
```

Validation for a finite order should require:

```ts
Number.isInteger(order) && order >= 2
```

The diagonal value \(1\) belongs to a matrix representation, but it is not a pair relation between distinct generators.

Do not use JavaScript `Infinity` in persisted JSON. Ordinary JSON does not support it.

---

# 5. External input formats

## 5.1 Coxeter matrix input

```ts
export interface CoxeterMatrixInput {
  readonly kind: "coxeter-matrix";
  readonly generators: readonly GeneratorId[];

  /**
   * Symmetric square matrix.
   *
   * diagonal: 1
   * off-diagonal: integer >= 2 or "infinity"
   */
  readonly entries:
    readonly (readonly (1 | CoxeterOrder)[])[];
}
```

Required validation:

- the matrix is square;
- its size matches `generators.length`;
- all generator identifiers are distinct;
- the matrix is symmetric;
- diagonal entries are exactly `1`;
- every off-diagonal entry is a valid Coxeter order.

---

## 5.2 Standard Coxeter diagram input

A standard Coxeter diagram generally uses the conventions:

- omitted pair: order \(2\);
- unlabeled drawn edge: order \(3\);
- edge labeled \(m\): order \(m\);
- explicit infinity edge: order \(\infty\).

This convention must be represented explicitly in the parser contract.

```ts
export interface CoxeterDiagramEdge {
  readonly source: GeneratorId;
  readonly target: GeneratorId;

  /**
   * Omitted means order 3 under the standard convention.
   */
  readonly order?: CoxeterOrder;
}

export interface CoxeterDiagramInput {
  readonly kind: "coxeter-diagram";
  readonly generators: readonly GeneratorId[];
  readonly edges: readonly CoxeterDiagramEdge[];

  readonly convention: "standard-coxeter";
}
```

The parser expands all omitted pairs to order \(2\).

This is crucial:

> In a standard Coxeter diagram, absence of a drawn edge means order \(2\), not order \(\infty\).

---

## 5.3 General edge-labeled graph input

Different authors and software packages may use different omitted-edge conventions.

Do not guess.

```ts
export interface PairOrderGraphEdge {
  readonly source: GeneratorId;
  readonly target: GeneratorId;
  readonly order?: CoxeterOrder;
}

export interface PairOrderGraphInput {
  readonly kind: "pair-order-graph";
  readonly generators: readonly GeneratorId[];
  readonly edges: readonly PairOrderGraphEdge[];

  /**
   * Order assigned to an omitted pair.
   */
  readonly omittedPairOrder: CoxeterOrder;

  /**
   * Order assigned to a drawn but unlabeled edge.
   */
  readonly unlabeledEdgeOrder?: CoxeterOrder;
}
```

This format supports:

- standard Coxeter diagrams;
- graphs where omitted means infinity;
- custom notations used in research code;
- imported graph data.

---

## 5.4 Artin graph input

An Artin graph records braid lengths:

\[
\underbrace{s_is_js_i\cdots}_{m_{ij}}
=
\underbrace{s_js_is_j\cdots}_{m_{ij}}.
\]

The associated Coxeter system is obtained by adding:

\[
s_i^2=1.
\]

Thus an Artin graph can normalize to the same pair-order data.

```ts
export interface ArtinGraphEdge {
  readonly source: GeneratorId;
  readonly target: GeneratorId;
  readonly braidLength?: CoxeterOrder;
}

export interface ArtinGraphInput {
  readonly kind: "artin-graph";
  readonly generators: readonly GeneratorId[];
  readonly edges: readonly ArtinGraphEdge[];

  readonly omittedPairOrder: CoxeterOrder;
  readonly unlabeledEdgeOrder?: CoxeterOrder;
}
```

Again, omitted-edge behavior must be explicit.

The geometry pipeline realizes the associated Coxeter quotient, not the Artin group itself.

---

## 5.5 Explicit complete pair relations

This is the least ambiguous algebraic input.

```ts
export interface ExplicitPairRelation {
  readonly a: GeneratorId;
  readonly b: GeneratorId;
  readonly order: CoxeterOrder;
}

export interface ExplicitPairRelationsInput {
  readonly kind: "explicit-pair-relations";
  readonly generators: readonly GeneratorId[];

  /**
   * Exactly one relation for every unordered pair
   * of distinct generators.
   */
  readonly relations: readonly ExplicitPairRelation[];
}
```

This format is an excellent canonical serialized representation.

---

## 5.6 Explicit geometric-combinatorial input

Users may already know the intended polygon or polyhedron.

The system should allow them to bypass matrix interpretation.

```ts
export interface ExplicitPolygonInput {
  readonly kind: "explicit-polygon";
  readonly spec: CoxeterPolygonSpec;
}

export interface ExplicitPolyhedronInput {
  readonly kind: "explicit-polyhedron";
  readonly spec: CoxeterPolyhedronSpec;
}
```

This is necessary when:

- the Coxeter matrix does not uniquely determine the intended cell complex;
- noncompact or hyperideal behavior is present;
- a collaborator supplies an explicit face lattice;
- the user wants a specific marking or cyclic order.

---

# 6. The normalized algebraic representation

All algebraic front ends should normalize to complete pair-order data.

```ts
export interface PairRelation {
  readonly a: GeneratorId;
  readonly b: GeneratorId;
  readonly order: CoxeterOrder;
}

export interface CoxeterPairData {
  readonly generators: readonly GeneratorId[];

  /**
   * Exactly one relation for every unordered pair
   * of distinct generators.
   */
  readonly relations: readonly PairRelation[];
}
```

The central normalization function is:

```ts
export type AlgebraicCoxeterInput =
  | CoxeterMatrixInput
  | CoxeterDiagramInput
  | PairOrderGraphInput
  | ArtinGraphInput
  | ExplicitPairRelationsInput;

export function normalizeCoxeterInput(
  input: AlgebraicCoxeterInput,
): CoxeterPairData;
```

---

# 7. Normalization invariants

After normalization, the following must hold.

## 7.1 Generator invariants

- identifiers are unique;
- no identifier is empty;
- generator order is stable and deterministic.

## 7.2 Pair invariants

For every unordered pair \(\{a,b\}\) of distinct generators:

- exactly one relation exists;
- the order is finite \(\ge 2\) or `"infinity"`;
- no self-pair appears;
- pair ordering is canonical.

For example, store pairs according to the generator index order:

```ts
index(a) < index(b)
```

## 7.3 No notation conventions remain

After normalization, the code must no longer care:

- whether an edge was omitted;
- whether a label was absent;
- whether the source was a matrix;
- whether the source was an Artin graph;
- whether order \(2\) edges were suppressed.

All pair orders are explicit.

---

# 8. A useful indexed form

For algorithms, build an indexed lookup table.

```ts
export interface IndexedCoxeterPairData {
  readonly generators: readonly GeneratorId[];

  /**
   * Dense symmetric matrix for fast lookup.
   */
  readonly orders:
    readonly (readonly (1 | CoxeterOrder)[])[];
}
```

Conversion:

```ts
export function indexPairData(
  data: CoxeterPairData,
): IndexedCoxeterPairData;
```

The canonical semantic object is still `CoxeterPairData`; the dense matrix is an implementation detail.

---

# 9. Do not confuse three different graphs

The software will encounter several graphs that are easy to conflate.

## 9.1 Standard Coxeter diagram

Vertices are generators.

Drawn edges usually represent orders greater than \(2\).

Order-\(2\) pairs are suppressed.

## 9.2 Complete pair-order graph

Vertices are generators.

Every unordered pair has an explicit order.

This is graph-shaped matrix data.

## 9.3 Geometric finite-relation graph

Vertices are reflecting walls.

An edge is present when:

\[
m_{ij}<\infty.
\]

In the compact polygon and polyhedron settings, this graph is interpreted as geometric wall adjacency.

It includes order-\(2\) pairs.

These graphs are not interchangeable.

The conversion is:

```text
standard Coxeter diagram
        ↓ expand conventions
complete pair orders
        ↓ keep finite pairs
finite-relation geometric graph
```

---

# 10. Dimension-specific interpretation

The normalized pair data does not yet specify a polygon or polyhedron in a solver-ready form.

It must be interpreted in a geometric regime.

```ts
export type GeometricRegime =
  | {
      readonly dimension: 2;
      readonly volume: "compact";
    }
  | {
      readonly dimension: 2;
      readonly volume: "finite";
    }
  | {
      readonly dimension: 3;
      readonly volume: "compact";
    }
  | {
      readonly dimension: 3;
      readonly volume: "finite";
    }
  | {
      readonly dimension: 3;
      readonly volume: "hyperideal";
    };
```

Initially, implement only:

```ts
{ dimension: 2, volume: "compact" }
{ dimension: 3, volume: "compact" }
```

---

# 11. Two-dimensional interpretation

## 11.1 Build the finite-relation graph

Given normalized pair data, create:

\[
G_{\mathrm{fin}}
=
\left(
S,
\left\{
\{i,j\}:m_{ij}<\infty
\right\}
\right).
\]

For a compact Coxeter polygon with at least four sides, require:

- \(G_{\mathrm{fin}}\) is connected;
- every vertex has degree \(2\);
- the graph is a single cycle.

For a triangle, the graph is \(K_3\), which is also a three-cycle.

## 11.2 Recover cyclic order

Traverse the cycle to obtain:

```ts
interface CoxeterPolygonSpec {
  readonly sideGenerators: readonly GeneratorId[];

  /**
   * orders[i] is the order between side i
   * and side (i + 1) mod n.
   */
  readonly orders: readonly number[];
}
```

The cycle is determined up to:

- cyclic rotation;
- reversal.

For an unmarked polygon these are equivalent.

For deterministic output, choose a canonical representative:

1. rotate so the lexicographically smallest generator id appears first;
2. compare the two orientations lexicographically;
3. choose the smaller orientation.

## 11.3 Validate hyperbolicity

Require:

\[
\sum_{i=0}^{n-1}\frac1{m_i}<n-2.
\]

Then send the `CoxeterPolygonSpec` to the Porti solver.

Suggested interface:

```ts
export function interpretCompactPolygon(
  data: CoxeterPairData,
): CoxeterPolygonSpec;
```

---

# 12. Three-dimensional compact interpretation

## 12.1 Build the finite-relation graph

Again create:

\[
G_{\mathrm{fin}}
=
\left(
S,
\left\{
\{i,j\}:m_{ij}<\infty
\right\}
\right).
\]

Interpret this as the graph of the dual polyhedron:

- graph vertices correspond to primal facets;
- graph edges correspond to primal edges.

## 12.2 Validate the dual graph

Require:

- connected;
- simple;
- planar;
- \(3\)-vertex-connected.

Compute its unique spherical embedding up to reflection.

## 12.3 Require triangular dual faces

For a compact non-obtuse polyhedron, exactly three facets meet at every vertex.

Therefore every complementary face of the embedded dual graph must be triangular.

## 12.4 Dualize

Construct:

```ts
export interface CoxeterPolyhedronFace {
  readonly id: number;
  readonly generator: GeneratorId;
  readonly boundaryEdges: readonly number[];
  readonly boundaryVertices: readonly number[];
  readonly adjacentFaces: readonly number[];
}

export interface CoxeterPolyhedronEdge {
  readonly id: number;
  readonly faceA: number;
  readonly faceB: number;
  readonly order: number;
  readonly vertexA: number;
  readonly vertexB: number;
}

export interface CoxeterPolyhedronVertex {
  readonly id: number;
  readonly incidentFaces: readonly [number, number, number];
  readonly incidentEdges: readonly [number, number, number];
  readonly kind: "finite";
}

export interface CompactCoxeterPolyhedronSpec {
  readonly faces: readonly CoxeterPolyhedronFace[];
  readonly edges: readonly CoxeterPolyhedronEdge[];
  readonly vertices: readonly CoxeterPolyhedronVertex[];

  readonly dualRotationSystem:
    ReadonlyMap<number, readonly number[]>;
}
```

## 12.5 Apply Andreev validation

After reconstructing the cell complex:

- check local vertex inequalities;
- detect prismatic \(3\)-circuits;
- detect prismatic \(4\)-circuits;
- apply the quadrilateral-face conditions;
- reject impossible angle assignments.

Only then pass the specification to the hyperbolic polyhedron solver.

Suggested interface:

```ts
export function interpretCompactPolyhedron(
  data: CoxeterPairData,
): CompactCoxeterPolyhedronSpec;
```

---

# 13. Matrix-only input does not always determine the geometry

In the compact regimes above, the finite pair graph often determines the cell complex.

Outside those regimes, a bare Coxeter matrix may be insufficient.

The value

\[
m_{ij}=\infty
\]

does not by itself distinguish:

- ultraparallel walls;
- asymptotic walls;
- walls sharing an ideal point but not an edge;
- more complicated infinite-volume incidence.

Therefore later noncompact APIs should support explicit incidence data.

A matrix interpreter may return:

```ts
export type InterpretationResult<T> =
  | {
      readonly kind: "unique";
      readonly value: T;
    }
  | {
      readonly kind: "ambiguous";
      readonly reason: string;
      readonly candidates?: readonly T[];
    }
  | {
      readonly kind: "invalid";
      readonly errors: readonly InterpretationError[];
    };
```

Do not silently choose a cell complex when the algebraic input does not determine one.

---

# 14. Explicit geometric-combinatorial specifications

The stable solver inputs should be independent of their origin.

## 14.1 Polygon solver boundary

```ts
export function realizeCanonicalHyperbolicPolygon(
  spec: CoxeterPolygonSpec,
): HyperbolicCoxeterPolygon;
```

## 14.2 Polyhedron solver boundary

```ts
export function realizeCompactHyperbolicPolyhedron(
  spec: CompactCoxeterPolyhedronSpec,
): HyperbolicCoxeterPolyhedron;
```

These functions should not accept:

- matrices;
- diagrams;
- Artin graphs;
- omitted-edge conventions.

They should receive complete solver-ready combinatorial data.

---

# 15. Public convenience API

Users should still be able to pass the notation they naturally possess.

```ts
export type CoxeterGeometryInput =
  | {
      readonly source: AlgebraicCoxeterInput;
      readonly regime: GeometricRegime;
    }
  | ExplicitPolygonInput
  | ExplicitPolyhedronInput;
```

A high-level function may dispatch through the entire pipeline:

```ts
export function realizeCoxeterGeometry(
  input: CoxeterGeometryInput,
): GeometricCoxeterDomain;
```

Conceptually:

```ts
export function realizeCoxeterGeometry(
  input: CoxeterGeometryInput,
): GeometricCoxeterDomain {
  if (input.kind === "explicit-polygon") {
    return realizeCanonicalHyperbolicPolygon(input.spec);
  }

  if (input.kind === "explicit-polyhedron") {
    return realizeCompactHyperbolicPolyhedron(input.spec);
  }

  const pairData = normalizeCoxeterInput(input.source);

  if (
    input.regime.dimension === 2
    && input.regime.volume === "compact"
  ) {
    const polygon = interpretCompactPolygon(pairData);
    return realizeCanonicalHyperbolicPolygon(polygon);
  }

  if (
    input.regime.dimension === 3
    && input.regime.volume === "compact"
  ) {
    const polyhedron = interpretCompactPolyhedron(pairData);
    validateAndreev(polyhedron);
    return realizeCompactHyperbolicPolyhedron(polyhedron);
  }

  throw new Error("Geometric regime not yet implemented.");
}
```

The exact discriminated-union syntax can be refined, but the layer separation should remain.

---

# 16. Error architecture

Errors should identify the layer where interpretation failed.

```ts
export type CoxeterInputError =
  | MatrixValidationError
  | DiagramValidationError
  | PairNormalizationError
  | PolygonInterpretationError
  | PolyhedronInterpretationError
  | AndreevValidationError
  | GeometricSolveError;
```

Examples:

```ts
type PairNormalizationError =
  | {
      readonly kind: "duplicate-generator";
      readonly generator: GeneratorId;
    }
  | {
      readonly kind: "unknown-generator";
      readonly generator: GeneratorId;
    }
  | {
      readonly kind: "duplicate-pair";
      readonly a: GeneratorId;
      readonly b: GeneratorId;
    }
  | {
      readonly kind: "missing-pair";
      readonly a: GeneratorId;
      readonly b: GeneratorId;
    }
  | {
      readonly kind: "invalid-order";
      readonly a: GeneratorId;
      readonly b: GeneratorId;
      readonly value: unknown;
    };
```

```ts
type PolygonInterpretationError =
  | {
      readonly kind: "finite-relation-graph-not-cycle";
      readonly degrees: ReadonlyMap<GeneratorId, number>;
    }
  | {
      readonly kind: "polygon-not-hyperbolic";
      readonly reciprocalOrderSum: number;
      readonly threshold: number;
    };
```

```ts
type PolyhedronInterpretationError =
  | { readonly kind: "dual-graph-disconnected" }
  | { readonly kind: "dual-graph-nonplanar" }
  | { readonly kind: "dual-graph-not-3-connected" }
  | {
      readonly kind: "dual-face-not-triangular";
      readonly face: readonly GeneratorId[];
    };
```

This allows the UI to explain whether the problem is:

- malformed notation;
- ambiguous convention;
- invalid Coxeter data;
- invalid polygon/polyhedron combinatorics;
- failed hyperbolic existence conditions;
- numerical failure.

---

# 17. Canonical serialization

The recommended canonical persisted algebraic format is complete pair data:

```json
{
  "generators": ["a", "b", "c", "d"],
  "relations": [
    { "a": "a", "b": "b", "order": 3 },
    { "a": "a", "b": "c", "order": 2 },
    { "a": "a", "b": "d", "order": "infinity" },
    { "a": "b", "b": "c", "order": 4 },
    { "a": "b", "b": "d", "order": 2 },
    { "a": "c", "b": "d", "order": 5 }
  ]
}
```

This is verbose but unambiguous.

Human-facing files may use diagram syntax, but they should be normalized immediately after parsing.

For geometric fixtures, store the explicit polygon or polyhedron specification as the canonical solver input and generate the pair data or matrix as needed.

---

# 18. Test strategy

The architecture should be tested layer by layer.

## 18.1 Normalization equivalence tests

Provide the same Coxeter system as:

- a matrix;
- a standard diagram;
- an explicit pair list;
- an Artin graph.

Verify that all normalize to identical `CoxeterPairData`.

## 18.2 Convention tests

Verify:

- omitted standard Coxeter-diagram edge becomes order \(2\);
- unlabeled standard edge becomes order \(3\);
- explicit infinity remains infinity;
- a custom omitted-pair convention is honored.

## 18.3 Polygon interpretation tests

Verify:

- finite-relation cycle is recovered;
- cyclic order is deterministic;
- reversal/rotation canonicalization works;
- noncycle graphs are rejected;
- hyperbolicity inequality is checked.

## 18.4 Polyhedron interpretation tests

Verify:

- planar embedding is recovered;
- dual triangles are enumerated;
- primal incidences are correct;
- right-angle pairs suppressed in diagram input reappear as finite-relation edges;
- nonplanar and non-\(3\)-connected graphs are rejected.

## 18.5 End-to-end equivalence tests

Realize the same polygon or polyhedron from several input notations and verify that the final reflection representations agree up to conjugacy and generator ordering.

---

# 19. Recommended module structure

```text
input/
  GeneratorId.ts
  CoxeterOrder.ts
  CoxeterMatrixInput.ts
  CoxeterDiagramInput.ts
  PairOrderGraphInput.ts
  ArtinGraphInput.ts
  ExplicitPairRelationsInput.ts

normalization/
  CoxeterPairData.ts
  NormalizeMatrix.ts
  NormalizeDiagram.ts
  NormalizeArtinGraph.ts
  NormalizePairGraph.ts
  ValidatePairData.ts
  IndexPairData.ts

interpretation/
  GeometricRegime.ts
  InterpretCompactPolygon.ts
  InterpretCompactPolyhedron.ts
  InterpretationResult.ts

combinatorics/
  FiniteRelationGraph.ts
  CycleRecovery.ts
  PlanarEmbedding.ts
  RotationSystem.ts
  DualizePolyhedron.ts

validation/
  PolygonAngleValidation.ts
  AndreevValidation.ts

solver2d/
  PortiPolygonSolver.ts

solver3d/
  HyperbolicPolyhedronSolver.ts

api/
  RealizeCoxeterGeometry.ts
```

---

# 20. Milestones

## Milestone 1: normalized pair data

Implement:

- Coxeter matrix parser;
- standard Coxeter diagram parser;
- explicit pair-list parser;
- canonical `CoxeterPairData`;
- equivalence tests.

## Milestone 2: graph input

Implement:

- configurable omitted-pair convention;
- configurable unlabeled-edge convention;
- Artin graph conversion.

## Milestone 3: compact 2D interpreter

Implement:

\[
\text{pair data}
\longrightarrow
\text{finite-relation cycle}
\longrightarrow
\text{polygon spec}.
\]

Connect this to the Porti solver.

## Milestone 4: compact 3D interpreter

Implement:

\[
\text{pair data}
\longrightarrow
\text{finite-relation dual graph}
\longrightarrow
\text{spherical cellulation}
\longrightarrow
\text{polyhedron spec}.
\]

Connect this to Andreev validation and the supporting-plane solver.

## Milestone 5: explicit cell-complex input

Allow users to bypass inference and provide:

- polygon cyclic data;
- polyhedron face lattice;
- ideal/hyperideal vertex annotations.

## Milestone 6: ambiguity handling

For noncompact regimes, return structured ambiguity results rather than forcing a geometric interpretation.

---

# 21. Final design principle

Use three different internal languages for three different jobs:

\[
\boxed{
\begin{aligned}
\text{complete pair orders}
&\quad\text{for algebraic input},\\
\text{explicit cell complexes}
&\quad\text{for combinatorial geometry},\\
\text{supporting geodesics/planes}
&\quad\text{for numerical realization}.
\end{aligned}
}
\]

The Coxeter matrix, Coxeter diagram, and Artin graph are front-end notations.

The polygon or polyhedron specification is the solver contract.

The geometric reflection representation is the output.
