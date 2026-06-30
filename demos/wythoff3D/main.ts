// Wythoff uniform honeycombs of H³ from a tetrahedral reflection group.
//
// DIFFERENT object from the Coxeter polyhedron: instead of the fundamental
// tetrahedron (chamber), this builds the uniform honeycomb's CELLS (uniform
// polyhedra) and tessellates them. The ringed Coxeter diagram (which of the four
// mirrors the seed lies on) selects the form — the regular honeycomb {p,q,r}, its
// truncations, rectifications, the omnitruncated honeycomb, etc.
//
//   npm run dev wythoff3D
import GUI from 'lil-gui';
import { Viewer, depthColor } from '../_shared/viewer';
import { Hyperbolic3 } from '../../src/geometry/Hyperbolic3';
import { PoincareBall } from '../../src/models/PoincareBall';
import { KleinBall } from '../../src/models/KleinBall';
import { UpperHalfSpace } from '../../src/models/UpperHalfSpace';
import { pathGram } from '../../src/coxeter/gram';
import { buildCoxeterGroup3 } from '../../src/coxeter/CoxeterGroup';
import { wythoffTessellation } from '../../src/coxeter/wythoff';

const geom = new Hyperbolic3(-1);

// The four compact regular honeycombs of H³ (Lannér tetrahedra, linear diagram).
const GROUPS: Record<string, [number, number, number]> = {
  '{5,3,4}': [5, 3, 4],
  '{4,3,5}': [4, 3, 5],
  '{5,3,5}': [5, 3, 5],
  '{3,5,3}': [3, 5, 3],
};

const MODELS = {
  'Poincaré ball': new PoincareBall(geom),
  'Klein ball': new KleinBall(geom),
  'Upper half-space': new UpperHalfSpace(geom),
};

const viewer = new Viewer();
const state = {
  group: '{5,3,4}',
  ring0: true,
  ring1: false,
  ring2: false,
  ring3: false,
  model: 'Poincaré ball',
  depth: 6,
};

function rebuild(): void {
  const active = [state.ring0, state.ring1, state.ring2, state.ring3];
  if (!active.some(Boolean)) return; // need at least one ring; keep the last drawing
  const group = buildCoxeterGroup3(pathGram(GROUPS[state.group]));
  const model = MODELS[state.model as keyof typeof MODELS];
  const cells = wythoffTessellation(group, active, state.depth, 400);
  viewer.show(
    geom,
    model,
    cells.map((c) => ({
      poly: c.polytope,
      style: {
        faceColor: depthColor(c.depth, state.depth),
        faceOpacity: 0.5,
        edgeWidth: 0.01,
        faceResolution: 4,
        edgeSegments: 8,
        edgeRadialSegments: 5,
      },
    })),
  );
}

const gui = new GUI({ title: 'Wythoff honeycombs (H³)' });
const grp = gui.addFolder('Tetrahedral group');
grp.add(state, 'group', Object.keys(GROUPS)).name('{p,q,r}').onChange(rebuild);
grp.add(state, 'ring0').name('ring s₀').onChange(rebuild);
grp.add(state, 'ring1').name('ring s₁').onChange(rebuild);
grp.add(state, 'ring2').name('ring s₂').onChange(rebuild);
grp.add(state, 'ring3').name('ring s₃').onChange(rebuild);
const view = gui.addFolder('View');
view.add(state, 'model', Object.keys(MODELS)).onChange(rebuild);
view.add(state, 'depth', 2, 9, 1).name('orbit depth').onChange(rebuild);
rebuild();
