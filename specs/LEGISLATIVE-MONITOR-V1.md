# Legislative & Lobbying Monitor — v1 Spec (trimmed)

**Status:** PROPOSAL — no build until John says begin.
**Target:** December 2026 milestone ("connect RCR" to the content pipeline).
**Origin:** Grok handoff (Nov 8, 2026), trimmed by Claude to fit RCR's direction (lookup, not magazine; no newsletter/paywall/ads).

---

## Quality gate (Bitwerx standard)
- **Gatekeeper:** the reader (and Google).
- **Proof they need:** every claim traceable to a primary source in one click; flags explained by a published rule.
- **Worth their time:** they learn a big package moved, or what's in it, without reading 1,000+ pages.
- **Human check:** nothing publishes without John's approval (existing pipeline approval gate).

## v1 scope — ONLY this
1. **Ingest:** new bills and new bill versions from the Congress.gov API (existing api.data.gov key). Filter to omnibus and appropriations packages only.
2. **Flag rules (published on the site):**
   - Omnibus or appropriations package
   - New text version posted (dated)
   - Length above a published page/section threshold
3. **Each entry (permanent, dated record — not a feed post):**
   - Bill number + version + date
   - Summary: Congressional Research Service (CRS) summary when one exists; otherwise AI summary **labeled "AI-written summary"**, written section by section, never a whole package in one pass
   - "Why flagged" line naming the rule
   - Direct link to official text
4. **Page:** tag filters on the page itself (no accounts, no saved settings). RSS feed.
5. **Status labels:** reuse RCR's Documented / Disputed / Alleged / Speculative system and dated updates.

## Reuse — do not rebuild
- **Pipeline:** bitwerx-inbox/content-pipeline (pipeline.py, approvals file, publish.py, ledger for duplicates).
- **Member data:** RINO Report's member data (535 members) becomes one shared member layer used by both sites. Any member card on RCR pulls from that layer.
- **Shared components:** RCR's existing nav/header/footer/CSS variables.

## v2 (only after v1 runs clean for a few weeks)
- **Lobbying:** LDA filings from **https://lda.gov/api/v1/** (lda.senate.gov was sunset June 30, 2026). Free key at lda.gov/api/register. Filings name bills in free text, so every lobbying↔bill link must be labeled with how the match was made (exact bill number vs. keyword).
- **Campaign money:** FEC API (api.open.fec.gov). OpenSecrets API is closed to new registrations (April 2025) — never propose it.
- **Member cards:** recent relevant votes, disclosed industry contributions, LDA registrations, public prior roles. Public records only.

## Cut / deferred indefinitely
- User accounts, watchlists, saved settings (requires auth + storage)
- Email alerts (that's a newsletter — ruled out for RCR)
- Side-by-side version comparison of omnibus packages (hardest piece; revisit last)
- CSV export (cheap to add later if anyone asks)

## Open questions — verify before building
1. **Late-amendment rule ("filed within 72 hours of a scheduled vote"):** Congress.gov API does not appear to publish floor schedules. Is there a reliable machine-readable source for scheduled House and Senate floor votes? If not, drop this rule from v1.
2. **Does this already exist?** Check GovTrack, LegiScan, Quorum, LegiStorm, Punchbowl, POPVOX, and any AI bill-summary trackers launched 2025–2026. What do they cover, what's paywalled, and what gap is actually left for ordinary readers?
3. **CRS summary lag:** how long after a bill version is posted do CRS summaries usually appear? Determines how often the AI fallback is needed.
4. **FEC key:** confirm the existing api.data.gov key works on the FEC API.

## Constraints (from original handoff — keep)
- Public records only. No private addresses, contact info, family details, or motive speculation.
- Non-partisan presentation. Partisan framing belongs to RINO Report, not RCR.
- Every automated claim traceable to a primary source.
