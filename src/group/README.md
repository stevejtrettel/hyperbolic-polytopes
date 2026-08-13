# src/group

Generic **orbit enumeration**: breadth-first search over words in a set of
generators, with geometric deduplication. Group-agnostic — it knows nothing about
hyperbolic geometry, only how to compose elements and key them — so the same code
drives chamber tilings, Cayley graphs, and any other orbit. No dependencies
beyond the small ops interface passed in.

## The mathematics

Given generators `g_0, …, g_{r-1}` and a way to compose and identify elements,
`orbit` enumerates the group elements reachable by words up to a length bound,
in **BFS order** (so the first time an element appears, its recorded word length
is minimal — the word metric). The caller supplies `GroupOps<I>`:
`identity()`, `compose(a,b)`, and `key(g)` — a string fingerprint for dedup.

Because two distinct *words* can be the *same* group element, dedup is by `key`,
not by word. For a matrix representation that key is `matrixKey`: the entries
quantized to a tolerance, so numerically-equal isometries collapse to one node.
This is a **geometric** equality test (matrices agree), not a Coxeter
word-automaton — simple and exact for the compact groups we draw, at the cost of
holding the seen-set in memory (hence the `maxCount` cap).

## Contents

| file | contents |
|---|---|
| `orbit.ts` | `orbit(ops, generators, maxWord, maxCount)` → `OrbitElement<I>[]` (`{ element, word, depth }`); the `GroupOps<I>` interface; `matrixKey` (quantized-entries fingerprint) |

## Used by

`coxeter/CoxeterGroup`: `orbit` / `tessellate` (orbit of the chamber),
`cayleyGraph` (orbit of group elements), `subgroup`, and — indirectly, via the
group's orbit — the Wythoff cell tessellation.
