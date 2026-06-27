// Images of the fundamental cell under an explicit list of Coxeter words (H³).
//
// The 3D counterpart of coxeterWords: words are read from words.txt (one per
// line, generator indices applied left to right) and Vite hot-reloads on edit.
// Each word's image of the fundamental polytope is drawn, shaded by word length.
// Pick the Coxeter polytope and the model; words using a missing generator are
// skipped.
//
//   npm run dev coxeterWords3D

import { Vector4 } from 'three';
import GUI from 'lil-gui';
import { Viewer, depthColor, type ViewItem } from '../_shared/viewer';
import { Hyperbolic3 } from '../../src/geometry/Hyperbolic3';
import { PoincareBall } from '../../src/models/PoincareBall';
import { KleinBall } from '../../src/models/KleinBall';
import { UpperHalfSpace } from '../../src/models/UpperHalfSpace';
import { pathGram, rightAngledDodecahedronGram } from '../../src/coxeter/gram';
import { buildCoxeterGroup3 } from '../../src/coxeter/CoxeterGroup';
import { hullOfPolytopes3 } from '../../src/polytope/build';
import { parseWords } from '../../src/coxeter/words';
import wordsText from './words.txt?raw';

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
const state = { polytope: 'Tetrahedron [3,5,3]', model: 'Poincaré ball', hull: false };

function rebuild(): void {
  const group = GROUPS[state.polytope]();
  const model = MODELS[state.model as keyof typeof MODELS];
  const words = parseWords(wordsText, group.rank);
  const maxLen = Math.max(1, ...words.map((w) => w.length));
  const tiles = group.images(words);

  const items: ViewItem<Vector4>[] = tiles.map((t) => ({
    poly: t.polytope,
    style: {
      faceColor: depthColor(t.word.length, maxLen),
      faceOpacity: 0.5,
      edgeWidth: 0.012,
      faceResolution: 4,
      edgeSegments: 10,
      edgeRadialSegments: 6,
    },
  }));

  // Optionally wrap the whole collection in its convex hull, as a see-through
  // shell with the tiles visible inside. (Watch the console for the timing —
  // the hull is O(V⁴), so it slows as the union grows.)
  if (state.hull) {
    const t0 = performance.now();
    const hull = hullOfPolytopes3(group.geom, tiles.map((t) => t.polytope));
    console.log(`convex hull: ${tiles.length} tiles → ${hull.vertices.length} hull vertices in ${(performance.now() - t0).toFixed(1)} ms`);
    items.push({
      poly: hull,
      style: {
        faceColor: 0x3d5a80,
        faceOpacity: 0.14,
        faceDepthWrite: false,
        edgeWidth: 0.008,
        edgeColor: 0x3d5a80,
        showVertices: false,
        faceResolution: 5,
        edgeSegments: 16,
        edgeRadialSegments: 8,
      },
    });
  }
  viewer.show(group.geom, model, items);
}

const gui = new GUI({ title: 'Coxeter words (H³)' });
gui.add(state, 'polytope', Object.keys(GROUPS)).onChange(rebuild);
gui.add(state, 'model', Object.keys(MODELS)).onChange(rebuild);
gui.add(state, 'hull').name('convex hull').onChange(rebuild);
rebuild();
