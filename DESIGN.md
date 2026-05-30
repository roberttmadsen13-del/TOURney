# TOURney Design System

Single source of truth: `tokens.css` (imported by every page). This doc is the *why* and the *rules of use* — the tie-breaker for every styling decision.

## Principles

1. **Glance, don't read.** A golfer checks the phone between shots. Primary info must be legible in under one second.
2. **The score is the hero.** On any scoring surface, the current score input is the largest, highest-contrast element. Nothing competes. (`.ds-card-hero`)
3. **Mono = data, never prose.** `var(--font-mono)` (DM Mono) for numbers/labels/metadata; `var(--font-sans)` (Barlow) for sentences.
4. **Gold is action & identity, not decoration.** Reserve `--gold` for interactive and brand moments so it stays meaningful.
5. **Earn every tap.** Assume a gloved thumb in motion: ≥48px targets (`.tap`), ≥56px for primary score controls (`.tap-lg`).

## Surface tiers — one token set, two contexts

| Tier | Where | Treatment |
|------|-------|-----------|
| **Lean-back** (default) | marketing, platform, admin, login | dark, dense, premium — indoor, deliberate |
| **Active** (`.surface-active`) | scorecard, scoreboard | higher contrast (`--text:#fff`), larger type, ≥48px taps — outdoor, fast, gloved |

Add `class="surface-active"` to the body/root wrapper of scoring pages. Same gold, same fonts — different density & contrast budget.

## Sunlight Course Mode

The scorecard is the one screen guaranteed to be used in direct sun, where dark UIs wash out. A `[data-mode="course"]` variant flips the **active surface only** to a near-white high-contrast field. Toggle in the scorecard header, persisted per device via `localStorage['tourney-mode']`. Default stays dark; Course Mode is opt-in.

## Components (in tokens.css)

- `.ds-card` / `.ds-card-accent` / `.ds-card-hero` — dark card, left-accent variant, elevated hero treatment.
- `.pill` + `.pill-{gold,green,red,orange,blue,purple}` — status/format/score badges.
- `.tap` / `.tap-lg` — tap-target floors.
- `.commit-flash`, `.score-birdie`, `.score-eagle` — score feedback / celebration.

## Migration status (2026-05-29)

- ✅ **Foundation shipped:** `--font-mono` → DM Mono; tiers, Course Mode, components, motion defined (additive, inert until applied).
- ⏳ **Pending — cream→dark flip:** tournament app pages color text with `var(--ink)` (#1a1008, dark) on their inline light `:root`. Flipping bg dark requires remapping those text usages to `var(--text)` (174 occurrences across 18 pages — admin 80, scorecard 22, scoreboard 11) and per-page QA. Staged, not a blind token swap. See ticket `5-29-26-ux-design-system-review`.
