import * as THREE from 'three';

/**
 * The ideal boundary of H³ as a glass shell: the unit sphere ∂(Poincaré/Klein
 * ball). Low opacity + smooth clearcoat + the App's room-environment reflections
 * read as glass while leaving the polytope inside crisp; `depthWrite: false` so
 * the interior shows through. (Style borrowed from homogeneous-spaces' talk.)
 */
export function glassSphere(opts: { color?: THREE.ColorRepresentation; opacity?: number } = {}): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 96, 64),
    new THREE.MeshPhysicalMaterial({
      color: opts.color ?? 0xeaf1fb,
      roughness: 0.05,
      metalness: 0,
      transparent: true,
      opacity: opts.opacity ?? 0.16,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      ior: 1.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  mesh.renderOrder = 10; // drawn last, after the opaque interior
  return mesh;
}

/**
 * The ideal boundary of H³ in the upper-half-space model: the plane Z = 0, as a
 * faint frosted sheet. Drawn with `depthWrite: false` so the polytope above it
 * stays crisp.
 */
export function groundPlane(opts: { color?: THREE.ColorRepresentation; opacity?: number; size?: number } = {}): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(opts.size ?? 40, opts.size ?? 40),
    new THREE.MeshPhysicalMaterial({
      color: opts.color ?? 0xeaf1fb,
      roughness: 0.1,
      metalness: 0,
      transparent: true,
      opacity: opts.opacity ?? 0.18,
      clearcoat: 1,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  mesh.renderOrder = 10;
  return mesh; // PlaneGeometry already lies in the z = 0 plane (normal +Z)
}

/** The ideal boundary of H² as a crisp circle: ∂(Poincaré/Klein disk), unit radius. */
export function boundaryCircle(opts: { color?: THREE.ColorRepresentation; segments?: number } = {}): THREE.LineLoop {
  const n = opts.segments ?? 160;
  const pts = Array.from({ length: n }, (_, i) => {
    const t = (2 * Math.PI * i) / n;
    return new THREE.Vector3(Math.cos(t), Math.sin(t), 0);
  });
  return new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: opts.color ?? 0x9a9894 }),
  );
}

/** The ideal boundary of H² in the upper-half-plane model: the real axis Y = 0. */
export function boundaryLine(opts: { color?: THREE.ColorRepresentation; half?: number } = {}): THREE.Line {
  const half = opts.half ?? 40;
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-half, 0, 0), new THREE.Vector3(half, 0, 0)]),
    new THREE.LineBasicMaterial({ color: opts.color ?? 0x9a9894 }),
  );
}
