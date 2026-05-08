# TOURney Leadership Meeting Notes
**Date:** May 8, 2026  
**Type:** Automated Weekly Review Drop  
**Review:** [Full Platform Review · May 8, 2026](https://tourney.greenskeeper.studio/platform/5-8-26-claude-review)  
**Attendees:** Marcus Webb (CFO), Rory Nair (CPO), Cam Volkov (CISO), Jordan Reyes (CRO), Sloane Hargrove (CMO)  
**Rob:** Not present (automated run)

---

## Summary

Team reviewed the May 8 weekly platform review. Architecture improved to A (is_admin fully retired). Security holds at B- with two HIGH open issues (send-push live function still unauthenticated, send-install-email has no auth fix committed). Business Ready remains C+ — LLC formation is the single critical blocker. Council of Five priorities debated: team consensus favors loading skeletons before tournament series, and handicap net score was flagged as a table-stakes feature for the target market.

---

## Decisions Made

**DECISION:** Sprint priority order agreed by team: (1) deploy send-push with auth fix, (2) write + deploy send-install-email auth gate, (3) loading skeletons, (4) LLC formation, (5) ToS + Privacy pages. Everything downstream of LLC follows.

**DECISION:** Handicap-adjusted net score flagged as table stakes for mixed-handicap casual golf events — the core addressable market. Should be on the immediate post-LLC sprint list.

**DECISION:** Accounting (Wave + Stripe integration) must be set up on the same day Stripe gate is flipped — not after first payment arrives.

---

## Action Items

**ACTION (Rob):** Form LLC this week. Not next week. All Stripe activation, ToS, and revenue is gated on this single step. Cam and Marcus both flagged it.

**ACTION (Rob):** Deploy send-push with committed auth fix. Command: `npx supabase functions deploy send-push --project-ref jllugkiojeoopitdvzsa`. Requires SUPABASE_ACCESS_TOKEN. Estimated: 15 minutes.

**ACTION (Rob):** Write auth gate for send-install-email — no fix committed yet. Add JWT check + rate limit (1 email/hour per email+tournament_id). Then deploy alongside send-push.

**ACTION (Rob):** Build loading skeletons across all pages. Half-day effort per CPO estimate. Eliminates blank-flash perceived-performance issue.

**ACTION (Rob):** Create tos.html + privacy.html before Stripe activation. Required by Stripe ToS. Add checkbox to /create step 1.

**ACTION (Rob):** Wire Wave accounting to Stripe on day of payment activation.

---

## Open Questions

**OPEN:** Bova format Day 3 still unconfirmed — seeded as best_ball but "shambles" day may apply. Chris Bova must confirm before tournament runs.

**OPEN:** Tournament series schema (migration 012 concept) — Rory flagged it as the right long-term architecture but wants skeletons shipped first. When does series go on the sprint?

**OPEN:** CSP unsafe-inline removal — requires extracting all inline scripts to .js files. Cam flagged it as Week 1 pre-launch work. No owner assigned yet.

---

## Key Quotes

**Marcus:** "Every week we're not live is roughly ninety dollars of potential MRR not captured."

**Cam:** "Cam Volkov requires that send-push gets deployed this week. The live function has zero authentication on it right now. That is a man walking around with his fly unzipped — harmless until it isn't."

**Jordan:** "The Bova tournament is our demo floor. Every person who plays it is a future customer for their own golf group. We need to be live on Stripe before tournament day, not after. And that's how we eat."

**Rory:** *(writes something in notebook)*

**Sloane:** "The handicap-adjusted scoreboard — mixed handicap groups are literally every casual golf event that's not a scratch tournament. Showing net scores isn't a feature — it's table stakes for the customer we're selling to."

---

## Grades This Week

| Axis | Grade | Change |
|------|-------|--------|
| Architecture | A | ↑ from A- |
| Feature Depth | B+ | — |
| UX Polish | B | — |
| Security | B- | — |
| Business Ready | C+ | — |
| Deployment | B+ | — |
| Performance | B | — |
| Data Model | B | ↑ from B- |
