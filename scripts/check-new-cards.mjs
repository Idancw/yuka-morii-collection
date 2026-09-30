#!/usr/bin/env node
// Checks TCGdex for Yuka Morii cards that aren't in public/cards.json yet.
//
// - English: every non-TCG-Pocket card is matched against cards.json by
//   normalized dextcg set id + number (e.g. TCGdex "sv04-034" == dextcg
//   "sv4-34"), falling back to name + number. Unmatched cards are new.
// - Japanese: names/numbers don't line up with the EN-keyed DB, so we keep a
//   "seen" list of TCGdex JP ids and only report ids we haven't seen before.
// - scripts/card-watch.json holds that seen list plus an `ignore` list of EN
//   TCGdex ids you've decided not to track (add an id there to stop it
//   from being proposed again).
//
// Run: node scripts/check-new-cards.mjs [--write] [--report <file.md>]
// Without --write, only prints what's new (dry run). With --write, appends new
// EN cards to cards.json and adds new JP ids to the seen list.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CARDS_PATH = path.join(ROOT, 'public/cards.json');
const WATCH_PATH = path.join(__dirname, 'card-watch.json');

const API = 'https://api.tcgdex.net/v2';
const ILLUSTRATOR = 'Yuka Morii';

const WRITE = process.argv.includes('--write');
const reportIdx = process.argv.indexOf('--report');
const REPORT_PATH = reportIdx !== -1 ? process.argv[reportIdx + 1] : null;

// TCGdex variant flags -> cards.json variation keys.
const VARIANT_KEYS = {
  normal: 'normal',
  reverse: 'reverse_holo',
  holo: 'holo',
  firstEdition: 'first_edition',
};

// TCGdex occasionally returns an empty body, so retry a few times.
async function get(url, attempts = 4) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
      return JSON.parse(await res.text());
    } catch (err) {
      if (i >= attempts) throw err;
      await new Promise(r => setTimeout(r, 2000 * i));
    }
  }
}

// "sv04" -> "sv4", "sv10.5w" -> "sv105w", "me02" -> "me2" (dextcg style).
function normSet(s) {
  return s.toLowerCase().replace(/\./g, '').replace(/(?<![0-9])0+(?=\d)/g, '');
}

function normNum(n) {
  return String(n ?? '').toLowerCase().replace(/^0+/, '') || '0';
}

function splitId(id) {
  const i = id.lastIndexOf('-');
  return [id.slice(0, i), id.slice(i + 1)];
}

function slugify(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ── Load DB + watch state ────────────────────────────────────────────────
const cards = JSON.parse(readFileSync(CARDS_PATH, 'utf8'));
const watch = JSON.parse(readFileSync(WATCH_PATH, 'utf8'));
const ignore = new Set(watch.ignore.map(i => i.id));
const seenJa = new Set(watch.seenJa);

const knownSetNumbers = new Set();
const knownNameNumbers = new Set();
const canonicalSetName = new Map();
for (const card of cards) {
  const m = (card.url || '').match(/\/cards\/([^/?#]+)/);
  if (m) {
    const [s, n] = splitId(m[1]);
    knownSetNumbers.add(`${normSet(s)}|${normNum(n)}`);
  }
  knownNameNumbers.add(`${card.name.toLowerCase()}|${normNum(card.number)}`);
  for (const v of Object.values(card.variations)) {
    if (v.number) knownNameNumbers.add(`${card.name.toLowerCase()}|${normNum(v.number)}`);
  }
  canonicalSetName.set(slugify(card.set), card.set);
}

function isKnown({ id, localId, name }) {
  const [s, n] = splitId(id);
  return knownSetNumbers.has(`${normSet(s)}|${normNum(n)}`)
    || knownNameNumbers.has(`${name.toLowerCase()}|${normNum(localId)}`);
}

// ── Fetch from TCGdex ────────────────────────────────────────────────────
const q = `illustrator=${encodeURIComponent(ILLUSTRATOR)}`;
const [enList, jaList] = await Promise.all([
  get(`${API}/en/cards?${q}`),
  get(`${API}/ja/cards?${q}`),
]);

// TCGdex returns an empty/short list on a bad day; don't treat that as "all new".
if (enList.length < 100) throw new Error(`suspiciously few EN results (${enList.length})`);

const newEn = enList
  .filter(c => !(c.image || '').includes('/tcgp/')) // TCG Pocket (digital only)
  .filter(c => !ignore.has(c.id) && !isKnown(c));
const newJa = jaList.filter(c => !seenJa.has(c.id));

// ── Build card entries for new EN cards ──────────────────────────────────
const setCache = new Map();
async function getSet(id) {
  if (!setCache.has(id)) setCache.set(id, await get(`${API}/en/sets/${encodeURIComponent(id)}`));
  return setCache.get(id);
}

const newCards = [];
for (const { id } of newEn) {
  const d = await get(`${API}/en/cards/${encodeURIComponent(id)}`);
  const set = await getSet(d.set.id);
  const variations = {};
  for (const [flag, key] of Object.entries(VARIANT_KEYS)) {
    if (d.variants?.[flag]) {
      variations[key] = { count: 0, ordered: false, languages: [], default_language: 'EN', available_languages: ['EN'] };
    }
  }
  if (Object.keys(variations).length === 0) {
    variations.normal = { count: 0, ordered: false, languages: [], default_language: 'EN', available_languages: ['EN'] };
  }
  const card = {
    id: slugify(id),
    name: d.name,
    set: canonicalSetName.get(slugify(d.set.name)) || d.set.name,
    era: set.serie?.name || '',
    number: d.localId,
    sheet_no: '0',
    owned: 'no',
    imageUrl: d.image ? `${d.image}/high.webp` : '',
    url: '',
    variations,
    enriched: false,
    enriched_method: 'tcgdex_monthly_check',
    releaseDate: set.releaseDate,
    illustrator: ILLUSTRATOR,
    rarity: d.rarity,
  };
  if (d.dexId?.[0]) card.nationalNumber = d.dexId[0];
  if (d.types?.[0]) card.energyType = d.types[0];
  if (d.regulationMark) card.regulationMark = d.regulationMark;
  if (cards.some(c => c.id === card.id)) throw new Error(`id collision: ${card.id}`);
  newCards.push(card);
}

// ── Report ───────────────────────────────────────────────────────────────
const lines = [];
lines.push(`## New Yuka Morii cards (${newCards.length} EN, ${newJa.length} JP)`, '');
if (newCards.length) {
  lines.push('### English — added to `public/cards.json`', '');
  lines.push('| Card | Set | # | Variants | Image |', '|---|---|---|---|---|');
  for (const c of newCards) {
    const img = c.imageUrl ? `[view](${c.imageUrl.replace('/high.webp', '/low.webp')})` : '—';
    lines.push(`| ${c.name} | ${c.set} | ${c.number} | ${Object.keys(c.variations).join(', ')} | ${img} |`);
  }
  lines.push('', 'Don\'t want one? Delete it from `cards.json` in this PR and add its TCGdex id to `ignore` in `scripts/card-watch.json`.', '');
}
if (newJa.length) {
  lines.push('### Japanese — not added automatically (check if they\'re JP-exclusive)', '');
  for (const c of newJa) {
    lines.push(`- ${c.name} — \`${c.id}\`${c.image ? ` ([view](${c.image}/low.webp))` : ''}`);
  }
  lines.push('');
}
const report = lines.join('\n');
console.log(report);
if (REPORT_PATH) writeFileSync(REPORT_PATH, report + '\n');

if (WRITE) {
  if (newCards.length) writeFileSync(CARDS_PATH, JSON.stringify([...cards, ...newCards], null, 2) + '\n');
  if (newJa.length) {
    watch.seenJa = [...seenJa, ...newJa.map(c => c.id)].sort();
    writeFileSync(WATCH_PATH, JSON.stringify(watch, null, 2) + '\n');
  }
} else {
  console.log('(dry run — pass --write to save)');
}
