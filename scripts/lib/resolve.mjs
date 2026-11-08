/**
 * Resolve the layered data into the published records (public/data/bases.json):
 *
 *   data/bases.json            import layer (normalised source classification, raw terms)
 *   data/claims.json           curated corrections ('accepted' are applied, 'proposed' are shown)
 *   data/corrections.json      doubtful positions
 *   data/research/sources.json checked sources per record → evidence per statement group
 *   data/media.json, data/wikimedia.json   images
 *
 * Pure functions without I/O, used by scripts/build-data.mjs, the validator and the tests.
 * The model is documented in docs/TAXONOMY.md.
 */
import { verdictsOf } from '../../src/lib/verdicts.ts';

/** kind categories of visualbases.org (one per post expected) */
export const KIND_CATEGORIES = ['foreign-bases', 'shared-bases', 'national-base', 'us-global', 'civilian-location', 'extra-facility', 'meta-site'];
const AGGREGATE = new Set(['garrison', 'region-cluster']);

/**
 * claim field → statement groups whose evidence it changes; a source cited by the claim is set aside for these
 * groups only. presenceForm refines a presence without changing it, so the evidence of the presence stays as it is.
 */
export const FIELD_CLAIM_TYPE = { presences: ['nation', 'presence'], presenceForm: [], host: ['position'], region: ['position'], position: ['position'], status: ['status'], period: ['status'], siteType: ['presence'], features: ['facility'], activities: ['activity'], name: [] };
export const CLAIM_FIELDS = ['presences', 'presenceForm', 'host', 'region', 'position', 'name', 'status', 'period', 'siteType', 'features', 'activities', 'issues'];

/** precision levels that count as "approximate position" in the app (vocabulary: POSITION_PRECISIONS in src/lib/taxonomy.ts) */
const APPROXIMATE = new Set(['town', 'region']);

const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const sameItem = (a, b) => (a && typeof a === 'object' ? (a.nation ?? JSON.stringify(a)) === (b.nation ?? JSON.stringify(b)) : a === b);

/**
 * Apply one claim to a record (mutates it). Returns { from, to } or throws if the claim no longer fits
 * the data (e.g. the value to remove is gone because the source was corrected) – the validator reports that.
 */
export function applyClaim(b, c) {
  if (!CLAIM_FIELDS.includes(c.field)) throw new Error(`unknown field "${c.field}"`);
  // position: { lat, lon, precision? } – the coordinates live in two fields of the record;
  // the legacy flag `approx: true` reads as precision "town", no precision at all as "reference"
  if (c.field === 'position') {
    if (c.op !== 'set') throw new Error('position only supports "set"');
    const from = { lat: b.lat, lon: b.lon };
    if (from.lat === c.value.lat && from.lon === c.value.lon) throw new Error('value is already set (claim obsolete?)');
    b.lat = c.value.lat;
    b.lon = c.value.lon;
    b.positionPrecision = c.value.precision ?? (c.value.approx ? 'town' : 'reference');
    return { from, to: { lat: b.lat, lon: b.lon } };
  }
  // presenceForm: { nation, form } – annotates the presence of one state, the list itself is left alone
  if (c.field === 'presenceForm') {
    if (c.op !== 'set') throw new Error('presenceForm only supports "set"');
    const p = b.presences.find((x) => x.nation === c.value.nation);
    if (!p) throw new Error(`no presence of "${c.value.nation}" (claim obsolete or in the wrong order?)`);
    if (p.form === c.value.form) throw new Error('value is already set (claim obsolete?)');
    const from = { nation: p.nation, form: p.form ?? null };
    p.form = c.value.form;
    p.formVia = 'claim';
    return { from, to: { nation: p.nation, form: p.form } };
  }
  const from = clone(b[c.field]);
  if (c.op === 'set') {
    if (JSON.stringify(stripVia(from)) === JSON.stringify(stripVia(c.value))) throw new Error('value is already set (claim obsolete?)');
    b[c.field] = c.field === 'presences' ? c.value.map((p) => ({ ...p, via: 'claim' })) : clone(c.value);
  } else if (c.op === 'add') {
    const list = (b[c.field] ??= []);
    if (list.some((x) => sameItem(x, c.value))) throw new Error('value is already present (claim obsolete?)');
    list.push(c.field === 'presences' ? { ...c.value, via: 'claim' } : c.value);
  } else if (c.op === 'remove') {
    const list = b[c.field] ?? [];
    if (!list.some((x) => sameItem(x, c.value))) throw new Error('value to remove is not present (claim obsolete?)');
    b[c.field] = list.filter((x) => !sameItem(x, c.value));
  } else throw new Error(`unknown op "${c.op}"`);
  return { from, to: clone(b[c.field]) };
}
const stripVia = (v) => (Array.isArray(v) ? v.map((x) => (x && typeof x === 'object' ? { nation: x.nation, role: x.role } : x)) : v);

/**
 * The status "closed" means that the use by the states listed has ended, so a presence without a documented
 * form is historical. A form set by a claim is kept (mutates the record).
 */
export function deriveForms(b) {
  if (b.status !== 'closed') return;
  for (const p of b.presences) if (!p.form) Object.assign(p, { form: 'historical', formVia: 'status' });
}

/**
 * value of a claim field in an import record, in the form a claim's `expect` records it
 * (position as { lat, lon }, presences without derivation, a missing field as null)
 */
export function sourceValue(src, field) {
  if (field === 'position') return { lat: src.lat, lon: src.lon };
  const v = field === 'presences' ? stripVia(src.presences) : src[field];
  return v === undefined ? null : clone(v);
}

/**
 * A `set` claim may record the source value it was decided against (`expect`). If the import now carries
 * another value, visualbases.org has changed the field since – the claim still applies, but needs a look.
 */
export function upstreamChanged(src, c) {
  if (c.expect === undefined) return false;
  return JSON.stringify(sourceValue(src, c.field)) !== JSON.stringify(c.field === 'presences' ? stripVia(c.expect) : c.expect);
}

/** relation of a present state to the territory of the site */
export function relation(nation, host) {
  if (!host?.country || nation !== host.country) return 'foreign';
  return host.territory ? 'own-territory' : 'domestic';
}

export function scopeOf(presences) {
  if (presences.some((p) => p.relation === 'foreign')) return 'foreign';
  if (presences.some((p) => p.relation === 'own-territory')) return 'overseas';
  if (presences.some((p) => p.relation === 'domestic')) return 'domestic';
  return 'unknown';
}

/** review notes derived from the record itself (documented in docs/TAXONOMY.md, "Prüfhinweise") */
export function issuesOf(b) {
  const cats = b.origin?.terms?.categories ?? [];
  const kinds = cats.filter((c) => KIND_CATEGORIES.includes(c));
  const out = [];
  if (kinds.length > 1) out.push('multiple-site-types');
  if (!kinds.length && !cats.includes('unspecific') && !cats.includes('closed') && !AGGREGATE.has(b.siteType)) out.push('no-site-type');
  if (b.siteType === 'military-base') out.push('site-type-from-status');
  if (b.siteType === 'foreign-base' && b.presences.length && !b.presences.some((p) => relation(p.nation, b.host) === 'foreign')) out.push('foreign-without-foreign-presence');
  if (!AGGREGATE.has(b.siteType) && !b.presences.length) out.push('nation-missing');
  if (b.host?.country === 'US' && b.continent === 'asia') out.push('continent-check');
  if (b.origin?.review) out.push('review-on-origin');
  return out;
}

function siteTypeBasis(b) {
  const cats = b.origin?.terms?.categories ?? [];
  if (b.siteType === 'military-base' || /^overview\b/i.test(b.name)) return 'derived';
  if (b.siteType === 'unspecified' && !cats.includes('unspecific')) return 'derived';
  return 'source';
}

/** state of evidence per statement group (no scores – see EVIDENCE_STATES in src/lib/taxonomy.ts) */
export function evidenceOf(research, { corrected = [], disputed = [], cited = new Map() } = {}) {
  // cited: url → groups the citing claims changed. The source is set aside for those groups only (the correction
  // already speaks for them); for every other group it counts like any checked source.
  const setAside = (s, t) => cited.get(s.url)?.has(t);
  const out = {};
  const types = new Set([...research.flatMap((s) => Object.keys(verdictsOf(s))), ...corrected, ...disputed]);
  for (const t of types) {
    // verdicts of the hand-checked sources on this group (a source can judge groups differently, see verdicts.ts)
    const v = research.filter((s) => s.method === 'manual' && !setAside(s, t)).map((s) => verdictsOf(s)[t]).filter(Boolean);
    if (corrected.includes(t)) out[t] = 'corrected';
    else if (disputed.includes(t) || v.includes('contradicts')) out[t] = 'disputed';
    else if (v.includes('supports')) out[t] = 'confirmed';
    else if (v.includes('context')) out[t] = 'context';
  }
  return out;
}

/**
 * Evidence level of a site (SOURCE_LEVELS in src/lib/taxonomy.ts) and the checked source that carries it.
 * Presence and nation are what a site entry claims first; position, status etc. do not lift the level.
 */
export function sourceLevelOf(b) {
  const ev = b.evidence ?? {};
  const core = [ev.presence, ev.nation];
  const manual = (b.research ?? []).filter((s) => s.method === 'manual');
  const key = (verdict) => manual.find((s) => ['presence', 'nation'].some((g) => verdictsOf(s)[g] === verdict));
  let level;
  if (core.includes('disputed')) level = 'disputed';
  else if (core.includes('confirmed') || core.includes('corrected')) level = 'verified';
  else if (manual.length) level = 'context';
  else if ((b.sources ?? []).length) level = 'source-listed';
  else if (b.wikipedia && Object.keys(b.wikipedia).length) level = 'wikipedia-only';
  else level = 'none';
  // a corrected presence or nation is carried by the source of its correction
  const correcting = () => {
    const url = (b.corrections ?? []).find((c) => (FIELD_CLAIM_TYPE[c.field] ?? []).some((g) => g === 'presence' || g === 'nation'))?.sources[0];
    return url && ((b.research ?? []).find((x) => x.url === url) ?? { publisher: new URL(url).hostname, url, accessed: undefined });
  };
  const s = level === 'verified' ? key('supports') ?? correcting() : level === 'disputed' ? key('contradicts') : undefined;
  return { level, key: s ? { publisher: s.publisher, url: s.url, accessed: s.accessed, published: s.published } : undefined };
}

const IMAGE_ORDER = { photo: 0, satellite: 1, map: 2, document: 3, logo: 4 };

/**
 * @returns {{ bases: object[], problems: { rule: string, id: string, msg: string }[], notices: { rule: string, id: string, msg: string }[] }}
 * problems are errors (the data does not fit), notices are warnings (e.g. a claim whose source value has changed)
 */
export function resolveBases(input, { claims = [], research = [], corrections = {}, media = {}, wikimedia = {} } = {}) {
  const problems = [];
  const notices = [];
  const byBase = (list) => { const m = new Map(); for (const x of list) m.set(x.base, [...(m.get(x.base) ?? []), x]); return m; };
  const claimsOf = byBase(claims);
  const researchOf = byBase(research);
  const positionOf = new Map((corrections.positions ?? []).map((c) => [c.id, c]));

  const bases = input.map((src) => {
    const b = clone(src);
    b.basis = { siteType: siteTypeBasis(b), status: b.origin?.terms?.categories?.includes('closed') ? 'source' : 'implicit' };
    // imported coordinates are the reference point of the source's map link; hand-geocoded ones count as town level
    b.positionPrecision = b.approx ? 'town' : 'reference';
    const corrected = new Set();
    const disputed = new Set();
    const cited = new Map();
    const extraIssues = [];
    for (const c of claimsOf.get(b.id) ?? []) {
      if (upstreamChanged(src, c)) notices.push({ rule: 'claim-upstream-changed', id: b.id, msg: `claim "${c.id}": the source value has changed since the decision (expected ${JSON.stringify(c.expect)}, now ${JSON.stringify(sourceValue(src, c.field))})` });
      if (c.status === 'proposed') {
        (b.proposals ??= []).push({ id: c.id, field: c.field, op: c.op, value: c.value, statement: c.statement, sources: c.sources });
        for (const t of FIELD_CLAIM_TYPE[c.field] ?? []) disputed.add(t);
        continue;
      }
      if (c.status !== 'accepted') continue;
      if (c.field === 'issues') { extraIssues.push(c.value); continue; }
      try {
        const { from, to } = applyClaim(b, c);
        (b.corrections ??= []).push({ id: c.id, field: c.field, op: c.op, from, to, statement: c.statement, sources: c.sources, decided: c.decided });
        for (const t of FIELD_CLAIM_TYPE[c.field] ?? []) corrected.add(t);
        for (const s of c.sources) for (const t of FIELD_CLAIM_TYPE[c.field] ?? []) cited.set(s, new Set([...(cited.get(s) ?? []), t]));
        if (c.field === 'siteType') b.basis.siteType = 'claim';
        if (c.field === 'status') b.basis.status = 'claim';
      } catch (e) {
        problems.push({ rule: 'claim-apply', id: b.id, msg: `claim "${c.id}" cannot be applied: ${e.message}` });
      }
    }

    if (APPROXIMATE.has(b.positionPrecision)) b.approx = true; else delete b.approx;
    deriveForms(b);
    b.presences = b.presences.map((p) => ({ ...p, relation: relation(p.nation, b.host) }));
    b.scope = scopeOf(b.presences);
    const issues = [...issuesOf(b), ...extraIssues];
    const pc = positionOf.get(b.id);
    if (pc) {
      b.positionCheck = { status: pc.status, issue: pc.issue, duplicateOf: pc.duplicateOf, proposal: pc.proposal };
      // a confirmed position carries the evidence of the editorial decision
      if (pc.status === 'confirmed') Object.assign(b.positionCheck, { source: pc.source, url: pc.url, retrieved: pc.retrieved, note: pc.note });
      if (pc.status === 'proposed') issues.push('position-unverified');
    }
    if (issues.length) b.issues = [...new Set(issues)];

    const rs = researchOf.get(b.id) ?? [];
    if (rs.length) {
      b.research = rs.map(({ base, collector, httpStatus, ...s }) => s);
      const ev = evidenceOf(rs, { corrected: [...corrected], disputed: [...disputed], cited });
      if (Object.keys(ev).length) b.evidence = ev;
      const checked = rs.filter((s) => s.method === 'manual').map((s) => s.accessed).sort().at(-1);
      if (checked) b.lastChecked = checked;
    } else if (corrected.size || disputed.size) {
      b.evidence = evidenceOf([], { corrected: [...corrected], disputed: [...disputed] });
    }
    for (const c of [...(b.corrections ?? []), ...(b.proposals ?? [])]) {
      for (const url of c.sources) if (!rs.some((s) => s.url === url) && !research.some((s) => s.url === url)) problems.push({ rule: 'claim-source', id: b.id, msg: `claim "${c.id}": source not in data/research/sources.json: ${url}` });
    }

    const { level, key } = sourceLevelOf(b);
    b.sourceLevel = level;
    if (key) b.keySource = key; else delete b.keySource;

    // images: the project's own photos first, then the Wikimedia photo; satellites chronologically
    const refs = [...(b.images ?? [])];
    const w = wikimedia[b.id];
    if (w?.url) refs.push({ url: w.url, caption: w.title ?? '' });
    const imgs = refs
      .map((r) => (media[r.url] ? { ...media[r.url], caption: r.caption || undefined } : null))
      .filter(Boolean)
      .sort((x, y) => IMAGE_ORDER[x.type] - IMAGE_ORDER[y.type] || (x.year ?? 0) - (y.year ?? 0));
    if (imgs.length) b.images = imgs; else delete b.images;
    return b;
  });

  // inverse relations
  const byId = new Map(bases.map((b) => [b.id, b]));
  for (const b of bases) {
    for (const r of b.relations ?? []) {
      const t = byId.get(r.id);
      if (!t) { problems.push({ rule: 'relation', id: b.id, msg: `relation to unknown id "${r.id}"` }); continue; }
      if (r.type === 'member-of') (t.includes ??= []).push(b.id);
      if (r.type === 'part-of') (t.hasParts ??= []).push(b.id);
    }
  }
  for (const c of claims) if (!byId.has(c.base)) problems.push({ rule: 'claim-base', id: c.base, msg: `claim "${c.id}" refers to unknown base` });
  return { bases, problems, notices };
}
