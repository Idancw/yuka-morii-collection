#!/usr/bin/env node
// Rebuilds public/cards.json from the existing DB + public/yakumariiwishlist.csv.
//
// - Keeps every existing card id and variation key untouched (so Firestore
//   user data, keyed by [cardId][variationKey], keeps working with zero migration).
// - Merges 5 known "same physical card, split across two print numbers"
//   duplicate pairs (e.g. Lanturn #021 normal + Lanturn H15 holo) into one
//   card entry, tagging the alternate print's variations with their real number.
// - Adds any variant type present in the CSV but missing from a matched card.
// - Adds brand-new card entries for CSV cards with no match in the old DB.
//
// Run: node scripts/build-cards.mjs [--write]
// Without --write, only prints a summary (dry run).

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CARDS_PATH = path.join(ROOT, 'public/cards.json');
const CSV_PATH = path.join(ROOT, 'public/yakumariiwishlist.csv');

const WRITE = process.argv.includes('--write');

// ── Known holo/normal duplicate pairs to merge ──────────────────────────────
// primary = the id we keep (the "normal" numbered print, already in cards.json)
// secondary = the id we fold in and drop (the alt-numbered holo print)
// secondaryNumber = the real printed number/code of the secondary print
// (verified against Bulbapedia's Aquapolis/Skyridge Holo Rare "H" listings
// and the Expedition Base Set checklist).
const MERGE_PAIRS = [
  { primary: 'expedition-060', secondary: 'expedition-024', secondaryNumber: '024' },
  { primary: 'aquapolis-021', secondary: 'ecard2-lanturn-holo', secondaryNumber: 'H15' },
  { primary: 'aquapolis-017', secondary: 'aquapolis-jumpluff-holo', secondaryNumber: 'H13' },
  { primary: 'skyridge-024', secondary: 'ecard3-piloswine-holo', secondaryNumber: 'H22' },
  { primary: 'skyridge-027', secondary: 'ecard3-raichu-holo', secondaryNumber: 'H25' },
];

// CSV "Set" -> cards.json "set" aliasing (spelling/naming differences).
const SET_ALIASES = {
  'expeditionbaseset': 'expedition',
  'exdragon': 'dragon',
  'exhiddenlegends': 'hiddenlegends',
  'exfireredleafgreen': 'fireredleafgreen',
  'exteamrocketreturns': 'rocketgangstrikesback',
  'exdeoxys': 'deoxys',
  'exemerald': 'emerald',
  'exunseenforces': 'unseenforces',
  'exdeltaspecies': 'deltaspecies',
  'exlegendmaker': 'legendmaker',
  'exdragonfrontiers': 'dragonfrontiers',
  'pokmonvs': 'vs',
  'pokmongo': 'pokemongo',
  'teamrocketreturns': 'rocketgangstrikesback',
  'diamondpearlpromos': 'dptp',
  'dptppromos': 'dptp',
  'pcgppromos': 'dptp',
  'supremevictors': 'platinum',
  'sunmoonpromos': 'promo',
  'crownzenithgalariangallery': 'crownzenith',
};

function normSet(s) {
  const n = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return SET_ALIASES[n] || n;
}

const DIACRITICS = /[\u0300-\u036f]/g;

function normKey(s) {
  return s
    .toLowerCase()
    .replace(/\b1st\b/g, 'first')
    .normalize('NFD').replace(DIACRITICS, '') // strip diacritics
    .replace(/[^a-z0-9]/g, '');
}

function slugifyVariant(variant) {
  return variant
    .replace(/\b1st\b/g, 'First')
    .normalize('NFD').replace(DIACRITICS, '')
    .trim()
    .replace(/['']/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_():!-]/g, '')
    .toLowerCase();
}

function slugifyId(csvId) {
  return csvId.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}

// ── Load old DB ──────────────────────────────────────────────────────────
const oldCards = JSON.parse(readFileSync(CARDS_PATH, 'utf8'));
const byId = new Map(oldCards.map(c => [c.id, structuredClone(c)]));

// ── Apply the 5 merges ──────────────────────────────────────────────────
const droppedSecondaryIds = [];
for (const { primary, secondary, secondaryNumber } of MERGE_PAIRS) {
  const primaryCard = byId.get(primary);
  const secondaryCard = byId.get(secondary);
  if (!primaryCard || !secondaryCard) {
    throw new Error(`merge pair missing: ${primary} / ${secondary}`);
  }
  const merged = { ...primaryCard.variations };
  for (const [key, val] of Object.entries(secondaryCard.variations)) {
    const finalKey = merged[key] ? `${key}_${secondaryNumber.toLowerCase()}` : key;
    merged[finalKey] = { ...val, number: secondaryNumber };
  }
  primaryCard.variations = merged;
  byId.set(primary, primaryCard);
  byId.delete(secondary);
  droppedSecondaryIds.push(secondary);
}

// ── Parse CSV (UTF-16LE, ';'-delimited) ──────────────────────────────────
const raw = readFileSync(CSV_PATH);
const text = raw.toString('utf16le').replace(/^﻿/, '');
const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
const header = lines[0].split(';').map(h => h.trim());
const rows = lines.slice(1).map(line => {
  const cells = line.split(';');
  const row = {};
  header.forEach((h, i) => { row[h] = (cells[i] ?? '').trim(); });
  return row;
});

const families = new Map(); // csvId -> { set, name, locale, series, rows: [] }
for (const r of rows) {
  if (!families.has(r.Id)) {
    families.set(r.Id, { set: r.Set, name: r.Name, locale: r.Locale, series: r.Series, rows: [] });
  }
  families.get(r.Id).rows.push(r);
}

// ── Index old (post-merge) cards by set+number, including alt print numbers ──
const bySetNumber = new Map(); // "normSet|number" -> card id
for (const card of byId.values()) {
  if (card.number) {
    bySetNumber.set(`${normSet(card.set)}|${card.number.toLowerCase().replace(/^0+/, '') || '0'}`, card.id);
  }
}
// also index the merged-away secondary numbers/codes so their CSV rows re-attach to the primary
for (const { primary, secondaryNumber } of MERGE_PAIRS) {
  const primaryCard = byId.get(primary);
  bySetNumber.set(`${normSet(primaryCard.set)}|${secondaryNumber.replace(/^0+/, '').toLowerCase() || '0'}`, primary);
}

const matchedCount = { matched: 0, newCards: 0 };
const newVariantsAdded = [];
const newCardsAdded = [];
const unmatchedFamilies = [];

for (const [csvId, fam] of families.entries()) {
  const suffix = csvId.split('-').pop();
  const numeric = (suffix.match(/\d+/) || [''])[0];
  const code = suffix.toLowerCase();
  const key1 = `${normSet(fam.set)}|${code.replace(/^0+/, '') || '0'}`;
  const key2 = numeric ? `${normSet(fam.set)}|${numeric.replace(/^0+/, '') || '0'}` : null;
  const matchedId = bySetNumber.get(key1) || (key2 && bySetNumber.get(key2));

  if (matchedId) {
    matchedCount.matched++;
    const card = byId.get(matchedId);
    const existingNormKeys = Object.keys(card.variations).map(k => ({ orig: k, norm: normKey(k) }));
    for (const r of fam.rows) {
      const csvNorm = normKey(r.Variant);
      const already = existingNormKeys.some(({ norm }) =>
        norm === csvNorm || norm.startsWith(csvNorm) || csvNorm.startsWith(norm));
      if (!already) {
        const newKey = slugifyVariant(r.Variant);
        if (!card.variations[newKey]) {
          const sibling = Object.values(card.variations)[0] || {};
          card.variations[newKey] = {
            count: 0,
            ordered: false,
            languages: [],
            default_language: fam.locale === 'Japanese' ? 'JP' : (sibling.default_language || 'EN'),
            available_languages: fam.locale === 'Japanese' ? ['JP'] : (sibling.available_languages || ['EN']),
          };
          newVariantsAdded.push({ cardId: matchedId, key: newKey, from: csvId, variant: r.Variant });
          existingNormKeys.push({ orig: newKey, norm: normKey(newKey) });
        }
      }
    }
  } else {
    unmatchedFamilies.push([csvId, fam]);
  }
}

// ── Create brand-new cards for genuinely unmatched CSV families ────────────
// Reuse an existing old-DB set name spelling when the aliased-normalized set
// matches one already in the DB (keeps era/set filters consistent).
const canonicalSetNameByNorm = new Map();
for (const card of byId.values()) {
  canonicalSetNameByNorm.set(normSet(card.set), card.set);
}
const eraBySetNorm = new Map();
for (const card of byId.values()) {
  if (!eraBySetNorm.has(normSet(card.set))) eraBySetNorm.set(normSet(card.set), card.era);
}

for (const [csvId, fam] of unmatchedFamilies) {
  const id = slugifyId(csvId);
  if (byId.has(id)) {
    throw new Error(`id collision building new card: ${id}`);
  }
  const setNorm = normSet(fam.set);
  const set = canonicalSetNameByNorm.get(setNorm) || fam.set;
  const era = eraBySetNorm.get(setNorm) || fam.series;
  const numberGuess = (csvId.split('-').pop() || '').toUpperCase();

  const variations = {};
  for (const r of fam.rows) {
    const key = slugifyVariant(r.Variant);
    variations[key] = {
      count: 0,
      ordered: false,
      languages: [],
      default_language: fam.locale === 'Japanese' ? 'JP' : 'EN',
      available_languages: fam.locale === 'Japanese' ? ['JP'] : ['EN'],
    };
  }

  byId.set(id, {
    id,
    name: fam.name,
    set,
    era,
    number: numberGuess,
    sheet_no: '0',
    owned: 'no',
    imageUrl: '',
    url: '',
    variations,
    enriched: false,
    enriched_method: 'csv_import_pending_enrichment',
  });
  matchedCount.newCards++;
  newCardsAdded.push({ id, set, name: fam.name });
}

const result = Array.from(byId.values());

console.log(`Old DB cards: ${oldCards.length}`);
console.log(`Merged pairs applied: ${MERGE_PAIRS.length} (dropped ids: ${droppedSecondaryIds.join(', ')})`);
console.log(`CSV families: ${families.size}`);
console.log(`  matched to existing cards: ${matchedCount.matched}`);
console.log(`  new variant keys added to matched cards: ${newVariantsAdded.length}`);
console.log(`  brand-new cards created: ${matchedCount.newCards}`);
console.log(`Final card count: ${result.length}`);

console.log('\n--- new variant keys added ---');
for (const v of newVariantsAdded) console.log(`  ${v.cardId} + "${v.key}" (from CSV "${v.variant}", id ${v.from})`);

console.log('\n--- brand-new cards ---');
for (const c of newCardsAdded) console.log(`  ${c.id}  [${c.set}]  ${c.name}`);

if (WRITE) {
  writeFileSync(CARDS_PATH, JSON.stringify(result, null, 2) + '\n');
  console.log(`\nWrote ${CARDS_PATH}`);
} else {
  console.log('\n(dry run — pass --write to save)');
}
