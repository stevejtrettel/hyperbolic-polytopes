// Convex polygons in H², viewable in any 2D model.
//
// A dropdown of polygons — some built as the convex hull of vertices, some as an
// intersection of half-spaces — and a dropdown of models (Poincaré disk, Klein
// disk, upper half-plane). The combinatorics is model-free; switching the model
// just redraws the same polygon through a different chart.
//
//   npm run dev polygons

import { Vector3 } from 'three';
import GUI from 'lil-gui';
import { Viewer } from '../_shared/viewer';
import { Hyperbolic2 } from '../../src/geometry/Hyperbolic2';
import { Hyperplane } from '../../src/geometry/Hyperplane';
import { PoincareDisk } from '../../src/models/PoincareDisk';
import { KleinDisk } from '../../src/models/KleinDisk';
import { UpperHalfPlane } from '../../src/models/UpperHalfPlane';
import { fromVertices2, fromHalfspaces2 } from '../../src/polytope/build';
import type { Polytope } from '../../src/polytope/Polytope';

const geom = new Hyperbolic2(-1);
const form = (a: Vector3, b: Vector3) => geom.form(a, b);

/** A regular n-gon as the convex hull of n vertices at intrinsic radius R. */
function hull(n: number, R: number): Polytope<Vector3> {
  const verts: Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const t = (2 * Math.PI * i) / n;
    verts.push(geom.exp(geom.origin(), new Vector3(0, Math.cos(t), Math.sin(t)), R));
  }
  return fromVertices2(geom, verts);
}

/** A quadrilateral as the intersection of 4 half-spaces at distance a, 90° apart. */
function halfspaceQuad(a: number): Polytope<Vector3> {
  const planes = [0, 1, 2, 3].map((k) => {
    const t = (Math.PI / 2) * k;
    return Hyperplane.fromNormal(form, new Vector3(Math.sinh(a), Math.cosh(a) * Math.cos(t), Math.cosh(a) * Math.sin(t)));
  });
  return fromHalfspaces2(geom, planes);
}

const SHAPES: Record<string, () => Polytope<Vector3>> = {
  'Triangle (hull)': () => hull(3, 1.1),
  'Pentagon (hull)': () => hull(5, 1.3),
  'Heptagon (hull)': () => hull(7, 1.4),
  'Quadrilateral (half-spaces)': () => halfspaceQuad(0.6),
};

const MODELS = {
  'Poincaré disk': new PoincareDisk(geom),
  'Klein disk': new KleinDisk(geom),
  'Upper half-plane': new UpperHalfPlane(geom),
};

const viewer = new Viewer();
const state = { polygon: 'Pentagon (hull)', model: 'Poincaré disk' };

function rebuild(): void {
  const model = MODELS[state.model as keyof typeof MODELS];
  viewer.show(geom, model, [{ poly: SHAPES[state.polygon](), style: { faceOpacity: 0.85 } }]);
}

const gui = new GUI({ title: 'Polygons in H²' });
gui.add(state, 'polygon', Object.keys(SHAPES)).onChange(rebuild);
gui.add(state, 'model', Object.keys(MODELS)).onChange(rebuild);
rebuild();
