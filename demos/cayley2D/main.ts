// The Cayley graph of a 2D Coxeter group, drawn in the hyperbolic plane.
//
// One node per group element, placed at the chamber's centre (the orbit of a base
// point); one edge per generator, joining g to gR_i, COLOURED BY GENERATOR. Since
// each generator is an involution, the i-coloured edges form a perfect matching —
// that colouring is what makes the group structure readable. Pick the group, the
// model, and the word-length radius.
//
// The list mixes COMPACT triangle/polygon groups with NON-COMPACT ones (ideal
// vertices, m = ∞). The Cayley graph only needs the group's reflections and a
// chamber-interior base point — both well-defined even when the fundamental
// domain runs off to the ideal boundary — so the non-compact groups draw fine.
//
//   npm run dev cayley2D

import GUI from 'lil-gui';
import { Viewer } from '../_shared/viewer';
import { Hyperbolic2 } from '../../src/geometry/Hyperbolic2';
import { PoincareDisk } from '../../src/models/PoincareDisk';
import { KleinDisk } from '../../src/models/KleinDisk';
import { UpperHalfPlane } from '../../src/models/UpperHalfPlane';
import { triangleGram, regularPolygonGram } from '../../src/coxeter/gram';
import { buildCoxeterGroup2 } from '../../src/coxeter/CoxeterGroup';
import { CayleyGraphView } from '../../src/coxeter/CayleyGraphView';

const geom = new Hyperbolic2(-1);
const INF = Infinity;

// Each entry builds the Coxeter group fresh (cheap). Triangle groups (p,q,r) are
// compact when 1/p + 1/q + 1/r < 1; an ∞ label is a pair of parallel walls (an
// ideal vertex), so those groups are non-compact but still tile H².
const GROUPS: Record<string, () => ReturnType<typeof buildCoxeterGroup2>> = {
  '(2,3,7) triangle — Hurwitz': () => buildCoxeterGroup2(triangleGram(2, 3, 7)),
  '(2,3,8) triangle': () => buildCoxeterGroup2(triangleGram(2, 3, 8)),
  '(2,4,5) triangle': () => buildCoxeterGroup2(triangleGram(2, 4, 5)),
  '(2,5,5) triangle': () => buildCoxeterGroup2(triangleGram(2, 5, 5)),
  '(3,3,4) triangle': () => buildCoxeterGroup2(triangleGram(3, 3, 4)),
  '(2,3,∞) triangle — modular group': () => buildCoxeterGroup2(triangleGram(2, 3, INF)),
  '(3,3,∞) triangle': () => buildCoxeterGroup2(triangleGram(3, 3, INF)),
  '(∞,∞,∞) ideal triangle': () => buildCoxeterGroup2(triangleGram(INF, INF, INF)),
  'Right-angled pentagon': () => buildCoxeterGroup2(regularPolygonGram(5, 2)),
  'Right-angled hexagon': () => buildCoxeterGroup2(regularPolygonGram(6, 2)),
};

const MODELS = {
  'Poincaré disk': new PoincareDisk(geom),
  'Klein disk': new KleinDisk(geom),
  'Upper half-plane': new UpperHalfPlane(geom),
};

// Each node is its own little sphere mesh (plus a tube per edge), so the node
// count is the cost. This bounds the breadth-first enumeration so a high radius on
// a fast-branching group degrades to a (still meaningful) truncated ball instead
// of freezing the page. Raise it if your machine is happy with more.
const MAX_NODES = 6000;

const viewer = new Viewer();
const state = { group: '(2,3,7) triangle — Hurwitz', model: 'Poincaré disk', radius: 12 };

function rebuild(): void {
  const group = GROUPS[state.group]();
  const model = MODELS[state.model as keyof typeof MODELS];
  const t0 = performance.now();
  const graph = group.cayleyGraph(state.radius, MAX_NODES);
  viewer.display(new CayleyGraphView(graph, group.geom, model, group.basePoint()), model);
  console.log(`Cayley graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges in ${(performance.now() - t0).toFixed(0)} ms`);
}

const gui = new GUI({ title: 'Cayley graph (H²)' });
gui.add(state, 'group', Object.keys(GROUPS)).onChange(rebuild);
gui.add(state, 'model', Object.keys(MODELS)).onChange(rebuild);
gui.add(state, 'radius', 0, 22, 1).name('word-length radius').onChange(rebuild);
rebuild();
