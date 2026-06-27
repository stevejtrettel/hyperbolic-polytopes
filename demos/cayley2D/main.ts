// The Cayley graph of a 2D Coxeter group, drawn in the hyperbolic plane.
//
// One node per group element, placed at the chamber's centre (the orbit of a base
// point); one edge per generator, joining g to gR_i, COLOURED BY GENERATOR. Since
// each generator is an involution, the i-coloured edges form a perfect matching —
// that colouring is what makes the group structure readable. Pick the group, the
// model, and the word-length radius.
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
import { parseWords } from '../../src/coxeter/words';
import { matrixKey } from '../../src/group/orbit';
import highlightText from './highlight.txt?raw';

const geom = new Hyperbolic2(-1);

const GROUPS: Record<string, () => ReturnType<typeof buildCoxeterGroup2>> = {
  '(2,3,7) triangle': () => buildCoxeterGroup2(triangleGram(2, 3, 7)),
  '(2,3,8) triangle': () => buildCoxeterGroup2(triangleGram(2, 3, 8)),
  '(2,4,5) triangle': () => buildCoxeterGroup2(triangleGram(2, 4, 5)),
  'Right-angled pentagon': () => buildCoxeterGroup2(regularPolygonGram(5, 2)),
  'Right-angled hexagon': () => buildCoxeterGroup2(regularPolygonGram(6, 2)),
};

const MODELS = {
  'Poincaré disk': new PoincareDisk(geom),
  'Klein disk': new KleinDisk(geom),
  'Upper half-plane': new UpperHalfPlane(geom),
};

const viewer = new Viewer();
const state = { group: '(2,3,7) triangle', model: 'Poincaré disk', radius: 9, highlight: false };

/** The element keys to highlight: the element of each word in highlight.txt. */
function highlightSet(group: ReturnType<typeof buildCoxeterGroup2>): Set<string> | undefined {
  if (!state.highlight) return undefined;
  return new Set(parseWords(highlightText, group.rank).map((w) => matrixKey(group.word(w))));
}

function rebuild(): void {
  const group = GROUPS[state.group]();
  const model = MODELS[state.model as keyof typeof MODELS];
  const t0 = performance.now();
  const graph = group.cayleyGraph(state.radius, 50000); // safety bound only; raise if you want even more
  viewer.display(new CayleyGraphView(graph, group.geom, model, group.basePoint(), { highlight: highlightSet(group) }), model);
  console.log(`Cayley graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges in ${(performance.now() - t0).toFixed(0)} ms`);
}

const gui = new GUI({ title: 'Cayley graph (H²)' });
gui.add(state, 'group', Object.keys(GROUPS)).onChange(rebuild);
gui.add(state, 'model', Object.keys(MODELS)).onChange(rebuild);
gui.add(state, 'radius', 0, 22, 1).name('word-length radius').onChange(rebuild);
gui.add(state, 'highlight').name('highlight (highlight.txt)').onChange(rebuild);
rebuild();
