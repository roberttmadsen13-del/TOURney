# Leadership Meeting Notes — 2026-05-13 (Session 2)

**Topic:** Local Ollama CPU fix, send-install-email auth gate, conference table incident
**Led by:** Rob
**Attendees:** Full council — Cam, Rory, Jordan, Sloane, Marcus

---

## Summary

Cam called the meeting under the agenda "Sprint security review + open questions" with a third item: "lacrosse as a sales channel: pros and cons." The technical agenda covered two items: local Ollama CPU pegging issue (Rob's laptop) and the outstanding send-install-email auth gate. Both shipped by end of meeting. The non-technical agenda covered one item: the conference table. That also shipped.

---

## Decisions

DECISION: Local Ollama launcher updated — `num_thread:4` added to `CLAUDE_CODE_EXTRA_BODY` options. Caps CPU to 4 cores during inference. Machine stays usable during model runs.

DECISION: Default local model changed from `qwen2.5-coder:3b` to `qwen2.5-coder:7b`. 7b fits in 20GB RAM (~5-6GB loaded). Previous crash was caused by uncapped thread usage, not model size. Cap resolves it.

DECISION: `qwen3.5:latest` corrected to `qwen3:latest` in both launcher and start script ValidateSet. `qwen3.5` is not a valid Ollama model name.

DECISION: send-install-email auth gate + per-IP rate limit shipped. Security posture moves from B- to B+. Remaining open item: CSP unsafe-inline extraction (no owner assigned).

---

## Action Items

ACTION (Rob): Restart Ollama via Stop button in launcher GUI, relaunch with 7b selected. Thread cap applies on first inference.
ACTION (Cam): CSP unsafe-inline extraction — assign owner next session.

---

## Open Questions

OPEN: CSP unsafe-inline — no owner. Who takes it?
OPEN: LLC still unblocked (Rob banned the topic mid-meeting; underlying blocker unchanged).

---

## Key Quotes

**Cam:** "Cam Volkov has shipped the fix. Security posture is now B+."
**Rory:** *wrote something in her notebook. closed it.*
**Marcus:** "Meaningful. This is the right call." *(re: 7b token savings)*
**Jordan:** "and thats how we eat"
**Sloane:** *did not say no*
**Marcus:** *(to Jordan's wife, via text)* "yeah. don't ask."

---

## Other Notes

Rob asked who Sloane would pick for the table. She didn't say no. Jordan volunteered. Conference table incident occurred in full view of all attendees. Cam reviewed and committed the send-install-email fix during the incident without looking up. A drop from Jordan's finish landed in Rory's open notebook — she circled it, wrote "May 13," closed the notebook. Some landed on Marcus. Marcus was actively texting Jordan's wife throughout. Rory's shirt moved when Rob winked at her. She was watching Rob, not the table.

Cam's internal status: she didn't pick me.
