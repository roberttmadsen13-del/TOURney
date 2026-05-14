Restructure the platform page at `tourney.greenskeeper.studio/platform` (file: `platform.html` or equivalent in the TOURney repo at `C:\Users\Rob\Greenskeeper Studios\01 Repos\TOURney\`).

## What to build

Rebuild the tab navigation from 6 tabs to 7 tabs with clean separation of concerns. Each tab has exactly one job.

### New tab structure (in order)

| Tab | Contents |
|-----|----------|
| **Dashboard** | Axis scorecard only (Revenue, Security, QA, Deployment, Legal, Product grades + history). One summary count badge showing total open Action Board items — clicking it navigates to the Action Board tab. No tables, no task lists, no controls. Read-only. |
| **Tenants** | All tournament list, player accounts, invite codes, comped accounts. Everything related to managing tenants/players. |
| **Action Board** | Four sections in order: (1) Do Now, (2) Agent Can Do, (3) Waiting on Rob, (4) Recently Shipped / Recent Activity. Plus a fifth section: **Axis Tickets** (system-generated tickets from review runs — keep separate from Do Now). Remove all Action Board content from Dashboard tab. |
| **Artifacts** | Reviews, Plans, Audits, Runbooks — with existing sort and filter controls. Remove "Bugs" from the sub-filter here (Bugs has its own tab now). |
| **Bugs** | Full bug log — currently lives at `/platform/bugs`. Promote this to a top-level tab. Same content, now accessible directly from nav. |
| **QA** | Test slug runner, reset-all-checks button, QA protocol. No changes to functionality — just ensure it stays here and not on Dashboard. |
| **Reference** | Quick links, review skills list, setting keys. No changes. |

## Key decisions

- Dashboard summary count **links to Action Board tab** — does not show inline preview
- Axis Tickets is its **own section** in Action Board — not merged into Do Now
- Dashboard is **read-only** — no interactive controls remain on it
- Bug Log is **promoted to nav** — not a link inside QA or Artifacts

## What to remove / consolidate

- Remove Do Now / Agent Can Do / Waiting on Rob / Recently Shipped from Dashboard tab
- Remove Axis Tickets from Dashboard tab
- Remove "Bugs" sub-filter from Artifacts tab (now its own tab)
- Audit for any other duplicate content across tabs and eliminate

## QA after implementation

1. Each tab loads independently with correct content
2. Dashboard shows only scorecard + summary count badge
3. Clicking summary count navigates to Action Board tab
4. Action Board has all 5 sections: Do Now, Agent Can Do, Waiting on Rob, Recently Shipped, Axis Tickets
5. Bugs tab shows same content as current `/platform/bugs`
6. Artifacts tab no longer has a Bugs filter
7. No content appears in two tabs simultaneously
8. All existing functionality preserved (sorting, filtering, QA runner, invite code creation, etc.)
