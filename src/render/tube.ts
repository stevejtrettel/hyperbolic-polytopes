import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';

/** A vector perpendicular to `t` (assumed unit-ish), for frame initialization. */
function arbitraryPerp(t: Vector3): Vector3 {
  const v = Math.abs(t.x) < 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
  return v.addScaledVector(t, -t.dot(v)).normalize();
}

/**
 * Build a variable-radius tube around a projected polyline. `radii[i]` is the
 * render-space radius at sample i — the caller computes it as
 * (intrinsic width) · model.scaleAt(sample), so a constant intrinsic width
 * tapers correctly in the picture. Uses parallel-transport frames so the tube
 * does not twist on near-straight geodesics. (Adapted from homogeneous-spaces.)
 */
export function buildTubeGeometry(points: Vector3[], radii: number[], radialSegments = 12): BufferGeometry {
  const n = points.length;

  const tangents: Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(n - 1, i + 1)];
    const t = b.clone().sub(a);
    if (t.lengthSq() < 1e-20) t.set(0, 0, 1);
    tangents.push(t.normalize());
  }

  const normals: Vector3[] = [];
  const binormals: Vector3[] = [];
  let normal = arbitraryPerp(tangents[0]);
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      const t0 = tangents[i - 1];
      const t1 = tangents[i];
      const axis = t0.clone().cross(t1);
      const len = axis.length();
      if (len > 1e-8) {
        axis.multiplyScalar(1 / len);
        const angle = Math.acos(Math.min(1, Math.max(-1, t0.dot(t1))));
        normal = normal.clone().applyAxisAngle(axis, angle);
      }
      normal.addScaledVector(tangents[i], -normal.dot(tangents[i])).normalize();
    }
    const binormal = tangents[i].clone().cross(normal).normalize();
    normals.push(normal.clone());
    binormals.push(binormal);
  }

  const positions: number[] = [];
  const norms: number[] = [];
  for (let i = 0; i < n; i++) {
    const N = normals[i];
    const B = binormals[i];
    const r = radii[i];
    for (let j = 0; j <= radialSegments; j++) {
      const theta = (j / radialSegments) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const nx = cos * N.x + sin * B.x;
      const ny = cos * N.y + sin * B.y;
      const nz = cos * N.z + sin * B.z;
      positions.push(points[i].x + r * nx, points[i].y + r * ny, points[i].z + r * nz);
      norms.push(nx, ny, nz);
    }
  }

  const indices: number[] = [];
  const stride = radialSegments + 1;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * stride + j;
      const b = a + stride;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new Float32BufferAttribute(norms, 3));
  geo.setIndex(indices);
  return geo;
}
