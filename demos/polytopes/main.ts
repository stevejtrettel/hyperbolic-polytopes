// Convex polytopes in H³, viewable in any 3D model.
//
// A dropdown of polytopes — most built as the convex hull of vertices, one as an
// intersection of half-spaces — and a dropdown of models (Poincaré ball, Klein
// ball, upper half-space). Same model-free combinatorics as the polygons demo,
// lifted to three dimensions.
//
//   npm run dev polytopes

import { Vector4 } from 'three';
import GUI from 'lil-gui';
import { Viewer } from '../_shared/viewer';
import { Hyperbolic3 } from '../../src/geometry/Hyperbolic3';
import { Hyperplane } from '../../src/geometry/Hyperplane';
import { PoincareBall } from '../../src/models/PoincareBall';
import { KleinBall } from '../../src/models/KleinBall';
import { UpperHalfSpace } from '../../src/models/UpperHalfSpace';
import { fromVertices3, fromHalfspaces3 } from '../../src/polytope/build';
import type { Polytope } from '../../src/polytope/Polytope';

const geom = new Hyperbolic3(-1);
const form = (a: Vector4, b: Vector4) => geom.form(a, b);
const phi = (1 + Math.sqrt(5)) / 2;

/** The convex hull of a set of direction vectors, exp'd to intrinsic radius R. */
function hull(dirs: [number, number, number][], R: number): Polytope<Vector4> {
  const verts = dirs.map(([x, y, z]) => geom.exp(geom.origin(), new Vector4(0, x, y, z), R));
  return fromVertices3(geom, verts);
}

/** A cuboid as the intersection of 6 half-spaces (±axis) at distance a. */
function halfspaceCube(a: number): Polytope<Vector4> {
  const axes: [number, number, number][] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const planes = axes.map(([x, y, z]) =>
    Hyperplane.fromNormal(form, new Vector4(Math.sinh(a), Math.cosh(a) * x, Math.cosh(a) * y, Math.cosh(a) * z)),
  );
  return fromHalfspaces3(geom, planes);
}

const CUBE: [number, number, number][] = [];
for (const x of [1, -1]) for (const y of [1, -1]) for (const z of [1, -1]) CUBE.push([x, y, z]);
const OCTA: [number, number, number][] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const TETRA: [number, number, number][] = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
const ICOSA: [number, number, number][] = [];
for (const a of [1, -1]) for (const b of [phi, -phi]) ICOSA.push([0, a, b], [a, b, 0], [b, 0, a]);

const SHAPES: Record<string, () => Polytope<Vector4>> = {
  'Tetrahedron (hull)': () => hull(TETRA, 0.7),
  'Cube (hull)': () => hull(CUBE, 0.6),
  'Octahedron (hull)': () => hull(OCTA, 0.7),
  'Icosahedron (hull)': () => hull(ICOSA, 1.0),
  'Cuboid (half-spaces)': () => halfspaceCube(0.5),
};

const MODELS = {
  'Poincaré ball': new PoincareBall(geom),
  'Klein ball': new KleinBall(geom),
  'Upper half-space': new UpperHalfSpace(geom),
};

const viewer = new Viewer();
const state = { polytope: 'Icosahedron (hull)', model: 'Poincaré ball' };

function rebuild(): void {
  const model = MODELS[state.model as keyof typeof MODELS];
  viewer.show(geom, model, [{ poly: SHAPES[state.polytope](), style: { faceOpacity: 0.5 } }]);
}

const gui = new GUI({ title: 'Polytopes in H³' });
gui.add(state, 'polytope', Object.keys(SHAPES)).onChange(rebuild);
gui.add(state, 'model', Object.keys(MODELS)).onChange(rebuild);
rebuild();
