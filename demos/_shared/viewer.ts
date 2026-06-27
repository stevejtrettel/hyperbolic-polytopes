import * as THREE from 'three';
import { App } from '../../src/render/App';
import { glassSphere, groundPlane, boundaryCircle, boundaryLine } from '../../src/render/boundary';
import { PolytopeView, type PolytopeStyle } from '../../src/polytope/PolytopeView';
import type { Model, Domain } from '../../src/models/types';
import type { Geometry } from '../../src/geometry/types';
import type { Polytope } from '../../src/polytope/Polytope';
import type { Vec } from '../../src/math/hyperboloid';

/** One polytope to draw, with an optional per-polytope style. */
export interface ViewItem<P extends Vec<P>> {
  poly: Polytope<P>;
  style?: PolytopeStyle;
}

/** The only parts of a Model the viewer needs for framing/boundary (P-independent). */
type ViewModel = { renderDim: 2 | 3; domain: Domain };

/**
 * The shared demo scaffold: owns the App and render loop, and draws a set of
 * polytopes through a chosen Model — picking the camera framing (face-on for a
 * flat chart, orbit for a 3D model) and the ideal boundary (circle / glass
 * sphere / ground plane / real axis) from the model's renderDim and domain. A
 * demo just builds its shapes and models and calls `show` on every UI change.
 */
export class Viewer {
  readonly app: App;
  private content: THREE.Object3D | null = null;
  private boundary: THREE.Object3D | null = null;
  private framedModel: ViewModel | null = null;

  constructor() {
    this.app = new App({ cameraDistance: 3 });
    this.app.start();
  }

  /** Replace what's drawn with the polytopes, charted through `model`. */
  show<P extends Vec<P>>(geom: Geometry<P>, model: Model<P>, items: ViewItem<P>[]): void {
    const group = new THREE.Group();
    for (const it of items) group.add(new PolytopeView(it.poly, geom, model, it.style));
    this.display(group, model);
  }

  /**
   * Replace what's drawn with any object (e.g. a Cayley-graph group), set the
   * boundary for `model`, and frame the camera. Re-frames only when the model
   * itself changes, so depth/shape edits keep the camera where the user left it.
   */
  display(content: THREE.Object3D, model: ViewModel): void {
    if (this.content) { this.app.scene.remove(this.content); dispose(this.content); }
    this.content = this.app.add(content);

    if (this.boundary) { this.app.scene.remove(this.boundary); dispose(this.boundary); }
    this.boundary = this.app.add(boundaryFor(model));

    if (model !== this.framedModel) {
      this.frame(model);
      this.framedModel = model;
    }
  }

  private frame(model: ViewModel): void {
    const { camera, controls } = this.app;
    const halfFov = ((camera.fov * Math.PI) / 180) / 2;
    const place = (center: THREE.Vector3, halfExtent: number, orbit: boolean): void => {
      const d = (halfExtent / Math.tan(halfFov)) * 1.1;
      controls.target.copy(center);
      controls.enableRotate = orbit;
      if (orbit) camera.position.copy(center).addScaledVector(new THREE.Vector3(0.3, 0.4, 1).normalize(), d);
      else camera.position.set(center.x, center.y, d);
      controls.update();
    };
    switch (model.domain.kind) {
      case 'disk': place(new THREE.Vector3(0, 0, 0), 1.05, false); break;
      case 'sphere': place(new THREE.Vector3(0, 0, 0), 1.1, true); break;
      case 'halfplane': place(new THREE.Vector3(0, 1.2, 0), 2.2, false); break;
      case 'plane': place(new THREE.Vector3(0, 0, 1), 2.2, true); break;
    }
  }
}

const WARM = new THREE.Color(0xe08a4b);
const COOL = new THREE.Color(0x4c72b0);
/** A warm→cool tint by orbit depth, for colouring tessellation shells. */
export function depthColor(depth: number, maxDepth: number): number {
  return WARM.clone().lerp(COOL, maxDepth > 0 ? Math.min(1, depth / maxDepth) : 0).getHex();
}

function boundaryFor(model: ViewModel): THREE.Object3D {
  switch (model.domain.kind) {
    case 'sphere': return glassSphere();
    case 'plane': return groundPlane();
    case 'halfplane': return boundaryLine();
    default: return boundaryCircle();
  }
}

function dispose(o: THREE.Object3D): void {
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else if (mat) (mat as THREE.Material).dispose();
  });
}
