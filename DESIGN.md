# DESIGN.md — the visualizer as a product

Forward-looking design for turning this repo from a set of demos into a
reusable **visualization layer** for Coxeter-group computations. Today the
heavy group theory is intended to live in separate Python code; this repo's job
is to take its output and make beautiful 2D/3D hyperbolic visualizations.

This is a design/vision document. For how the *current* code is laid out, see
[CLAUDE.md](CLAUDE.md).

## Goal

A mathematician runs Coxeter-group calculations in Python (generators,
subgroups, cosets, word lists, …) and gets back, with almost no JS knowledge, a
**self-contained interactive visualization** — typically a standalone HTML
file, optionally a live web app for experimentation.

## Core principle: a JSON contract is the product

Decouple *computation* (Python) from *visualization* (JS) with a single,
versioned **JSON scene description** as the boundary between them.

```
Python (group theory)  ──►  scene JSON (the contract)  ──►  JS renderer (this repo)  ──►  HTML / live app
```

Everything else is replaceable; the schema is the thing we design with care and
are slow to change. It carries a `version` so the renderer can validate and
migrate.

This follows the Plotly pattern: a figure is just JSON, `plotly.js` renders it,
and the Python package bundles the JS and emits HTML. The Python user
`pip install`s and never touches npm.

### Geometry lives in JS

**The JS engine owns the hyperbolic geometry.** Python sends *abstract* data —
Gram matrices, generators, word lists, coset representatives — and the existing
`gram → realize → CoxeterGroup → orbit/tessellate` pipeline computes the
geometry in the browser. Python does essentially no geometry; it serializes
specs.

Consequences:
- Files stay tiny (a Gram matrix + word lists, not coordinate dumps).
- One source of geometric truth (the engine here), already correct and tested.
- Switching between many groups is cheap and can happen live in the browser.

A low-level `raw` draw type (explicit points/edges/polygons with coordinates) is
the escape hatch for anything the engine can't yet realize.

## The three pieces

1. **The schema** — a versioned JSON spec describing a scene. Language-agnostic,
   lives in this repo. *This is the API.*
2. **The JS renderer** — a single entry point `render(container, scene)` that
   parses the JSON and dispatches each draw op to existing builders. The current
   `demos/_shared/viewer.ts` (`show` / `display`) is ~80% of this already; the
   work is hoisting it into a public API and making the *config declarative*
   instead of code. Built as one standalone bundle (Vite library mode).
3. **The Python package** (pip-first) — a thin builder that mirrors the schema,
   emits the JSON, bundles the compiled JS inside the wheel, and renders to a
   standalone HTML file (and later a live server / notebook widget). The
   npm/JS bundle is an internal asset, not the user-facing thing.

## Schema shape

The scene schema is essentially the existing demo configs (shape · model ·
orbit-depth, etc.) made declarative and serializable. A scene splits into three
layers:

- **template** — the *how*: what to draw, in which model, with which ops. Fixed
  across a batch.
- **binding** — the *what*: the variable data (the group, the word lists).
- **style** — the look. Usually fixed across a batch.

### Template + bindings (parameterize over many groups)

A template declares named `params` and references them with `$ref` where the
variable data goes. `scene = instantiate(template, binding)`.

```jsonc
// template.json — the "how", written once
{
  "version": "0.1",
  "space": "H2",                  // H2 | H3
  "model": "poincare",           // initial model; the viewer can still switch
  "params": ["group", "words"],  // declared inputs
  "group": { "$ref": "group" },  // filled per instance
  "draw": [
    { "type": "cayley", "radius": 5 },
    { "type": "tiles", "words": { "$ref": "words" } }
  ],
  "style": { /* fixed across the batch */ }
}
```

```jsonl
// bindings.jsonl — the "what", computed in Python, one record per line
{ "group": {"gram": [[...]]}, "words": [[0,1],[1,2,1]] }
{ "group": {"gram": [[...]]}, "words": [[2,0,1]] }
// …20 lines, one per example group…
```

`.jsonl` is the natural format: the group-theory code appends one record per
example.

### References

- `{ "$ref": "name" }` — bind to a declared `param`, filled at instantiation.
- `{ "$load": "group07.words.txt" }` — load from an external file/URL at render
  time. Lets you regenerate just the data and reload without rebuilding the
  scene — good for live experimentation. (The repo already loads word lists from
  text via `coxeter/words` `parseWords`; this generalizes that.)

### Draw ops (map 1:1 onto existing engine capabilities)

| op | meaning | backed by |
|----|---------|-----------|
| `fundamentalDomain` | the chamber | `CoxeterGroup.fundamentalDomain()` |
| `tiles` (a word list) | draw the **tile each word represents** — the image of the fundamental domain under that word | `images(words)` / `tessellate` |
| `tessellate` (depth N) | the full orbit of the chamber to depth N | `CoxeterGroup.tessellate(N)` |
| `cayley` (radius N) | the Cayley graph | `CayleyGraph` / `CayleyGraphView` |
| `polytope` (vertices / halfspaces) | a convex polytope | `Polytope.fromVertices/fromHalfspaces` |
| `raw` (points/edges/polygons) | explicit geometry — the escape hatch | render primitives directly |

**Semantics note for word-driven ops:** a word maps to *something* before it can
be drawn. For `tiles`, each word maps to the image of the fundamental domain
(its tile). Any op that takes a word list must state what each word maps to —
e.g. a hull op would need to say it hulls the base-point images of the words.
Pin these down precisely when writing the schema.

## Delivery

Because JS owns the geometry, iterating one template over N groups has two
modes:

1. **N self-contained files** — Python loops the bindings, emits
   `group01.html … groupN.html` (or a gallery). Simple, shareable.
2. **One interactive file with a selector** — embed the template + all N
   bindings (tiny) into a single HTML; a dropdown re-runs `render()` on binding
   *n*. The heavy work (realize, orbit, tiling) happens in the browser on demand
   — **no Python round-trip per group.** Best for comparing examples.

Primary target is the standalone HTML file; a live web app / file-watching dev
server (`scene.serve()`) is a small addition on the same bundle + `render()`,
for interactive experimentation.

## Why this layering wins

Once schema v0 is frozen, the Python side and the JS side **decouple in time**:
each is built and tested independently against the JSON contract, and the JS
half can be exercised entirely with hand-written scene files (which double as
golden fixtures) before any Python exists. The `version` field lets the renderer
reject or migrate old files gracefully.

## Phased plan

1. **Freeze schema v0** and carve out `render(container, scene)` from the
   current viewer. Everything else hangs off these two.
2. **Standalone bundle** (Vite library mode) — one `.js`.
3. **HTML exporter** — a template that embeds the bundle + scene JSON. Testable
   with hand-written scenes; no Python required yet.
4. **Python builder** — mirrors the schema, emits JSON, ships the bundle, writes
   HTML.
5. **Live mode** — file-watching dev server / notebook widget (`anywidget`),
   later.

## Open questions

- Exact `params` / `$ref` / `$load` resolution rules (precedence, missing-value
  behavior, nested refs).
- Precise per-op word semantics (what each word maps to, per op).
- Naming of the schema fields and the Python API surface.
- Styling model: how much per-element control vs. theme presets.
