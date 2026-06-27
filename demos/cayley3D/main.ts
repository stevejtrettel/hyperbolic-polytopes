// The Cayley graph of a 3D Coxeter group, drawn in hyperbolic space.
//
// One node per group element at its chamber centre; one edge per generator,
// coloured by generator. The 3D analogue of cayley2D — orbit it inside the ball.
// (Word-length radius is kept modest: the 3D groups branch fast.)
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
import { parseWords } from '../../src/coxeter/words';
import { matrixKey } from '../../src/group/orbit';
import highlightText from './highlight.txt?raw';

const geom = new Hyperbolic3(-1);

const GROUPS: Record<string, () => ReturnType<typeof buildCoxeterGroup3>> = {
  'Tetrahedron [3,5,3]': () => buildCoxeterGroup3(pathGram([3, 5, 3])),
  'Tetrahedron [4,3,5]': () => buildCoxeterGroup3(pathGram([4, 3, 5])),
  'Right-angled dodecahedron': () => buildCoxeterGroup3(rightAngledDodecahedronGram()),
};

const MODELS = {
  'Poincaré ball': new PoincareBall(geom),
  'Klein ball': new KleinBall(geom),
  'Upper half-space': new UpperHalfSpace(geom),
};

const viewer = new Viewer();
const state = { polytope: 'Tetrahedron [3,5,3]', model: 'Poincaré ball', radius: 9, highlight: false };

/** The element keys to highlight: the element of each word in highlight.txt. */
function highlightSet(group: ReturnType<typeof buildCoxeterGroup3>): Set<string> | undefined {
  if (!state.highlight) return undefined;
  return new Set(parseWords(highlightText, group.rank).map((w) => matrixKey(group.word(w))));
}

function rebuild(): void {
  const group = GROUPS[state.polytope]();
  const model = MODELS[state.model as keyof typeof MODELS];
  const t0 = performance.now();
  const graph = group.cayleyGraph(state.radius, 50000); // safety bound only; raise if you want even more
  viewer.display(
    new CayleyGraphView(graph, group.geom, model, group.basePoint(), { nodeRadius: 0.012, edgeWidth: 0.008, highlight: highlightSet(group) }),
    model,
  );
  console.log(`Cayley graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges in ${(performance.now() - t0).toFixed(0)} ms`);
}

const gui = new GUI({ title: 'Cayley graph (H³)' });
gui.add(state, 'polytope', Object.keys(GROUPS)).onChange(rebuild);
gui.add(state, 'model', Object.keys(MODELS)).onChange(rebuild);
gui.add(state, 'radius', 0, 15, 1).name('word-length radius').onChange(rebuild);
gui.add(state, 'highlight').name('highlight (highlight.txt)').onChange(rebuild);
rebuild();
