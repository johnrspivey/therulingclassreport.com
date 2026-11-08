# Legislative & Lobbying Monitor — v1 Spec (trimmed)

**Status:** PROPOSAL — no build until John says begin.
**Target:** December 2026 milestone ("connect RCR" to the content pipeline).
**Origin:** Grok handoff (Nov 8, 2026), trimmed by Claude to fit RCR's direction (lookup, not magazine; no newsletter/paywall/ads). Sparked by Calley Means' Nov 6, 2026 Joe Rogan interview alleging donor/industry influence over White House health policy.

---

## Quality gate (Bitwerx standard)
- **Gatekeeper:** the reader (and Google).
- **Proof they need:** every claim traceable to a primary source in one click; flags explained by a published rule.
- **Worth their time:** they learn a big package moved, or what's in it, without reading 1,000+ pages — and without already knowing which bill to follow.
- **Human check:** nothing publishes without John's approval (existing pipeline approval gate).

## Positioning (from Nov 8 competitor check)
- Plain-English AI bill summaries alone are a crowded space (several free apps already do it). **Not the differentiator.**
- The differentiator is the **published flagging rules**: RCR tells readers *which* big packages moved and *why* they were flagged, for people who haven't picked bills to follow. Free trackers (GovTrack, LegiScan, Congress.gov) make you choose bills first; pro tools that flag (Quorum, FiscalNote, LegiStorm) cost hundreds a month.

## v1 scope — ONLY this
1. **Ingest:** new bills and new bill versions from the Congress.gov API (existing api.data.gov key). Filter to omnibus and appropriations packages only.
2. **Flag rules (published on the site):**
   - Omnibus or appropriations package
   - New text version posted (dated)
   - Length above a published page/section threshold
3. **Each entry (permanent, dated record — not a feed post):**
   - Bill number + version + date
   - Summary: Congressional Research Service (CRS) summary when one exists (Congress.gov carries these); otherwise AI summary **labeled "AI-written summary"**, written section by section, never a whole package in one pass
   - "Why flagged" line naming the rule
   - Direct link to official text
   - Link to the bill's GovTrack page for version-to-version comparison (link out, don't rebuild)
4. **Page:** tag filters on the page itself (no accounts, no saved settings). RSS feed.
5. **Status labels:** reuse RCR's Documented / Disputed / Alleged / Speculative system and dated updates.

## Reuse — do not rebuild
- **Pipeline:** bitwerx-inbox/content-pipeline (pipeline.py, approvals file, publish.py, ledger for duplicates).
- **Member data:** RINO Report's member data (535 members) becomes one shared member layer used by both sites. Any member card on RCR pulls from that layer.
- **Shared components:** RCR's existing nav/header/footer/CSS variables.
- **Version comparison:** GovTrack already does it free — link to it.

## v2 (only after v1 runs clean for a few weeks)
- **Late-amendment rule ("amendment filed within 72 hours of a scheduled vote"):** buildable but not one clean feed. Amendment filing dates come from the Congress.gov API. Scheduled votes must be pulled from leadership schedule pages (House Majority Leader daily/weekly schedule; Senate is less structured), then confirmed against actual roll-call votes. Scraped schedule pages break and change, so this needs a watchdog check. Start House-only.
- **Lobbying:** LDA filings from **https://lda.gov/api/v1/** (lda.senate.gov was sunset June 30, 2026). Free key at lda.gov/api/register. Filings name bills in free text, so every lobbying↔bill link must be labeled with how the match was made (exact bill number vs. keyword).
- **Campaign money:** FEC API (api.open.fec.gov). OpenSecrets API is closed to new registrations (April 2025) — never propose it.
- **Member cards:** recent relevant votes, disclosed industry contributions, LDA registrations, public prior roles. Public records only.

## First test case — Means v. Wiles (claim index + monitor together)
Use this story to test the claim index and the v2 lobbying/money feeds before opening them to everything.
- **Claim:** Calley Means (former senior HHS adviser) said on The Joe Rogan Experience (released Nov 6, 2026) that White House chief of staff Susie Wiles held back MAHA food/health policy (e.g., children's diets) because of the need for sugar/food industry money for the midterms. **Label: Alleged** (dated Nov 6, 2026). Rests on his account of private conversations.
- **Context (dated):** hours/days later Trump named Stephen Miller chief of staff and moved Wiles to his political operation, after a bad midterm result. Record the timing; do NOT imply cause unless documented.
- **What public records can test:** LDA filings by sugar/food/beverage clients listing the White House Office or HHS as contacted, by quarter; FEC contributions from those industries to the party/midterm committees; timeline of the MAHA policies Means names (proposed → stalled/changed). Show what the records support and what they don't.
- **What records can't test:** what Wiles privately said. Stays Alleged unless new evidence (testimony, documents, investigation) appears → dated update.
- **Each side's strongest case:** Means' account as an insider who resigned; the White House/Wiles side and critics who question Means' motives and credibility. Include the earlier record: in Dec 2024 (Danny Jones Podcast #277), Dr. Jack Kruse and Dr. Mary Talley Bowden challenged Means' sincerity over his past as a food/pharma lobbyist — the accuser was once accused of the same thing. Present both, choose no side.
- **Questions for the reader:** What would it take to confirm or rule out the claim? Which records would you check first?

## Cut / deferred indefinitely
- User accounts, watchlists, saved settings (requires auth + storage)
- Email alerts (that's a newsletter — ruled out for RCR)
- Building our own side-by-side version comparison (GovTrack link covers it)
- CSV export (cheap to add later if anyone asks)

## Open questions — still to verify before building
1. **CRS summary lag:** how long after a bill version is posted do CRS summaries usually appear? Determines how often the AI fallback is needed.
2. **FEC key:** confirm the existing api.data.gov key works on the FEC API (v2 only).

## Resolved (Nov 8, 2026 — Grok check, reviewed by Claude)
- **Competitors:** gap is real but narrow — see Positioning. Caution: Grok's list included stale names (OpenCongress shut down years ago; the Sunlight Congress API is gone), and it wrongly said Congress.gov has no plain-language summaries (it carries CRS summaries). Treat its newer-app names as leads, not confirmed facts.
- **Floor schedules:** no official machine-readable "upcoming votes" API; moved late-amendment rule to v2 (see above).

## Constraints (from original handoff — keep)
- Public records only. No private addresses, contact info, family details, or motive speculation.
- Non-partisan presentation. Partisan framing belongs to RINO Report, not RCR.
- Every automated claim traceable to a primary source.
