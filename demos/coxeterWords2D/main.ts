// Images of the fundamental domain under an explicit list of Coxeter words (H²).
//
// The words are read from words.txt (one word per line, generator indices applied
// left to right) — edit it and Vite hot-reloads. Each word's image of the
// fundamental polygon is drawn, shaded by word length. Pick the Coxeter group and
// the model from the dropdowns; words using a generator the group lacks are
// skipped.
//
//   npm run dev coxeterWords

import { Vector3 } from 'three';
import GUI from 'lil-gui';
import { Viewer, depthColor, type ViewItem } from '../_shared/viewer';
import { Hyperbolic2 } from '../../src/geometry/Hyperbolic2';
import { PoincareDisk } from '../../src/models/PoincareDisk';
import { KleinDisk } from '../../src/models/KleinDisk';
import { UpperHalfPlane } from '../../src/models/UpperHalfPlane';
import { triangleGram, regularPolygonGram } from '../../src/coxeter/gram';
import { buildCoxeterGroup2 } from '../../src/coxeter/CoxeterGroup';
import { hullOfPolytopes2 } from '../../src/polytope/build';
import { parseWords } from '../../src/coxeter/words';
import wordsText from './words.txt?raw';

const geom = new Hyperbolic2(-1);

const GROUPS: Record<string, () => ReturnType<typeof buildCoxeterGroup2>> = {
  '(2,3,7) triangle': () => buildCoxeterGroup2(triangleGram(2, 3, 7)),
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
const state = { group: '(2,3,7) triangle', model: 'Poincaré disk', hull: false };

function rebuild(): void {
  const group = GROUPS[state.group]();
  const model = MODELS[state.model as keyof typeof MODELS];
  const words = parseWords(wordsText, group.rank);
  const maxLen = Math.max(1, ...words.map((w) => w.length));
  const tiles = group.images(words);

  const items: ViewItem<Vector3>[] = tiles.map((t) => ({
    poly: t.polytope,
    style: {
      showVertices: false,
      edgeWidth: 0.01,
      edgeColor: 0x2c2c2c,
      faceColor: depthColor(t.word.length, maxLen),
      faceOpacity: 0.9,
      faceResolution: 4,
      edgeSegments: 10,
      edgeRadialSegments: 6,
    },
  }));

  // Optionally wrap the collection in its convex hull, as a see-through polygon
  // sitting behind the tiles. (Console logs the timing — the hull is O(V³) here.)
  if (state.hull) {
    const t0 = performance.now();
    const hull = hullOfPolytopes2(group.geom, tiles.map((t) => t.polytope));
    console.log(`convex hull: ${tiles.length} tiles → ${hull.vertices.length} hull vertices in ${(performance.now() - t0).toFixed(1)} ms`);
    items.push({
      poly: hull,
      style: { showVertices: false, edgeWidth: 0.014, edgeColor: 0x3d5a80, faceColor: 0x3d5a80, faceOpacity: 0.18, faceDepthWrite: false, faceResolution: 5 },
    });
  }
  viewer.show(group.geom, model, items);
}

const gui = new GUI({ title: 'Coxeter words (H²)' });
gui.add(state, 'group', Object.keys(GROUPS)).onChange(rebuild);
gui.add(state, 'model', Object.keys(MODELS)).onChange(rebuild);
gui.add(state, 'hull').name('convex hull').onChange(rebuild);
rebuild();
