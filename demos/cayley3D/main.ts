// The Cayley graph of a 3D Coxeter group, drawn in hyperbolic space.
//
// One node per group element at its chamber centre; one edge per generator,
// coloured by generator. The 3D analogue of cayley2D — orbit it inside the ball.
// (Word-length radius is kept modest: the 3D groups branch fast.)
//
// The list mixes COMPACT Coxeter tetrahedra and the right-angled dodecahedron
// with NON-COMPACT tetrahedra (an ∞ / order-6 edge gives an ideal vertex). The
// Cayley graph only needs the reflections and a chamber-interior base point —
// both well-defined for the non-compact groups — so they draw fine.
//
//   npm run dev cayley3D

import GUI from 'lil-gui';
import { Viewer } from '../_shared/viewer';
import { Hyperbolic3 } from '../../src/geometry/Hyperbolic3';
import { PoincareBall } from '../../src/models/PoincareBall';
import { KleinBall } from '../../src/models/KleinBall';
import { UpperHalfSpace } from '../../src/models/UpperHalfSpace';
import { pathGram, rightAngledDodecahedronGram } from '../../src/coxeter/gram';
import { buildCoxeterGroup3 } from '../../src/coxeter/CoxeterGroup';
import { CayleyGraphView } from '../../src/coxeter/CayleyGraphView';

const geom = new Hyperbolic3(-1);

// pathGram([a,b,c]) is the Coxeter tetrahedron with a linear diagram (consecutive
// dihedral angles π/a, π/b, π/c; non-consecutive walls perpendicular). [3,5,3],
// [4,3,5], [5,3,5] are compact; a 6 or ∞ edge introduces an ideal vertex, so
// [3,3,6] / [4,3,6] are non-compact.
const GROUPS: Record<string, () => ReturnType<typeof buildCoxeterGroup3>> = {
  'Tetrahedron [3,5,3]': () => buildCoxeterGroup3(pathGram([3, 5, 3])),
  'Tetrahedron [4,3,5]': () => buildCoxeterGroup3(pathGram([4, 3, 5])),
  'Tetrahedron [5,3,5]': () => buildCoxeterGroup3(pathGram([5, 3, 5])),
  'Tetrahedron [3,3,6] (ideal)': () => buildCoxeterGroup3(pathGram([3, 3, 6])),
  'Tetrahedron [4,3,6] (ideal)': () => buildCoxeterGroup3(pathGram([4, 3, 6])),
  'Right-angled dodecahedron': () => buildCoxeterGroup3(rightAngledDodecahedronGram()),
};

const MODELS = {
  'Poincaré ball': new PoincareBall(geom),
  'Klein ball': new KleinBall(geom),
  'Upper half-space': new UpperHalfSpace(geom),
};

// Each node/edge is its own mesh, so the node count is the cost. This bounds the
// breadth-first enumeration so a high radius on a fast-branching group (the
// dodecahedron especially) degrades to a truncated ball instead of freezing the
// page. Raise it if your machine is happy with more.
const MAX_NODES = 6000;

const viewer = new Viewer();
const state = { group: 'Tetrahedron [3,5,3]', model: 'Poincaré ball', radius: 8 };

function rebuild(): void {
  const group = GROUPS[state.group]();
  const model = MODELS[state.model as keyof typeof MODELS];
  const t0 = performance.now();
  const graph = group.cayleyGraph(state.radius, MAX_NODES);
  viewer.display(
    new CayleyGraphView(graph, group.geom, model, group.basePoint(), { nodeRadius: 0.012, edgeWidth: 0.008 }),
    model,
  );
  console.log(`Cayley graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges in ${(performance.now() - t0).toFixed(0)} ms`);
}

const gui = new GUI({ title: 'Cayley graph (H³)' });
gui.add(state, 'group', Object.keys(GROUPS)).onChange(rebuild);
gui.add(state, 'model', Object.keys(MODELS)).onChange(rebuild);
gui.add(state, 'radius', 0, 15, 1).name('word-length radius').onChange(rebuild);
rebuild();
