// Canonical hyperbolic Coxeter polygons — an interactive testbed (H²).
//
// Polygon: pick the side count n, then type the cyclic vertex orders as a
// comma-separated list. m_i = ord(s_i s_{i+1}) is the angle β_i = π/m_i where side
// i meets side i+1. Porti's minimum-perimeter construction supplies the
// ultraparallel side-distances the angles leave undetermined, so REGULAR and
// IRREGULAR n-gons alike realize with no hand-derived Gram and no diagonalization.
//
// View: `reflections` is the tiling depth — 0 draws just the fundamental polygon;
// N draws every chamber reached by a word of ≤ N mirror reflections, shaded by
// depth — and `model` is the chart (Poincaré / Klein / upper-half).
//
// The readout flags whether the data is hyperbolic: Σ 1/m_i < n − 2 (equality is
// Euclidean, more is spherical — neither tiles H², so they're reported, not drawn).
//
//   npm run dev coxeterPolygon2D
import GUI from 'lil-gui';
import { Viewer, depthColor } from '../_shared/viewer';
import { Hyperbolic2 } from '../../src/geometry/Hyperbolic2';
import { PoincareDisk } from '../../src/models/PoincareDisk';
import { KleinDisk } from '../../src/models/KleinDisk';
import { UpperHalfPlane } from '../../src/models/UpperHalfPlane';
import { buildCanonicalCoxeterGroup2 } from '../../src/coxeter/CoxeterGroup';

const geom = new Hyperbolic2(-1);

const MODELS = {
  'Poincaré disk': new PoincareDisk(geom),
  'Klein disk': new KleinDisk(geom),
  'Upper half-plane': new UpperHalfPlane(geom),
};

const SIDE_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 3); // 3…12

/** A sensible hyperbolic default order list for an n-gon, used when n changes. */
function defaultOrders(n: number): number[] {
  if (n === 3) return [2, 3, 7]; // a compact (2,3,7) triangle
  if (n === 4) return [3, 3, 3, 3]; // right angles would be Euclidean here
  return new Array(n).fill(2); // n ≥ 5: the regular right-angled n-gon
}

const viewer = new Viewer();
const gui = new GUI({ title: 'Canonical Coxeter polygons (H²)' });

const state = {
  sides: 5,
  orders: defaultOrders(5).join(', '),
  reflections: 0,
  model: 'Poincaré disk',
};

// Two groups: what the polygon IS, and how it's VIEWED.
const polygonFolder = gui.addFolder('Polygon');
polygonFolder.add(state, 'sides', SIDE_OPTIONS).name('sides (n)').onChange(onSidesChange);
const ordersCtrl = polygonFolder.add(state, 'orders').name('orders (comma-sep)').onChange(render);

const viewFolder = gui.addFolder('View');
viewFolder.add(state, 'reflections', 0, 12, 1).name('reflections (depth)').onChange(render);
viewFolder.add(state, 'model', Object.keys(MODELS)).onChange(render);

function onSidesChange(): void {
  // Reset the list to a valid default of the new length, so n and the list agree.
  state.orders = defaultOrders(state.sides).join(', ');
  ordersCtrl.updateDisplay();
  render();
}

/** Parse "2, 3, 7" → [2,3,7]; returns null if any entry is not an integer ≥ 2. */
function parseOrders(text: string): number[] | null {
  const parts = text.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
  const nums = parts.map(Number);
  if (nums.length === 0 || nums.some((m) => !Number.isInteger(m) || m < 2)) return null;
  return nums;
}

function render(): void {
  const orders = parseOrders(state.orders);
  // Invalid input (bad list, wrong count, or non-hyperbolic) leaves the previous
  // valid drawing in place rather than throwing.
  if (orders === null || orders.length !== state.sides) return;

  let group;
  try {
    group = buildCanonicalCoxeterGroup2(orders);
  } catch {
    return;
  }

  const model = MODELS[state.model as keyof typeof MODELS];
  const tiles = group.tessellate(state.reflections, 2000);

  // Curved faces/edges need a fine tessellation to read well, but a deep tiling
  // is thousands of tiny tiles where that detail is invisible and expensive. So
  // scale the render detail to the tile count: lavish on a lone polygon, cheap
  // when the shell is dense.
  const detail = detailFor(tiles.length);
  viewer.show(
    geom,
    model,
    tiles.map((t) => ({
      poly: t.polytope,
      style: {
        showVertices: false,
        edgeWidth: 0.008,
        edgeColor: 0x2c2c2c,
        faceColor: depthColor(t.depth, state.reflections),
        faceOpacity: 0.9,
        faceResolution: detail.faceResolution,
        edgeSegments: detail.edgeSegments,
        edgeRadialSegments: detail.edgeRadialSegments,
      },
    })),
  );
}

/** Render detail (face grid + edge-tube segments) by tile count. */
function detailFor(count: number): { faceResolution: number; edgeSegments: number; edgeRadialSegments: number } {
  if (count <= 1) return { faceResolution: 32, edgeSegments: 48, edgeRadialSegments: 8 };
  if (count <= 30) return { faceResolution: 18, edgeSegments: 28, edgeRadialSegments: 6 };
  if (count <= 300) return { faceResolution: 8, edgeSegments: 14, edgeRadialSegments: 5 };
  return { faceResolution: 3, edgeSegments: 8, edgeRadialSegments: 5 };
}

render();
