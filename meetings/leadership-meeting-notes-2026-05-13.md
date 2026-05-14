# Leadership Meeting Notes — 2026-05-13

**Topic:** Platform page (`/platform`) restructure — reduce repetition, improve actionability, add Bug Log tab
**Led by:** Sloane Hargrove (CMO)
**Attendees:** Full council — Sloane, Rory, Cam, Jordan, Marcus

---

## Summary

Team reviewed `tourney.greenskeeper.studio/platform` against Rob's two complaints: content repeating across tabs, and the bug log not being a first-class tab. Full alignment reached in one pass. The fix is a clean tab restructure — Dashboard strips to scorecard-only, Action Board becomes the single home for all task items, Bugs gets promoted to top-level nav, and Axis Tickets moves from Dashboard into Action Board where it belongs.

---

## Decisions

DECISION: Dashboard tab becomes read-only scorecard. Shows axis grades (Revenue, Security, QA, Deployment, Legal, Product) + a single summary count linking to Action Board. No tables, no action items, no controls.

DECISION: Action Board is the single home for Do Now, Agent Can Do, Waiting on Rob, Recently Shipped, Recent Activity, and Axis Tickets. These items are removed from Dashboard entirely.

DECISION: Tenants tab consolidates all tenant management — tournament list, player accounts, invite codes, comped accounts.

DECISION: Bugs promoted to top-level navigation tab. `/platform/bugs` is no longer a buried link — it's a tab alongside Dashboard, Tenants, Action Board, Artifacts, QA, Reference.

DECISION: Artifacts tab loses Bugs sub-filter (Bugs has its own tab now). Artifacts = Reviews, Plans, Audits, Runbooks only.

DECISION: QA tab retains the test slug runner and reset-all-checks controls. Those stay in QA context — Dashboard is a read surface, not a control surface.

DECISION: Reference tab stays as-is — static documentation, review skills list, setting keys. Not the same as Artifacts (generated output). No overlap.

---

## Final Tab Structure

| Tab | Responsibility |
|-----|---------------|
| Dashboard | Axis scorecard + today's summary count (read only) |
| Tenants | Tournament list, players, invite codes, comped accounts |
| Action Board | Do Now / Agent Can Do / Waiting on Rob / Recently Shipped / Recent Activity / Axis Tickets |
| Artifacts | Reviews, Plans, Audits, Runbooks |
| Bugs | Full bug log (promoted from /platform/bugs) |
| QA | Test slug runner, reset checks, QA protocol |
| Reference | Quick links, review skills, setting keys |

---

## Action Items

ACTION (Rory): Write spec for tab restructure — already in notebook, formalize and hand to implementation.
ACTION (agent): Rebuild platform page tab structure per the decisions above. Remove duplicate action board items from Dashboard. Promote Bugs to nav tab. Move Axis Tickets to Action Board.

---

## Open Questions

OPEN: Does the summary count on Dashboard link directly to Action Board, or does it show a mini-preview inline?
OPEN: Axis Tickets — does it get its own section in Action Board or merge into Do Now?

---

## Key Quotes

**Rory:** "Dashboard shows axis grades and a summary count — single number, links to Action Board for detail."
**Marcus:** "If I open that page and have to scroll past a tenants table to see Revenue status, that's a UX tax I'm paying every single time."
**Cam:** "Cam Volkov requires the bug log to be a first-class tab."
**Jordan:** "Action Board should be its own thing, clean. That's where I live when I'm checking what's moving."
**Sloane:** "Dashboard = health at a glance. Scorecard only."
**Marcus:** "If Do Now shows 3 on Dashboard and 4 on Action Board, somebody's making a bad call with stale data."

---

## Other Notes

Sloane disclosed mid-meeting that the "lacrosse bro" she had been referencing all session was Rob. Jordan found this incredible. Cam gave it thirty seconds. Rory wrote something in her notebook. Marcus stayed on his spreadsheet.
