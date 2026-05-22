#!/usr/bin/env python3
"""
Auto-sync platform ticket HTML files into qa-index.json.
Runs in CI on every push to main. Adds new date-stamped ticket files
from /platform/ as entries. Updates stage on auto-managed entries.
Never overwrites manually authored entries.
"""
import json, re, sys
from pathlib import Path
from datetime import datetime, timezone

PLATFORM_DIR = Path('platform')
QA_INDEX = Path('qa-index.json')
# Matches: M-D-YY-slug.html or M-D-YYYY-slug.html
TICKET_PAT = re.compile(r'^(\d{1,2})-(\d{1,2})-(\d{2,4})-(.+)\.html$')
STAGES = ['review', 'plan', 'runbook', 'executing', 'audit', 'concluded']

AXIS_MAP = {
    'security': 'security',
    'architecture': 'architecture',
    'ux': 'ux',
    'deployment': 'deployment',
    'data-model': 'data-model',
    'performance': 'performance',
    'feature': 'feature-depth',
    'business': 'business',
    'competitor': 'business',
    'finance': 'finance',
    'marketing': 'marketing',
    'onboarding': 'onboarding',
}

CAT_KEYWORDS = ['audit', 'plan', 'runbook', 'postmortem']


def parse_stage(html):
    # Active stage: look for lc-active label
    m = re.search(
        r'class="lc-stage lc-active"[^>]*>.*?<div class="lc-label">(\w+)</div>',
        html, re.DOTALL
    )
    if m:
        s = m.group(1).lower()
        if s in STAGES:
            return s
    # All done = concluded
    done = len(re.findall(r'class="lc-stage lc-done"', html))
    if done >= len(STAGES):
        return 'concluded'
    # Pick by count
    return STAGES[done] if done < len(STAGES) else 'review'


def parse_title(html, slug):
    m = re.search(r'<title>([^<]+)</title>', html)
    if m:
        t = re.sub(r'^TOURney\s*[—–\-]+\s*', '', m.group(1)).strip()
        if t:
            return t
    return slug.replace('-', ' ').title()


def parse_summary(html):
    for pat in [
        r'class="hero-sub"[^>]*>([^<]{15,300})',
        r'class="section-desc"[^>]*>([^<]{15,300})',
    ]:
        m = re.search(pat, html)
        if m:
            return m.group(1).strip()
    return ''


def infer_category(slug):
    for c in CAT_KEYWORDS:
        if c in slug:
            return c
    return 'review'


def infer_axis(slug):
    for k, v in AXIS_MAP.items():
        if k in slug:
            return v
    return None


def main():
    if not QA_INDEX.exists():
        print(f'ERROR: {QA_INDEX} not found', file=sys.stderr)
        sys.exit(1)

    data = json.loads(QA_INDEX.read_text(encoding='utf-8'))
    entries = data.get('entries', [])

    # Index existing entries by URL for fast lookup
    by_url = {e['url']: e for e in entries if e.get('url')}
    changed = False

    for f in sorted(PLATFORM_DIR.glob('*.html')):
        m = TICKET_PAT.match(f.name)
        if not m:
            continue

        month, day, year, slug = m.groups()
        if len(year) == 2:
            year = f'20{year}'
        date_str = f'{year}-{int(month):02d}-{int(day):02d}'
        url = f'/platform/{slug}'

        html = f.read_text(encoding='utf-8', errors='ignore')
        stage = parse_stage(html)
        existing = by_url.get(url)

        if existing:
            # Only update stage on auto-managed entries where stage has drifted
            if existing.get('auto') and existing.get('stage') != stage:
                existing['stage'] = stage
                existing['updated'] = date_str
                existing['status'] = 'concluded' if stage == 'concluded' else 'open'
                print(f'Stage updated: {url} → {stage}')
                changed = True
            continue

        # New entry
        title = parse_title(html, slug)
        summary = parse_summary(html)
        category = infer_category(slug)
        axis = infer_axis(slug)
        tags = list(filter(None, [category, axis]))

        entry = {
            'id': f'{slug}-{date_str}',
            'category': category,
            'stage': stage,
            'title': title,
            'summary': summary,
            'date': date_str,
            'updated': date_str,
            'author': 'auto',
            'url': url,
            'file': f.name,
            'tags': tags,
            'status': 'concluded' if stage == 'concluded' else 'open',
            'auto': True,
        }
        if axis:
            entry['axis'] = axis

        entries.insert(0, entry)
        by_url[url] = entry
        print(f'Added: {url} ({category} / {stage})')
        changed = True

    if not changed:
        print('No changes — qa-index.json up to date.')
        sys.exit(0)

    data['entries'] = entries
    data['updated_at'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    QA_INDEX.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + '\n',
        encoding='utf-8'
    )
    print(f'qa-index.json written — {len(entries)} total entries.')


if __name__ == '__main__':
    main()
