import * as THREE from 'three';
import type { Model } from '../models/types';
import { edgeMesh, vertexMesh } from '../render/meshes';
import type { GroupGeometry } from './CoxeterGroup';
import type { CayleyGraph } from './CayleyGraph';

/** Distinct colours per generator — the colouring is what makes the structure legible. */
export const GENERATOR_PALETTE = [
  0xcb4f4a, 0x4c72b0, 0x5aa469, 0xe08a4b, 0x8166ae,
  0x3e938f, 0xd9a93e, 0xc14b8a, 0x6b8e23, 0x4a4a4a,
];

export interface CayleyStyle {
  nodeRadius?: number;
  nodeColor?: THREE.ColorRepresentation;
  edgeWidth?: number;
  showNodes?: boolean;
  palette?: number[];
  edgeSegments?: number;
  edgeRadialSegments?: number;
  nodeDetail?: number;
  /**
   * Element keys to highlight (node.key, i.e. matrixKey of the element). When set,
   * matching nodes — and edges between two matching nodes — are drawn bold and in
   * colour; everything else fades to gray. Omit to draw the whole graph normally.
   */
  highlight?: Set<string>;
  highlightScale?: number; // size multiplier for highlighted nodes/edges
  fadedScale?: number; // size multiplier for the faded rest
  fadedColor?: THREE.ColorRepresentation;
}

const DEFAULTS: Required<CayleyStyle> = {
  nodeRadius: 0.018,
  nodeColor: 0x2c2c2c,
  edgeWidth: 0.01,
  showNodes: true,
  palette: GENERATOR_PALETTE,
  edgeSegments: 16,
  edgeRadialSegments: 5,
  nodeDetail: 12,
  highlight: new Set<string>(),
  highlightScale: 1.7,
  fadedScale: 0.5,
  fadedColor: 0xcfcfcf,
};

/**
 * The geometric realization of a Cayley graph, charted through a Model: node g
 * sits at g·basePoint (the orbit of the base point), drawn as a small ball; each
 * edge {g, gR_i} is the geodesic between the two node points, coloured by the
 * generator i. With `highlight` set, a subset (an element list, or a generated
 * subgroup) is drawn bold and coloured while the rest fades to gray.
 */
export class CayleyGraphView<P, I> extends THREE.Group {
  constructor(
    graph: CayleyGraph<I>,
    geom: GroupGeometry<P, I>,
    model: Model<P>,
    basePoint: P,
    style: CayleyStyle = {},
  ) {
    super();
    const s = { ...DEFAULTS, ...style };
    const hl = style.highlight; // undefined ⇒ no highlighting (draw everything normally)
    const scale = (on: boolean): number => (hl ? (on ? s.highlightScale : s.fadedScale) : 1);

    const points = graph.nodes.map((n) => geom.apply(n.element, basePoint));

    for (const e of graph.edges) {
      const on = !hl || (hl.has(graph.nodes[e.a].key) && hl.has(graph.nodes[e.b].key));
      this.add(
        edgeMesh(geom, model, points[e.a], points[e.b], {
          width: s.edgeWidth * scale(on),
          color: on ? s.palette[e.generator % s.palette.length] : s.fadedColor,
          segments: s.edgeSegments,
          radialSegments: s.edgeRadialSegments,
        }),
      );
    }

    if (s.showNodes) {
      graph.nodes.forEach((n, i) => {
        const on = !hl || hl.has(n.key);
        this.add(
          vertexMesh(geom, model, points[i], {
            radius: s.nodeRadius * scale(on),
            color: on ? s.nodeColor : s.fadedColor,
            detail: s.nodeDetail,
          }),
        );
      });
    }
  }
}
