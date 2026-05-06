#!/usr/bin/env node
/**
 * Static QA — run before every push: node test.js
 * No dependencies. Exit 1 if any FAIL, 0 if clean.
 */
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const html = fs.readdirSync(DIR).filter(f => f.endsWith('.html'));
const TOURNEY_PAGES = ['home','scoreboard','scorecard','feed','directory','profile','admin','champions','course','login','install'];
const SKIP_HREF = ['#','mailto:','tel:','http','data:','/icon','/manifest','/favicon','/sw.js','/nav-mobile','/pwa.js','/platform-manifest','/platform-icon'];

let failures = 0;
let warnings = 0;

function fail(msg)  { console.log(`  ❌ FAIL  ${msg}`); failures++; }
function warn(msg)  { console.log(`  ⚠️  WARN  ${msg}`); warnings++; }
function pass(msg)  { console.log(`  ✅ PASS  ${msg}`); }
function header(t)  { console.log(`\n═══ ${t} ═══`); }

// ── 1. DUPLICATE IDs ────────────────────────────────────────────────────────
header('1 · DUPLICATE IDs');
let t1ok = true;
for (const f of html) {
  const txt = fs.readFileSync(path.join(DIR, f), 'utf8');
  const ids = [...txt.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  const seen = {}, dups = new Set();
  for (const id of ids) { if (seen[id]) dups.add(id); seen[id] = true; }
  if (dups.size) { fail(`${f}: duplicate ids → ${[...dups].join(', ')}`); t1ok = false; }
}
if (t1ok) pass('no duplicate IDs across all HTML files');

// ── 2. BROKEN INTERNAL LINKS ────────────────────────────────────────────────
header('2 · BROKEN INTERNAL LINKS');
const vj = JSON.parse(fs.readFileSync(path.join(DIR, 'vercel.json'), 'utf8'));
const validRoutes = new Set([
  ...((vj.rewrites || []).map(r => r.source)),
  ...((vj.redirects || []).map(r => r.source)),
]);
// Dynamic segments — any route with :param or * always counts as valid prefix
const dynamicPrefixes = [...validRoutes].filter(r => r.includes(':') || r.includes('*'))
  .map(r => r.split(/[:*]/)[0].replace(/\/$/, ''));

let t2ok = true;
for (const f of html) {
  const txt = fs.readFileSync(path.join(DIR, f), 'utf8');
  const hrefs = [...txt.matchAll(/href="(\/[^"]+)"/g)].map(m => m[1])
    .filter(h => !SKIP_HREF.some(p => h.startsWith(p)));
  for (const h of hrefs) {
    const clean = h.split('?')[0].split('#')[0];
    if (clean.includes('{') || clean.includes('$')) continue; // template literal — skip
    const exact = validRoutes.has(clean);
    const dynamic = dynamicPrefixes.some(p => p && clean.startsWith(p));
    const onDisk = fs.existsSync(path.join(DIR, clean.slice(1)));
    if (!exact && !dynamic && !onDisk) {
      fail(`${f}: unresolved href → ${h}`); t2ok = false;
    }
  }
}
if (t2ok) pass('all internal hrefs resolve via vercel.json or disk');

// ── 3. REQUIRED SCRIPT INCLUDES ─────────────────────────────────────────────
header('3 · REQUIRED SCRIPT INCLUDES');
let t3ok = true;
for (const name of TOURNEY_PAGES) {
  const fpath = path.join(DIR, name + '.html');
  if (!fs.existsSync(fpath)) continue;
  const txt = fs.readFileSync(fpath, 'utf8');
  // install.html intentionally has no <nav> — skip nav-mobile check
  const needsNav = name !== 'install';
  const issues = [];
  if (!txt.includes('tourney-init.js')) issues.push('missing tourney-init.js');
  if (needsNav && !txt.includes('nav-mobile')) issues.push('missing nav-mobile');
  if (!txt.includes('manifest.json')) issues.push('missing manifest.json');
  if (issues.length) { fail(`${name}.html: ${issues.join(', ')}`); t3ok = false; }
}
if (t3ok) pass('all tourney pages include required scripts');

// ── 4. XSS — innerHTML WITH UNESCAPED DB DATA ────────────────────────────────
header('4 · XSS — innerHTML interpolating DB data');
// Known-safe patterns: hardcoded literals, number ops, local constant lookups
const SAFE_PATTERNS = [
  /^['"`][^'"` ${}]*['"`]$/,           // string literal only
  /^[\d\s+\-*/().,?:]+$/,              // numeric expression
  /^(Number|parseInt|parseFloat|Math)\(/,
  /^esc\(/,                             // explicitly escaped — our XSS helper
  /^DAY_WORDS\[/,                       // local constant array
  /^TIER_MAP\[/,                        // local constant map
  /^TIER_LABELS\[/,                     // local constant map
  /^TEAM_LETTERS\b/,                    // local constant
  /&#\d+;/,                             // HTML entity literal
  /^(day|numDays|teamCount|nWord|n|i)\b/, // local loop/count vars
  /^words\.join\(/,                     // safe — already fixed to textContent
  />\s*?'[es]'\s*?:/,                   // simple ternary suffix literals
];
// Known risky sources (DB-backed, user-controlled) — must be unescaped (no esc() wrapper)
const RISKY_SOURCES = [
  /^tournament\.name/,
  /^raw\b/,
  /^p\.(trash_talk|why_me|bio|name|first_name|last_name|email|phone)/,
  /^player\.(name|email|phone)/,
  /^r\b(?!\s*\))/,                      // bare `r` (loop var over DB array) but not esc(r)
];

let t4ok = true;
for (const f of html) {
  const txt = fs.readFileSync(path.join(DIR, f), 'utf8');
  const lines = txt.split('\n');
  lines.forEach((line, i) => {
    if (!line.includes('innerHTML') || !line.includes('${') || line.trim().startsWith('//')) return;
    const vars = [...line.matchAll(/\$\{([^}]+)\}/g)].map(m => m[1].trim());
    const unsafe = vars.filter(v => !SAFE_PATTERNS.some(p => p.test(v)));
    if (unsafe.length) {
      // Check if it's a truly risky variable (DB-sourced)
      const risky = unsafe.filter(v => RISKY_SOURCES.some(r => r.test(v)));
      if (risky.length) {
        fail(`${f}:${i+1}: innerHTML interpolates DB-sourced var → ${risky.join(', ')}`);
        t4ok = false;
      } else {
        warn(`${f}:${i+1}: innerHTML interpolates ${unsafe.join(', ')} — verify safe`);
      }
    }
  });
}
if (t4ok) pass('no innerHTML with DB-sourced interpolation found');

// ── 5. UNAWAITED SUPABASE CALLS (standalone, not Promise.all / .then chain) ──
header('5 · UNAWAITED STANDALONE SUPABASE CALLS');
let t5ok = true;
for (const f of html) {
  const txt = fs.readFileSync(path.join(DIR, f), 'utf8');
  const lines = txt.split('\n');
  lines.forEach((line, i) => {
    if (!/^\s*sb\.from\(/.test(line) || /await/.test(line) || line.trim().startsWith('//')) return;
    const prev3 = lines.slice(Math.max(0, i - 3), i).join(' ');
    const inBlock = prev3.includes('Promise.all') || prev3.trim().endsWith('[') || prev3.trim().endsWith(',');
    const hasThenChain = line.includes('.then(') || lines.slice(i+1, i+5).join(' ').includes('.then(');
    if (!inBlock && !hasThenChain) {
      fail(`${f}:${i+1}: unawaited sb.from — ${line.trim().slice(0, 80)}`);
      t5ok = false;
    }
  });
}
if (t5ok) pass('no standalone unawaited Supabase calls');

// ── 6. MANIFEST VALIDITY ────────────────────────────────────────────────────
header('6 · MANIFEST VALIDITY');
for (const mf of ['manifest.json', 'platform-manifest.json']) {
  try {
    const m = JSON.parse(fs.readFileSync(path.join(DIR, mf), 'utf8'));
    const missing = ['name','short_name','start_url','display','icons'].filter(k => !m[k]);
    if (missing.length) { fail(`${mf}: missing required fields → ${missing.join(', ')}`); continue; }
    const badIcons = m.icons.filter(ic => !fs.existsSync(path.join(DIR, ic.src.replace(/^\//, ''))));
    if (badIcons.length) fail(`${mf}: icon files missing → ${badIcons.map(i => i.src).join(', ')}`);
    else pass(mf);
  } catch(e) { fail(`${mf}: ${e.message}`); }
}

// ── 7. SW.JS CACHED ASSET PATHS ─────────────────────────────────────────────
header('7 · SW.JS CACHED ASSET PATHS');
try {
  const sw = fs.readFileSync(path.join(DIR, 'sw.js'), 'utf8');
  const assetRe = /['"]([./][^'"?#\s]+\.(js|css|html|png|svg|json))['"]/g;
  const assets = [...new Set([...sw.matchAll(assetRe)].map(m => m[1]))];
  let t7ok = true;
  for (const asset of assets) {
    const local = asset.replace(/^\//, '').replace(/^\.\//, '');
    if (!fs.existsSync(path.join(DIR, local))) {
      fail(`sw.js caches missing file: ${asset}`); t7ok = false;
    }
  }
  if (t7ok) pass('all sw.js cached assets exist on disk');
} catch(e) { fail(`sw.js: ${e.message}`); }

// ── SUMMARY ─────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(50));
if (failures > 0) {
  console.log(`\n🔴  ${failures} failure(s), ${warnings} warning(s) — DO NOT SHIP\n`);
  process.exit(1);
} else if (warnings > 0) {
  console.log(`\n🟡  0 failures, ${warnings} warning(s) — review before ship\n`);
  process.exit(0);
} else {
  console.log(`\n🟢  All checks passed — clean to ship\n`);
  process.exit(0);
}
