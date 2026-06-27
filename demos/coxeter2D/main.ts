// Hyperbolic Coxeter polygons and their tilings (H²).
//
// Pick a Coxeter polygon (built from its Gram matrix), a model to view it in,
// and an orbit depth N. The fundamental polygon is the chamber of its reflection
// group; depth N draws every translate by a word of length ≤ N — the tiling,
// shaded by depth. Triangles are rigid (angles alone); the polygons need their
// ultraparallel side-lengths, supplied by regularPolygonGram.
//
//   npm run dev coxeter2D

import GUI from 'lil-gui';
import { Viewer, depthColor } from '../_shared/viewer';
import { Hyperbolic2 } from '../../src/geometry/Hyperbolic2';
import { PoincareDisk } from '../../src/models/PoincareDisk';
import { KleinDisk } from '../../src/models/KleinDisk';
import { UpperHalfPlane } from '../../src/models/UpperHalfPlane';
import { triangleGram, regularPolygonGram } from '../../src/coxeter/gram';
import { buildCoxeterGroup2 } from '../../src/coxeter/CoxeterGroup';

const geom = new Hyperbolic2(-1);

const GROUPS: Record<string, () => ReturnType<typeof buildCoxeterGroup2>> = {
  '(2,3,7) triangle': () => buildCoxeterGroup2(triangleGram(2, 3, 7)),
  '(2,3,8) triangle': () => buildCoxeterGroup2(triangleGram(2, 3, 8)),
  '(2,4,5) triangle': () => buildCoxeterGroup2(triangleGram(2, 4, 5)),
  'Right-angled pentagon': () => buildCoxeterGroup2(regularPolygonGram(5, 2)),
  'Right-angled hexagon': () => buildCoxeterGroup2(regularPolygonGram(6, 2)),
  'Quadrilateral (π/3)': () => buildCoxeterGroup2(regularPolygonGram(4, 3)),
};

const MODELS = {
  'Poincaré disk': new PoincareDisk(geom),
  'Klein disk': new KleinDisk(geom),
  'Upper half-plane': new UpperHalfPlane(geom),
};

const viewer = new Viewer();
const state = { polygon: 'Right-angled pentagon', model: 'Poincaré disk', depth: 3 };

function rebuild(): void {
  const group = GROUPS[state.polygon]();
  const model = MODELS[state.model as keyof typeof MODELS];
  const tiles = group.tessellate(state.depth, 2000);
  const items = tiles.map((t) => ({
    poly: t.polytope,
    style: {
      showVertices: false,
      edgeWidth: 0.008,
      edgeColor: 0x2c2c2c,
      faceColor: depthColor(t.depth, state.depth),
      faceOpacity: 0.9,
      // Cheap tessellation: deep tilings have thousands of tiny tiles.
      faceResolution: 3,
      edgeSegments: 8,
      edgeRadialSegments: 5,
    },
  }));
  viewer.show(geom, model, items);
}

const gui = new GUI({ title: 'Coxeter polygons (H²)' });
gui.add(state, 'polygon', Object.keys(GROUPS)).onChange(rebuild);
gui.add(state, 'model', Object.keys(MODELS)).onChange(rebuild);
gui.add(state, 'depth', 0, 12, 1).name('orbit depth').onChange(rebuild);
rebuild();
