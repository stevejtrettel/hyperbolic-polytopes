import * as THREE from 'three';
import type { Geometry } from '../geometry/types';
import type { Model } from '../models/types';
import { buildTubeGeometry } from './tube';

/** Lift a Matrix3 linear part + translation into a Matrix4 (column-major). */
function compose(linear: THREE.Matrix3, t: THREE.Vector3): THREE.Matrix4 {
  const e = linear.elements;
  return new THREE.Matrix4().set(
    e[0], e[3], e[6], t.x,
    e[1], e[4], e[7], t.y,
    e[2], e[5], e[8], t.z,
    0, 0, 0, 1,
  );
}

/**
 * A vertex as a unit sphere transformed by the model's local distortion:
 * position = project(v), shape = radius · jacobianAt(v). Conformal models give a
 * round dot of correct intrinsic size; the Klein model's anisotropy renders it
 * (correctly) as an ellipse.
 */
export function vertexMesh<P>(
  geom: Geometry<P>,
  model: Model<P>,
  v: P,
  opts: { radius: number; color: THREE.ColorRepresentation; detail?: number },
): THREE.Mesh {
  void geom;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, opts.detail ?? 24, opts.detail ?? 24),
    new THREE.MeshPhysicalMaterial({ color: opts.color, roughness: 0.3, clearcoat: 1 }),
  );
  mesh.matrixAutoUpdate = false;
  const linear = model.jacobianAt(v).multiplyScalar(opts.radius);
  mesh.matrix.copy(compose(linear, model.project(v)));
  mesh.matrixWorldNeedsUpdate = true;
  return mesh;
}

/**
 * An edge as a geodesic tube of constant intrinsic width: sample the geodesic,
 * project each sample, radius = width · scaleAt(sample) so it tapers correctly
 * toward the boundary.
 */
export function edgeMesh<P>(
  geom: Geometry<P>,
  model: Model<P>,
  a: P,
  b: P,
  opts: { width: number; color: THREE.ColorRepresentation; segments?: number; radialSegments?: number },
): THREE.Mesh {
  const g = geom.geodesic(a, b);
  const n = opts.segments ?? 48;
  const samples: P[] = [];
  for (let i = 0; i <= n; i++) samples.push(g(i / n));
  const points = samples.map((p) => model.project(p));
  const radii = samples.map((p) => opts.width * model.scaleAt(p));
  const geometry = buildTubeGeometry(points, radii, opts.radialSegments ?? 12);
  return new THREE.Mesh(
    geometry,
    new THREE.MeshPhysicalMaterial({ color: opts.color, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.3 }),
  );
}

/** Weighted ambient combination of canonical points, renormalized onto the hyperboloid. */
function combine<P>(geom: Geometry<P>, parts: { p: P; w: number }[]): P {
  const sum = (parts[0].p as unknown as { clone(): P }).clone();
  (sum as unknown as { multiplyScalar(s: number): void }).multiplyScalar(0);
  for (const { p, w } of parts) (sum as unknown as { addScaledVector(v: P, s: number): void }).addScaledVector(p, w);
  return geom.normalize(sum);
}

/**
 * A face as a tessellated geodesic polygon. Fan-triangulate the loop from its
 * (hyperbolic) centroid; subdivide each fan triangle on a barycentric grid and
 * renormalize every sample onto the hyperboloid. Because a positive ambient
 * combination of points on one hyperbolic plane stays on that plane after
 * renormalizing, the patch lies EXACTLY on the face — flat in Klein, a spherical
 * cap in the Poincaré ball — with no geodesic interpolation needed.
 */
export function faceMesh<P>(
  geom: Geometry<P>,
  model: Model<P>,
  loop: P[],
  opts: { color: THREE.ColorRepresentation; opacity?: number; resolution?: number; depthWrite?: boolean },
): THREE.Mesh {
  const R = opts.resolution ?? 6;
  const centroid = combine(geom, loop.map((p) => ({ p, w: 1 })));

  const positions: number[] = [];
  const indices: number[] = [];

  for (let e = 0; e < loop.length; e++) {
    const A = centroid;
    const B = loop[e];
    const C = loop[(e + 1) % loop.length];
    const base = positions.length / 3;
    // Barycentric grid over triangle (A, B, C).
    const idx = (i: number, j: number) => base + (i * (2 * R + 3 - i)) / 2 + j;
    for (let i = 0; i <= R; i++) {
      for (let j = 0; j <= R - i; j++) {
        const wa = (R - i - j) / R;
        const wb = i / R;
        const wc = j / R;
        const pt = model.project(combine(geom, [{ p: A, w: wa }, { p: B, w: wb }, { p: C, w: wc }]));
        positions.push(pt.x, pt.y, pt.z);
      }
    }
    for (let i = 0; i < R; i++) {
      for (let j = 0; j < R - i; j++) {
        indices.push(idx(i, j), idx(i + 1, j), idx(i, j + 1));
        if (j < R - i - 1) indices.push(idx(i + 1, j), idx(i + 1, j + 1), idx(i, j + 1));
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const transparent = (opts.opacity ?? 1) < 1;
  return new THREE.Mesh(
    geometry,
    new THREE.MeshPhysicalMaterial({
      color: opts.color,
      roughness: 0.5,
      side: THREE.DoubleSide,
      transparent,
      opacity: opts.opacity ?? 1,
      depthWrite: opts.depthWrite ?? true, // false → a see-through shell that doesn't occlude what's inside
    }),
  );
}
