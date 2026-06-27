/**
 * Parsing a list of Coxeter words from text (an inline string or an imported
 * file). Each non-blank, non-comment line is one word: a list of generator
 * indices to apply LEFT TO RIGHT (see CoxeterGroup.word). Feed the result to
 * `group.images(words)` to draw the corresponding images of the fundamental
 * domain.
 *
 * Line format:
 *   - integers separated by spaces or commas, e.g.  0 3 5 1 3   or   0,3,5,1,3
 *   - `#` starts a comment (rest of line ignored); blank lines are skipped
 *   - `e`, `1`, or `id` (any case) denote the identity — the word [] (the
 *     fundamental domain itself)
 *
 * A line with a non-integer token throws (with its line number). A word that
 * references a generator index ≥ `rank` is skipped with a warning, so one word
 * file can be shared across groups of different rank.
 */
export function parseWords(text: string, rank: number): number[][] {
  const words: number[][] = [];
  let skipped = 0;

  text.split('\n').forEach((rawLine, lineIndex) => {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (line === '') return;
    if (/^(e|1|id)$/i.test(line)) { words.push([]); return; }

    const tokens = line.split(/[\s,]+/).filter((t) => t.length > 0);
    const word = tokens.map((t) => Number(t));
    if (word.some((n) => !Number.isInteger(n) || n < 0)) {
      throw new Error(`parseWords: line ${lineIndex + 1} ("${line}") is not a list of generator indices.`);
    }
    if (word.some((n) => n >= rank)) { skipped++; return; }
    words.push(word);
  });

  if (skipped > 0) {
    console.warn(`parseWords: skipped ${skipped} word(s) referencing generators outside this rank-${rank} group.`);
  }
  return words;
}
