import * as THREE from 'three';
import type { Geometry } from '../geometry/types';
import type { Model } from '../models/types';
import type { Vec } from '../math/hyperboloid';
import { vertexMesh, edgeMesh, faceMesh } from '../render/meshes';
import type { Polytope } from './Polytope';

export interface PolytopeStyle {
  showVertices?: boolean;
  showEdges?: boolean;
  showFaces?: boolean;
  vertexRadius?: number;
  edgeWidth?: number;
  vertexColor?: THREE.ColorRepresentation;
  edgeColor?: THREE.ColorRepresentation;
  faceColor?: THREE.ColorRepresentation;
  faceOpacity?: number;
  /** Tessellation detail — lower these for many small tiles (e.g. deep tilings). */
  faceResolution?: number; // barycentric subdivisions per face triangle
  edgeSegments?: number; // samples along each geodesic edge
  edgeRadialSegments?: number; // sides of each edge tube
  /** false → faces don't write depth: a see-through shell that shows what's inside (e.g. a hull). */
  faceDepthWrite?: boolean;
}

const DEFAULTS: Required<PolytopeStyle> = {
  showVertices: true,
  showEdges: true,
  showFaces: true,
  vertexRadius: 0.045,
  edgeWidth: 0.02,
  vertexColor: 0xff5a3c,
  edgeColor: 0x1b2233,
  faceColor: 0x4488ff,
  faceOpacity: 0.55,
  faceResolution: 6,
  edgeSegments: 48,
  edgeRadialSegments: 12,
  faceDepthWrite: true,
};

/**
 * Draws a Polytope through a chosen Model: vertex balls, geodesic-tube edges,
 * and (in 3D) tessellated geodesic faces, assembled into one THREE.Group. The
 * combinatorics is model-free; only this view layer touches a model, so the same
 * polytope can be drawn in the Klein, Poincaré, or upper-half charts unchanged.
 */
export class PolytopeView<P extends Vec<P>> extends THREE.Group {
  private readonly polytope: Polytope<P>;
  private readonly geom: Geometry<P>;
  private readonly model: Model<P>;

  constructor(polytope: Polytope<P>, geom: Geometry<P>, model: Model<P>, style: PolytopeStyle = {}) {
    super();
    this.polytope = polytope;
    this.geom = geom;
    this.model = model;
    const s = { ...DEFAULTS, ...style };

    if (s.showFaces) {
      const faceOpts = { color: s.faceColor, opacity: s.faceOpacity, resolution: s.faceResolution, depthWrite: s.faceDepthWrite };
      if (this.polytope.dim === 3) {
        for (const face of this.polytope.faces) {
          const loop = face.loop.map((i) => this.polytope.vertices[i]);
          this.add(faceMesh(this.geom, this.model, loop, faceOpts));
        }
      } else {
        // In 2D the polytope itself is the polygon: fill it as one face (its
        // vertices are already in cyclic order). Nudge it behind the z = 0 edges
        // and vertices to avoid z-fighting in the flat chart.
        const fill = faceMesh(this.geom, this.model, this.polytope.vertices, faceOpts);
        fill.position.z = -0.002;
        this.add(fill);
      }
    }

    if (s.showEdges) {
      for (const [i, j] of this.polytope.edges) {
        this.add(
          edgeMesh(this.geom, this.model, this.polytope.vertices[i], this.polytope.vertices[j], {
            width: s.edgeWidth,
            color: s.edgeColor,
            segments: s.edgeSegments,
            radialSegments: s.edgeRadialSegments,
          }),
        );
      }
    }

    if (s.showVertices) {
      for (const v of this.polytope.vertices) {
        this.add(vertexMesh(this.geom, this.model, v, { radius: s.vertexRadius, color: s.vertexColor }));
      }
    }
  }

  /** Free every child mesh's geometry + material. Call before discarding the view. */
  dispose(): void {
    this.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else if (mat) (mat as THREE.Material).dispose();
    });
    this.clear();
  }
}
