import type { Polytope } from '../polytope/Polytope';
import type { Vec } from '../math/hyperboloid';

/**
 * A polytope produced by a CoxeterGroup as the image of the fundamental domain
 * under a word — by COMPOSITION, so the underlying `Polytope` stays completely
 * group-agnostic. The group is the only thing that mints these (only it knows
 * words), via image / images / tessellate; navigation lives on the group too
 * (`group.neighbor`).
 *
 * Carries:
 *  - `polytope` — the pure geometry (vertices / edges / faces),
 *  - `word`     — the generator indices from the fundamental domain (left to right),
 *  - `element`  — the cached O(n,1) matrix g with this = g·(fundamental domain).
 */
export class CoxeterPolytope<P extends Vec<P>, I> {
  readonly polytope: Polytope<P>;
  readonly word: number[];
  readonly element: I;

  constructor(polytope: Polytope<P>, word: number[], element: I) {
    this.polytope = polytope;
    this.word = word;
    this.element = element;
  }

  /** Word length: the number of reflections from the fundamental domain to here. */
  get depth(): number {
    return this.word.length;
  }
}
