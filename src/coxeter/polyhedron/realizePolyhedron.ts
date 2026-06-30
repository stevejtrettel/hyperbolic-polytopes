import { Hyperbolic3 } from '../../geometry/Hyperbolic3';
import { interiorPoint, type Realization } from '../realize';
import { type SeedSolid, SEEDS, seedLorentzNormals } from './seeds';
import { analyzeCombinatorics, type PolyhedronCombinatorics } from './combinatorics';
import { validateAndreev, type AndreevResult } from './andreev';
import { solveFaceNormals, type SolveResult } from './solve';

/**
 * The 3D Route-B pipeline: a geometric seed + a dihedral-angle assignment →
 * a verified compact hyperbolic Coxeter polyhedron, as a `Realization` ready for
 * `realization3ToGroup`.
 *
 *   seed solid → combinatorics (existing hull) → Andreev gate → face-normal solve
 *   → verify the solved normals realize the SAME combinatorics → Realization.
 *
 * The order of two adjacent facets is given by `order(i,j)`; for a symmetric
 * assignment pass a constant (e.g. `() => 2` for the right-angled dodecahedron).
 */

export interface PolyhedronRealizationOptions {
  readonly seedInradius?: number;
  readonly maxIterations?: number;
  readonly tolerance?: number;
  /** Skip the Andreev existence gate (for experimentation); default false. */
  readonly skipAndreev?: boolean;
  /**
   * Accept the solve once the residual is below this. Default 1e-8
   * (reflection-group grade — the shipped seeds reach far below it). Loosen (e.g.
   * 1e-4) only to VISUALIZE a target the solver gets close to but can't take to
   * machine precision: correct to a few decimals, fine to look at, not for deep
   * tilings (errors compound over long reflection words).
   */
  readonly maxResidual?: number;
}

export interface PolyhedronRealization {
  readonly realization: Realization;
  /** Combinatorics of the SOLVED polyhedron (verified to match the seed). */
  readonly combinatorics: PolyhedronCombinatorics;
  readonly andreev: AndreevResult;
  readonly solve: SolveResult;
}

export function realizeCoxeterPolyhedron(
  seed: SeedSolid | string,
  order: (i: number, j: number) => number,
  opts: PolyhedronRealizationOptions = {},
): PolyhedronRealization {
  const solid = typeof seed === 'string' ? resolveSeed(seed) : seed;
  const geom = new Hyperbolic3(-1);

  const seedNormals = seedLorentzNormals(solid, opts.seedInradius ?? 0.5);
  const seedCombinatorics = analyzeCombinatorics(geom, seedNormals);

  const andreev = validateAndreev(seedCombinatorics, order);
  if (!opts.skipAndreev && !andreev.ok) {
    throw new Error(
      `Andreev validation failed: ${andreev.violations.map((v) => `${v.kind} {${v.facets.join(',')}} — ${v.detail}`).join('; ')}`,
    );
  }

  const solve = solveFaceNormals(seedNormals, seedCombinatorics.facetPairs, order, {
    maxIterations: opts.maxIterations ?? 1000,
    tolerance: opts.tolerance,
  });
  const accept = opts.maxResidual ?? 1e-8;
  if (solve.residualNorm > accept) {
    throw new Error(`face-normal solve did not reach residual ${accept.toExponential(0)} (got ${solve.residualNorm.toExponential(2)}).`);
  }

  // Verify the solved normals realize the SAME combinatorics as the seed.
  const solvedCombinatorics = analyzeCombinatorics(geom, solve.normals);
  verifyCombinatoricsMatch(seedCombinatorics, solvedCombinatorics);

  const N = solve.normals.length;
  const interior = interiorPoint(solve.normals, 4);
  if (interior[0] < 0) for (let a = 0; a < interior.length; a++) interior[a] = -interior[a]; // future-pointing
  const realization: Realization = {
    dim: 3,
    signature: { pos: 3, neg: 1, zero: N - 4 },
    normals: solve.normals,
    interior,
  };

  return { realization, combinatorics: solvedCombinatorics, andreev, solve };
}

function resolveSeed(name: string): SeedSolid {
  const make = SEEDS[name];
  if (!make) throw new Error(`unknown seed solid "${name}"; available: ${Object.keys(SEEDS).join(', ')}.`);
  return make();
}

/** The solved polyhedron must have the seed's facet count, vertex count, and adjacency. */
function verifyCombinatoricsMatch(seed: PolyhedronCombinatorics, solved: PolyhedronCombinatorics): void {
  const sp = solved.polytope;
  const ep = seed.polytope;
  if (sp.facets.length !== ep.facets.length || sp.vertices.length !== ep.vertices.length || sp.edges.length !== ep.edges.length) {
    throw new Error(
      `solved combinatorics differ from the seed: ` +
        `facets ${sp.facets.length}/${ep.facets.length}, vertices ${sp.vertices.length}/${ep.vertices.length}, edges ${sp.edges.length}/${ep.edges.length}.`,
    );
  }
  const key = (pairs: [number, number][]) => pairs.map((p) => p.join(',')).sort().join(';');
  if (key(seed.facetPairs) !== key(solved.facetPairs)) {
    throw new Error('solved facet adjacency differs from the seed (a facet became redundant or a new incidence appeared).');
  }
}
