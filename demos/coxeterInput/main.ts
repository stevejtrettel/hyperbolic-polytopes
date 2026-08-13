// Coxeter groups from combinatorial data: DRAW a diagram, get the tiling (H²).
//
// The panel (top-left) is an interactive Coxeter diagram. The underlying data is
// the complete set of pairwise orders; "Coxeter view" hides the order-2 edges and
// "Artin view" hides the order-∞ edges — two views of the SAME data (switching
// the view doesn't change the tiling). For a hyperbolic n-gon the Artin view is
// natural: it's just a cycle of drawn edges.
//
// Pipeline: complete pair data → cyclic polygon spec → canonical (Porti)
// realization → tessellation. Non-polygon data reports in the panel footer.
//
//   npm run dev coxeterInput
import GUI from 'lil-gui';
import { Viewer, depthColor } from '../_shared/viewer';
import { DiagramEditor, type DiagramSeed } from '../_shared/diagramEditor';
import { Hyperbolic2 } from '../../src/geometry/Hyperbolic2';
import { PoincareDisk } from '../../src/models/PoincareDisk';
import { KleinDisk } from '../../src/models/KleinDisk';
import { UpperHalfPlane } from '../../src/models/UpperHalfPlane';
import type { CoxeterPairData } from '../../src/coxeter/pairData';
import { coxeterPolygonGroup } from '../../src/coxeter/CoxeterGroup';

const geom = new Hyperbolic2(-1);

const MODELS = {
  'Poincaré disk': new PoincareDisk(geom),
  'Klein disk': new KleinDisk(geom),
  'Upper half-plane': new UpperHalfPlane(geom),
};

// Initial diagram: an irregular pentagon (its five non-∞ edges); the rest of the
// pairs default to ∞ (the Artin view's hidden value).
const INITIAL: DiagramSeed = {
  generators: ['s0', 's1', 's2', 's3', 's4'],
  edges: [
    { a: 's0', b: 's1', order: 2 },
    { a: 's1', b: 's2', order: 2 },
    { a: 's2', b: 's3', order: 2 },
    { a: 's3', b: 's4', order: 3 },
    { a: 's4', b: 's0', order: 5 },
  ],
};

const viewer = new Viewer();
const state = { model: 'Poincaré disk', depth: 4 };
let diagram: CoxeterPairData = { generators: [], relations: [] }; // populated by the editor's first emit

const editor = new DiagramEditor({ initial: INITIAL, view: 'artin', onChange: (d) => { diagram = d; render(); } });

function render(): void {
  let group;
  try {
    // The editor emits the canonical COMPLETE pair data, straight into the group.
    group = coxeterPolygonGroup(diagram);
    editor.setStatus('');
  } catch {
    editor.setStatus('not a compact hyperbolic polygon (need one cycle, Σ1/mᵢ < n−2)');
    return; // keep the last valid drawing
  }

  const model = MODELS[state.model as keyof typeof MODELS];
  const tiles = group.tessellate(state.depth, 2000);
  viewer.show(
    geom,
    model,
    tiles.map((t) => ({
      poly: t.polytope,
      style: {
        showVertices: false,
        edgeWidth: 0.008,
        edgeColor: 0x2c2c2c,
        faceColor: depthColor(t.depth, state.depth),
        faceOpacity: 0.9,
        faceResolution: 6,
        edgeSegments: 10,
      },
    })),
  );
}

const gui = new GUI({ title: 'Coxeter group from a diagram (H²)' });
gui.add(state, 'model', Object.keys(MODELS)).onChange(render);
gui.add(state, 'depth', 0, 10, 1).name('orbit depth').onChange(render);
