/**
 * Verdict of a research source per statement group (docs/TAXONOMY.md, "Quellen- und Belegmodell").
 *
 * A source in data/research/sources.json has one `verdict` for all groups it names in `supports`. Where the
 * verdict differs between groups – e.g. "contradicts the status, confirms the former presence" – the source
 * carries `verdicts` per group, which take precedence (and may name further groups). Every reader of a
 * source's verdict goes through this function: resolver, research summary, validator and profile.
 * Shared by the app and the Node scripts, so it is plain TypeScript without imports.
 */
export type Verdict = 'supports' | 'contradicts' | 'context' | 'unreviewed';

export interface VerdictSource {
  supports?: string[];
  verdict: Verdict;
  verdicts?: Record<string, Verdict>;
}

/** group → verdict, in the order of `supports`, then further groups of `verdicts` */
export function verdictsOf(s: VerdictSource): Record<string, Verdict> {
  return { ...Object.fromEntries((s.supports ?? []).map((g) => [g, s.verdict])), ...(s.verdicts ?? {}) };
}

/** groups of a source with the given verdict */
export function groupsWith(s: VerdictSource, verdict: Verdict): string[] {
  return Object.entries(verdictsOf(s)).filter(([, v]) => v === verdict).map(([g]) => g);
}

/** true if the verdict is the same for all groups (no `verdicts`, or `verdicts` repeating `verdict`) */
export const uniformVerdict = (s: VerdictSource) => Object.values(verdictsOf(s)).every((v) => v === s.verdict);
