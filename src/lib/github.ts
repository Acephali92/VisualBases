export const REPO_URL = 'https://github.com/Acephali92/VisualBases';

/** link to a pre-filled GitHub issue form (no backend, no tracking) */
export function issueUrl(template: 'hinweis' | 'korrektur', fields: Record<string, string> = {}): string {
  const p = new URLSearchParams({ template: `${template}.yml`, ...fields });
  return `${REPO_URL}/issues/new?${p}`;
}
