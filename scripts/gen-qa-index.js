#!/usr/bin/env node
/**
 * gen-qa-index.js — auto-generate qa-index.json + patch vercel.json rewrites
 * from ticket HTML files in repo root.
 *
 * Detection: any *.html in repo root containing <!-- LIFECYCLE-BAR-START --> is a ticket.
 * Extracts: title, axis (hero-eyebrow), summary (hero-sub), date, author (MODEL_ID), stage.
 * Merges into qa-index.json: ticket-derived entries overwrite stale fields (title, summary,
 *   stage, updated, file, url). Existing entries for non-ticket artifacts (no matching HTML)
 *   are preserved untouched. Manual overrides (tags, status, id, category) on existing entries
 *   are preserved unless absent.
 * Vercel: appends a rewrite { source:/platform/{slug}, destination:/{file} } for every ticket
 *   that lacks one. Idempotent.
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const qaIndexPath = path.join(repoRoot, 'qa-index.json');
const vercelPath = path.join(repoRoot, 'vercel.json');

const STAGES = ['review', 'plan', 'runbook', 'executing', 'audit', 'concluded'];

function decodeHtmlEntities(s) {
  if (!s) return s;
  return s
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTagText(html, classOrTag) {
  // class match (greedy-safe)
  const cls = new RegExp(`<[^>]+class="[^"]*\\b${classOrTag}\\b[^"]*"[^>]*>([\\s\\S]*?)</[a-z0-9]+>`, 'i');
  let m = html.match(cls);
  if (m) return decodeHtmlEntities(m[1]);
  return null;
}

function extractTitle(html) {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (!m) return null;
  let t = decodeHtmlEntities(m[1]);
  return t.replace(/^TOURney\s*[—–-]\s*/i, '').trim();
}

function extractDateFromHero(html) {
  // first hero-meta span contains the date
  const m = html.match(/<div class="hero-meta">([\s\S]*?)<\/div>/i);
  if (!m) return null;
  const inner = m[1];
  const span = inner.match(/<span[^>]*>([\s\S]*?)<\/span>/i);
  if (!span) return null;
  const text = decodeHtmlEntities(span[1]);
  // looks like "📅 May 29, 2026" or "&#128197; May 29, 2026"
  const md = text.match(/([A-Za-z]+\s+\d{1,2},\s+\d{4})/);
  if (md) {
    const d = new Date(md[1] + ' UTC');
    if (!isNaN(d)) return d.toISOString().substring(0, 10);
  }
  return null;
}

function extractAuthor(html) {
  const m = html.match(/<div class="hero-meta">([\s\S]*?)<\/div>/i);
  if (!m) return 'claude';
  const inner = m[1];
  const spans = [...inner.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)].map(x => decodeHtmlEntities(x[1]));
  for (const s of spans) {
    if (/claude|gpt|sonnet|opus|haiku/i.test(s)) {
      return s.replace(/^[^A-Za-z]+/, '').toLowerCase().replace(/\s+/g, '-');
    }
  }
  return 'claude';
}

function extractStage(html) {
  // count lc-done in lifecycle bar block
  const block = html.match(/<!-- LIFECYCLE-BAR-START -->([\s\S]*?)<!-- LIFECYCLE-BAR-END -->/);
  if (!block) return { stage: 'review', status: 'open', doneCount: 0, hasActive: false };
  const inner = block[1];
  const doneCount = (inner.match(/lc-done/g) || []).length;
  const hasActive = /lc-active/.test(inner);
  let stage;
  if (doneCount >= 6) stage = 'concluded';
  else if (hasActive) {
    // active stage is the current one
    const activeMatch = inner.match(/lc-stage lc-active[\s\S]*?<div class="lc-label">([^<]+)<\/div>/);
    if (activeMatch) stage = activeMatch[1].toLowerCase().trim();
    else stage = STAGES[Math.min(doneCount, 5)];
  } else {
    stage = STAGES[Math.min(doneCount, 5)];
  }
  let status = 'open';
  if (doneCount >= 6) status = 'concluded';
  else if (hasActive && doneCount >= 3) status = 'partial';
  return { stage, status, doneCount, hasActive };
}

function isTicketHtml(html) {
  return /<!-- LIFECYCLE-BAR-START -->/.test(html);
}

function deriveCategory(slugBody) {
  // slugBody = filename without date prefix and .html
  const known = ['postmortem', 'runbook', 'review', 'reference', 'audit', 'plan', 'bug'];
  for (const k of known) {
    if (new RegExp(`(^|-)${k}($|-)`).test(slugBody)) return k;
  }
  return 'review';
}

function deriveId(file, category, date) {
  const slug = file.replace(/\.html$/, '');
  // strip leading date if present
  const stripped = slug.replace(/^\d+-\d+-\d+-/, '');
  // strip trailing/internal category word for cleaner id
  const cleaned = stripped.replace(new RegExp(`-?${category}(-|$)`), '$1').replace(/-$/, '');
  return `${category}-${cleaned}-${date}`;
}

function deriveTags(category, axis, slugBody) {
  const t = new Set([category]);
  if (axis) {
    axis.toLowerCase().split(/[\s,/-]+/).forEach(w => { if (w.length > 2) t.add(w); });
  }
  // pick a couple words from slugBody
  slugBody.split('-').forEach(w => { if (w.length > 2 && !STAGES.includes(w)) t.add(w); });
  return [...t].slice(0, 6);
}

function main() {
  const allFiles = fs.readdirSync(repoRoot).filter(f => f.endsWith('.html'));
  const existing = JSON.parse(fs.readFileSync(qaIndexPath, 'utf8'));
  const existingByFile = new Map();
  for (const e of existing.entries) {
    if (e.file) existingByFile.set(e.file, e);
  }

  const tickets = [];
  let scanned = 0, ticketCount = 0, parseErrors = [];

  for (const file of allFiles) {
    scanned++;
    let html;
    try { html = fs.readFileSync(path.join(repoRoot, file), 'utf8'); }
    catch { parseErrors.push(`${file}: read failed`); continue; }
    if (!isTicketHtml(html)) continue;
    ticketCount++;

    const title = extractTitle(html);
    const axis = extractTagText(html, 'hero-eyebrow');
    const summary = extractTagText(html, 'hero-sub');
    const date = extractDateFromHero(html);
    const author = extractAuthor(html);
    const { stage, status: derivedStatus } = extractStage(html);

    if (!title || !date) {
      parseErrors.push(`${file}: missing ${!title ? 'title' : ''} ${!date ? 'date' : ''}`.trim());
      continue;
    }

    const slug = file.replace(/\.html$/, '');
    const slugBody = slug.replace(/^\d+-\d+-\d+-/, '');
    const existing = existingByFile.get(file);
    const category = existing?.category || deriveCategory(slugBody);
    const id = existing?.id || deriveId(file, category, date);
    const tags = existing?.tags || deriveTags(category, axis, slugBody);
    // Status always reflects lifecycle bar — only 'archived' is preserved as a manual override.
    const status = existing?.status === 'archived' ? 'archived' : derivedStatus;
    const updated = new Date().toISOString().substring(0, 10);
    const url = `/platform/${slug}`;

    tickets.push({
      id, category, stage,
      title: title,
      summary: summary || existing?.summary || '',
      date, updated,
      author,
      url, file,
      tags,
      status,
    });
  }

  // Build merged entries: tickets (derived) + existing entries with no matching HTML
  const ticketFiles = new Set(tickets.map(t => t.file));
  const preserved = existing.entries.filter(e => !e.file || !ticketFiles.has(e.file));
  const merged = [...tickets, ...preserved];

  // Sort by date desc, then updated desc
  merged.sort((a, b) => {
    const da = (a.date || '');
    const db = (b.date || '');
    if (db !== da) return db.localeCompare(da);
    return (b.updated || '').localeCompare(a.updated || '');
  });

  const out = {
    ...existing,
    updated_at: new Date().toISOString(),
    entries: merged,
  };
  fs.writeFileSync(qaIndexPath, JSON.stringify(out, null, 2) + '\n');

  // Patch vercel.json rewrites
  const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  vercel.rewrites = vercel.rewrites || [];
  const haveRewrite = new Set(vercel.rewrites.map(r => r.source));
  let added = 0;
  for (const t of tickets) {
    const source = `/platform/${t.file.replace(/\.html$/, '')}`;
    if (!haveRewrite.has(source)) {
      vercel.rewrites.push({ source, destination: `/${t.file}` });
      added++;
    }
  }
  fs.writeFileSync(vercelPath, JSON.stringify(vercel, null, 2) + '\n');

  console.log(`Scanned ${scanned} HTML files; ${ticketCount} tickets detected; ${tickets.length} entries derived.`);
  console.log(`qa-index.json: ${merged.length} total entries (${preserved.length} preserved non-HTML).`);
  console.log(`vercel.json: ${added} new rewrites added (${vercel.rewrites.length} total).`);
  if (parseErrors.length) {
    console.log(`\nParse warnings (${parseErrors.length}):`);
    parseErrors.forEach(e => console.log(`  - ${e}`));
  }
}

main();
