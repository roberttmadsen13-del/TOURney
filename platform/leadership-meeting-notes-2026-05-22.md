# TOURney Leadership Meeting Notes
**Date:** May 22, 2026  
**Type:** Automated Weekly Review Drop  
**Review:** [Full Platform Review · May 22, 2026](https://tourney.greenskeeper.studio/platform/5-22-26-claude-review)  
**Attendees:** Marcus Webb (CFO), Rory Nair (CPO), Cam Volkov (CISO), Jordan Reyes (CRO), Sloane Hargrove (CMO)  
**Rob:** Not present (automated run)

---

## Summary

Grades mostly stable. Business bumped from C+ to B− following last sprint's execute (mygolf_profiles, donations, RSVP auto-fill, pricing reboot). Revenue infrastructure is done — the only thing stopping $1 of MRR is Rob forming an LLC. Security holds A− with one HIGH XSS open (feed.html:377 _parseMentions, quick fix) and send-push still unauthenticated in prod. Team debate centered on competitive direction: competitor analysis surfaced zero player-facing score entry as the single biggest gap vs Unknown Golf.

---

## Decisions Made

**DECISION:** Player score entry is confirmed P1 above GPS and side games. Zero player input is an admin-burden problem that blocks scale — organizer can't run 24-player events alone. Ship it before any competitive feature work.

**DECISION:** feed.html:377 XSS is a one-line fix. No reason it's still open. Goes in the next execute.

---

## Action Items

**ACTION (Rob):** Form the LLC. This is week N+4 of it being P0 on the blockers list. Engineering is done. Stripe is wired. The switch is waiting for a legal entity. 30 minutes at a Wyoming filing service. Do it today.

**ACTION (Rob):** Deploy send-push. Command is in every review since May 8. `npx supabase functions deploy send-push --project-ref jllugkiojeoopitdvzsa`. 10 minutes.

**ACTION (Engineering next execute):** Fix feed.html:377 — apply `esc(str)` before `_parseMentions` sets `d.innerHTML`. One line.

**ACTION (Engineering next execute):** Build player score entry UI. Gated on `rounds.scoring_open`. Writes to scores table. Realtime push to scoreboard. This is P1.

---

## Open Questions

**OPEN:** When player score entry ships — does admin score-edit UI ship in the same execute or follow-on? Rory wants them together. Cam doesn't care. Marcus says ship entry first, edit second.

**OPEN:** GPS yardage (P3 roadmap) — Sloane flagged it as a marketing differentiator ("groups going to new courses" is the pitch). Free to build. Is it a Q2 or Q3 item?

**OPEN:** Side games / payouts (P2 roadmap) — Jordan flagged that every casual golf group has a skins game. "You don't need a whole feature — just a skins tab and a money column." Is that a one-session build?

---

## Key Quotes

**Marcus:** "Business is B−. Still $0 MRR. Every single thing between us and revenue is on Rob's to-do list, not ours. That's good news and bad news in the same sentence."

**Jordan:** "Player score entry is the right call. Right now a 20-person tournament means one person on a laptop all day entering everyone's scores. That's not a product — that's a spreadsheet with a nice UI."

**Cam:** "feed.html XSS has been in the report since May 13. It's one line of code. I don't want to read about it in a sixth review."

**Rory:** *(marks something, flips to a new page)*

**Sloane:** "The GPS angle is real. 'Play any course, know every yard' is a better one-liner than anything we have on the marketing page right now. I want it in the product before we do a real outreach push."

---

## Grades This Week

| Axis | Grade | Change |
|------|-------|--------|
| Architecture | A | — |
| Feature Depth | A− | ↑ from B+ (5-21 execute) |
| UX Polish | A | — |
| Security | A− | — (migration 013 helped, XSS still open) |
| Business Ready | B− | ↑ from C+ (5-21 execute) |
| Deployment | B+ | — |
| Performance | B+ | — |
| Data Model | B+ | — |
