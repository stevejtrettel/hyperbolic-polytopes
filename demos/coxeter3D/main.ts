// Hyperbolic Coxeter polytopes and their honeycombs (H³).
//
// Pick a compact Coxeter polytope (from its Gram matrix), a model, and an orbit
// depth N. Depth N draws every translate of the fundamental cell by a word of
// length ≤ N — the start of the honeycomb, shaded by depth. The tetrahedra are
// the Lannér simplices; the dodecahedron is the compact right-angled one.
//
// (A Coxeter octahedron is necessarily ideal — its vertices sit at infinity —
// so it waits on ideal-vertex support.)
//
//   npm run dev coxeter3D

import GUI from 'lil-gui';
import { Viewer, depthColor } from '../_shared/viewer';
import { Hyperbolic3 } from '../../src/geometry/Hyperbolic3';
import { PoincareBall } from '../../src/models/PoincareBall';
import { KleinBall } from '../../src/models/KleinBall';
import { UpperHalfSpace } from '../../src/models/UpperHalfSpace';
import { pathGram, rightAngledDodecahedronGram } from '../../src/coxeter/gram';
import { buildCoxeterGroup3 } from '../../src/coxeter/CoxeterGroup';

const geom = new Hyperbolic3(-1);

const GROUPS: Record<string, () => ReturnType<typeof buildCoxeterGroup3>> = {
  'Tetrahedron [3,5,3]': () => buildCoxeterGroup3(pathGram([3, 5, 3])),
  'Tetrahedron [4,3,5]': () => buildCoxeterGroup3(pathGram([4, 3, 5])),
  'Tetrahedron [5,3,5]': () => buildCoxeterGroup3(pathGram([5, 3, 5])),
  'Right-angled dodecahedron': () => buildCoxeterGroup3(rightAngledDodecahedronGram()),
};

const MODELS = {
  'Poincaré ball': new PoincareBall(geom),
  'Klein ball': new KleinBall(geom),
  'Upper half-space': new UpperHalfSpace(geom),
};

const viewer = new Viewer();
const state = { polytope: 'Tetrahedron [3,5,3]', model: 'Poincaré ball', depth: 1 };

function rebuild(): void {
  const group = GROUPS[state.polytope]();
  const model = MODELS[state.model as keyof typeof MODELS];
  const tiles = group.tessellate(state.depth, 250);
  const items = tiles.map((t) => ({
    poly: t.polytope,
    style: {
      faceColor: depthColor(t.depth, state.depth),
      faceOpacity: 0.5,
      edgeWidth: 0.012,
      faceResolution: 4,
      edgeSegments: 10,
      edgeRadialSegments: 6,
    },
  }));
  viewer.show(geom, model, items);
}

const gui = new GUI({ title: 'Coxeter polytopes (H³)' });
gui.add(state, 'polytope', Object.keys(GROUPS)).onChange(rebuild);
gui.add(state, 'model', Object.keys(MODELS)).onChange(rebuild);
gui.add(state, 'depth', 0, 4, 1).name('orbit depth').onChange(rebuild);
rebuild();
