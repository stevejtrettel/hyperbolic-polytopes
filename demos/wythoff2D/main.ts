// Wythoff uniform tilings of H² from a triangle reflection group.
//
// DIFFERENT object from the Coxeter polygon: instead of the fundamental triangle
// (chamber), this builds the uniform tiling's CELLS (tiles) and tessellates them.
// Which of the triangle's three mirrors the seed lies on — the ringed Coxeter
// diagram — selects the form (the regular {p,q} tiling, its truncation,
// rectification, the omnitruncated tiling, …). Toggle the rings.
//
// (Same reflection group as coxeter2D, and drawn the same way — one polytope
// carried over the orbit — but the tiles are the uniform cells, not the chamber.)
//
//   npm run dev wythoff2D
import GUI from 'lil-gui';
import { Viewer, depthColor } from '../_shared/viewer';
import { Hyperbolic2 } from '../../src/geometry/Hyperbolic2';
import { PoincareDisk } from '../../src/models/PoincareDisk';
import { KleinDisk } from '../../src/models/KleinDisk';
import { UpperHalfPlane } from '../../src/models/UpperHalfPlane';
import { triangleGram } from '../../src/coxeter/gram';
import { buildCoxeterGroup2 } from '../../src/coxeter/CoxeterGroup';
import { wythoffTessellation } from '../../src/coxeter/wythoff';

const geom = new Hyperbolic2(-1);

// Compact hyperbolic triangle groups (p,q,r): 1/p + 1/q + 1/r < 1.
const GROUPS: Record<string, [number, number, number]> = {
  '(2,3,7)': [2, 3, 7],
  '(2,3,8)': [2, 3, 8],
  '(2,4,5)': [2, 4, 5],
  '(3,3,4)': [3, 3, 4],
  '(3,4,4)': [3, 4, 4],
};

const MODELS = {
  'Poincaré disk': new PoincareDisk(geom),
  'Klein disk': new KleinDisk(geom),
  'Upper half-plane': new UpperHalfPlane(geom),
};

const viewer = new Viewer();
const state = { group: '(2,3,7)', ring0: true, ring1: false, ring2: false, model: 'Poincaré disk', depth: 9 };

function rebuild(): void {
  const active = [state.ring0, state.ring1, state.ring2];
  if (!active.some(Boolean)) return; // need at least one ring; keep the last drawing
  const [p, q, r] = GROUPS[state.group];
  const group = buildCoxeterGroup2(triangleGram(p, q, r));
  const model = MODELS[state.model as keyof typeof MODELS];
  const cells = wythoffTessellation(group, active, state.depth, 1500);
  viewer.show(
    geom,
    model,
    cells.map((c) => ({
      poly: c.polytope,
      style: {
        showVertices: false,
        edgeWidth: 0.008,
        edgeColor: 0x2c2c2c,
        faceColor: depthColor(c.depth, state.depth),
        faceOpacity: 0.92,
        faceResolution: 6,
        edgeSegments: 10,
      },
    })),
  );
}

const gui = new GUI({ title: 'Wythoff tilings (H²)' });
const tri = gui.addFolder('Triangle group');
tri.add(state, 'group', Object.keys(GROUPS)).name('(p,q,r)').onChange(rebuild);
tri.add(state, 'ring0').name('ring s₀').onChange(rebuild);
tri.add(state, 'ring1').name('ring s₁').onChange(rebuild);
tri.add(state, 'ring2').name('ring s₂').onChange(rebuild);
const view = gui.addFolder('View');
view.add(state, 'model', Object.keys(MODELS)).onChange(rebuild);
view.add(state, 'depth', 2, 12, 1).name('orbit depth').onChange(rebuild);
rebuild();
