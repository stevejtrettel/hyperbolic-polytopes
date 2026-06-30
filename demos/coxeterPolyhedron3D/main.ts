// Compact hyperbolic Coxeter polyhedra from the face-normal solver (H³).
//
// Route B: each shape starts from a Euclidean SEED solid of the right
// combinatorial type; the solver finds the supporting planes realizing the
// chosen dihedral angles (order m ⇒ angle π/m), and the reflection group tiles H³.
//
// Each polyhedron exposes only the dihedral-angle orders that can actually VARY
// for it — grouped by symmetry class (e.g. the soccer ball's pentagon–hexagon
// vs hexagon–hexagon edges) — over the ranges that realize a compact polyhedron.
// Classes not shown are pinned at π/2 (right angles). Rigid shapes (the
// right-angled dodecahedron, the prisms) have no knobs.
//
//   npm run dev coxeterPolyhedron3D
import GUI from 'lil-gui';
import { Viewer, depthColor } from '../_shared/viewer';
import { Hyperbolic3 } from '../../src/geometry/Hyperbolic3';
import { PoincareBall } from '../../src/models/PoincareBall';
import { KleinBall } from '../../src/models/KleinBall';
import { UpperHalfSpace } from '../../src/models/UpperHalfSpace';
import {
  dodecahedronSeed,
  truncatedIcosahedronSeed,
  truncatedOctahedronSeed,
  truncatedTetrahedronSeed,
  cubeSeed,
  prismSeed,
  seedLorentzNormals,
  type SeedSolid,
} from '../../src/coxeter/polyhedron/seeds';
import { analyzeCombinatorics, type PolyhedronCombinatorics } from '../../src/coxeter/polyhedron/combinatorics';
import { uniformOrder, faceTypeOrder, independentEdgeOrder, type EdgeOrder } from '../../src/coxeter/polyhedron/edgeOrdering';
import { realizeCoxeterPolyhedron } from '../../src/coxeter/polyhedron/realizePolyhedron';
import { realization3ToGroup } from '../../src/coxeter/CoxeterGroup';

const geom = new Hyperbolic3(-1);
const SEED_INRADIUS = 0.4;

const MODELS = {
  'Poincaré ball': new PoincareBall(geom),
  'Klein ball': new KleinBall(geom),
  'Upper half-space': new UpperHalfSpace(geom),
};

/** One tunable dihedral-angle order: a named slider over a valid range. */
interface AngleParam {
  readonly key: string;
  readonly label: string; // what edges it controls
  readonly min: number;
  readonly max: number;
  readonly value: number; // current order m (angle π/m); mutated by the GUI
}

/** A selectable polyhedron: a seed + its tunable angle classes + how to build the order map. */
interface Shape {
  readonly label: string;
  readonly seed: () => SeedSolid;
  readonly params: AngleParam[];
  /** Build the edge-order callback from the current parameter values. */
  readonly order: (c: PolyhedronCombinatorics, p: Record<string, number>) => EdgeOrder;
}

const param = (key: string, label: string, min: number, max: number, value: number): AngleParam => ({ key, label, min, max, value });

const CATALOG: Shape[] = [
  {
    label: 'Right-angled dodecahedron',
    seed: dodecahedronSeed,
    params: [],
    order: () => uniformOrder(2),
  },
  {
    label: 'Soccer ball (truncated icosahedron)',
    seed: truncatedIcosahedronSeed,
    params: [param('ph', 'pentagon–hexagon', 2, 3, 2), param('hh', 'hexagon–hexagon', 2, 6, 2)],
    order: (c, p) => faceTypeOrder(c, { '5-6': p.ph, '6-6': p.hh }),
  },
  {
    label: 'Truncated octahedron',
    seed: truncatedOctahedronSeed,
    params: [param('hh', 'hexagon–hexagon', 3, 6, 3)], // square–hexagon pinned at π/2
    order: (c, p) => faceTypeOrder(c, { '6-6': p.hh }),
  },
  {
    label: 'Truncated tetrahedron',
    seed: truncatedTetrahedronSeed,
    params: [param('hh', 'hexagon–hexagon', 4, 7, 4)], // triangle–hexagon pinned at π/2
    order: (c, p) => faceTypeOrder(c, { '6-6': p.hh }),
  },
  {
    label: 'Lambert cube',
    seed: cubeSeed,
    params: [param('m', 'Lambert edges', 3, 8, 4)], // three non-coplanar edges; other nine at π/2
    order: (c, p) => independentEdgeOrder(c, p.m),
  },
  {
    label: 'Pentagonal prism',
    seed: () => prismSeed(5),
    params: [],
    order: (c) => faceTypeOrder(c, { '4-5': 3 }), // rim π/3, vertical π/2
  },
  {
    label: 'Hexagonal prism',
    seed: () => prismSeed(6),
    params: [],
    order: (c) => faceTypeOrder(c, { '4-6': 3 }),
  },
];

const viewer = new Viewer();
const gui = new GUI({ title: 'Coxeter polyhedra (H³)' });

const state = { shape: 'Soccer ball (truncated icosahedron)', model: 'Poincaré ball', depth: 0 };
let combinatorics: PolyhedronCombinatorics;
let shape: Shape;

const polyFolder = gui.addFolder('Polyhedron');
polyFolder.add(state, 'shape', CATALOG.map((s) => s.label)).name('shape').onChange(onShapeChange);

const viewFolder = gui.addFolder('View');
viewFolder.add(state, 'model', Object.keys(MODELS)).onChange(render);
viewFolder.add(state, 'depth', 0, 3, 1).name('honeycomb depth').onChange(render);

let paramCtrls: ReturnType<typeof polyFolder.add>[] = [];

function onShapeChange(): void {
  shape = CATALOG.find((s) => s.label === state.shape)!;
  combinatorics = analyzeCombinatorics(geom, seedLorentzNormals(shape.seed(), SEED_INRADIUS));
  for (const c of paramCtrls) c.destroy();
  paramCtrls = shape.params.map((pm) =>
    polyFolder.add(pm, 'value', pm.min, pm.max, 1).name(`${pm.label} (π/m)`).onChange(render),
  );
  render();
}

function render(): void {
  const values = Object.fromEntries(shape.params.map((pm) => [pm.key, pm.value]));
  let group;
  try {
    const pr = realizeCoxeterPolyhedron(shape.seed(), shape.order(combinatorics, values), {
      seedInradius: SEED_INRADIUS,
      skipAndreev: true, // v1's Andreev check is incomplete for prismatic-4 seeds; solve + verify is the gate
    });
    group = realization3ToGroup(pr.realization);
  } catch {
    return; // shouldn't happen within the published ranges; keep the last drawing if it does
  }

  const model = MODELS[state.model as keyof typeof MODELS];
  const tiles = group.tessellate(state.depth, 250);
  viewer.show(
    geom,
    model,
    tiles.map((t) => ({
      poly: t.polytope,
      style: {
        faceColor: depthColor(t.depth, state.depth),
        faceOpacity: 0.5,
        edgeWidth: 0.012,
        faceResolution: 4,
        edgeSegments: 10,
        edgeRadialSegments: 6,
      },
    })),
  );
}

onShapeChange(); // seeds combinatorics + param sliders for the initial shape, then renders
