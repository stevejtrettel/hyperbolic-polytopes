import { describe, it, expect } from 'vitest';
import { Vector4, Matrix4 } from 'three';
import { Hyperbolic3 } from '../src/geometry/Hyperbolic3';
import { fromVertices3 } from '../src/polytope/build';
import { transformPolytope, reflectPolytope } from '../src/polytope/transform';
import { buildCoxeterGroup2, buildCoxeterGroup3 } from '../src/coxeter/CoxeterGroup';
import { triangleGram, pathGram } from '../src/coxeter/gram';
import { mink3, mink4 } from '../src/math/minkowski';

/** Euclidean distance between two ambient vectors (works for Vector3 and Vector4). */
const dist = (a: { clone(): any }, b: any): number => a.clone().sub(b).length();

const h3 = new Hyperbolic3(-1);
function cube(): ReturnType<typeof fromVertices3> {
  const pts: Vector4[] = [];
  for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1]) {
    pts.push(h3.exp(h3.origin(), new Vector4(0, sx, sy, sz), 0.6));
  }
  return fromVertices3(h3, pts);
}

describe('transformPolytope (the image under an isometry)', () => {
  it('preserves the combinatorics; the image is a new, distinct polytope', () => {
    const c = cube();
    const g = new Matrix4().makeRotationX(0.7); // a spatial rotation ∈ O(3,1)
    const img = transformPolytope(c, h3, g);
    expect(img.vertices.length).toBe(c.vertices.length);
    expect(img.edges.length).toBe(c.edges.length);
    expect(img.faces.length).toBe(c.faces.length);
    expect(img.vertices).not.toBe(c.vertices); // new arrays, original untouched
    // vertices actually moved
    const moved = img.vertices.some((v, i) => dist(v, c.vertices[i]) > 1e-6);
    expect(moved).toBe(true);
  });

  it('keeps image vertices on the hyperboloid ⟨v,v⟩ = -1', () => {
    const img = transformPolytope(cube(), h3, new Matrix4().makeRotationX(0.7));
    for (const v of img.vertices) expect(mink4(v, v)).toBeCloseTo(-1, 6);
  });

  it('round-trips under g then g⁻¹', () => {
    const c = cube();
    const g = new Matrix4().makeRotationX(0.7);
    const back = transformPolytope(transformPolytope(c, h3, g), h3, h3.inverse(g));
    for (let i = 0; i < c.vertices.length; i++) {
      expect(dist(back.vertices[i], c.vertices[i])).toBeLessThan(1e-9);
    }
  });

  it('applying a Coxeter generator twice is the identity (reflections are involutions)', () => {
    const group = buildCoxeterGroup3(pathGram([3, 5, 3]));
    const geom = group.geom;
    const polytope = group.fundamentalDomain();
    const generators = group.reflections;
    const twice = transformPolytope(transformPolytope(polytope, geom, generators[0]), geom, generators[0]);
    for (let i = 0; i < polytope.vertices.length; i++) {
      expect(dist(twice.vertices[i], polytope.vertices[i])).toBeLessThan(1e-9);
    }
  });
});

describe('reflectPolytope', () => {
  it('reflecting twice across the same mirror is the identity', () => {
    const group = buildCoxeterGroup2(triangleGram(2, 3, 7));
    const geom = group.geom;
    const polytope = group.fundamentalDomain();
    const normals = group.mirrors;
    const twice = reflectPolytope(reflectPolytope(polytope, geom, normals[0]), geom, normals[0]);
    for (let i = 0; i < polytope.vertices.length; i++) {
      expect(dist(twice.vertices[i], polytope.vertices[i])).toBeLessThan(1e-9);
    }
  });

  it('fixes the vertices that lie on the mirror wall', () => {
    const group = buildCoxeterGroup2(triangleGram(2, 3, 7));
    const geom = group.geom;
    const polytope = group.fundamentalDomain();
    const normals = group.mirrors;
    const mirror = normals[0];
    const img = reflectPolytope(polytope, geom, mirror);
    for (let i = 0; i < polytope.vertices.length; i++) {
      const onMirror = Math.abs(mink3(polytope.vertices[i], mirror.normal)) < 1e-6;
      if (onMirror) expect(dist(img.vertices[i], polytope.vertices[i])).toBeLessThan(1e-9);
    }
  });

  it('the image shares the mirror geodesic (its pole is ±the mirror pole)', () => {
    const group = buildCoxeterGroup2(triangleGram(2, 3, 7));
    const geom = group.geom;
    const polytope = group.fundamentalDomain();
    const normals = group.mirrors;
    const img = reflectPolytope(polytope, geom, normals[0]);
    // reflect(n0) = -n0, so the mirror line reappears as a facet of the image.
    const shares = img.facets.some((f) => Math.abs(Math.abs(mink3(f.normal, normals[0].normal)) - 1) < 1e-6);
    expect(shares).toBe(true);
  });
});
