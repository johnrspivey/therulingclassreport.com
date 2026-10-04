# Gap Report — therulingclassreport.com

_Snapshot of `main` as of 2026-10-04 (HEAD `083d527`). Read-only audit: no code was changed._

---

## TL;DR

- **The site is 18 static HTML pages plus 2 Netlify serverless functions.** There's no build step, no `package.json`, no CI, and **no tests of any kind**.
- **Congress.gov data updates automatically, live in each visitor's browser, on every page load.** Nothing is stored, cached, or scheduled. *Which* votes count toward the score, and the scoring rules, are hardcoded and only change when someone edits `congress.html` by hand.
- **Only House Republicans get a real score.** Senators, Democrats and Independents always show a fixed default (72 for R, 8 for everyone else). Because of that, the **Obstructors** tab's Democrat list and the **DOGE "Top Obstructors"** list are always empty.
- **The tracker is hardcoded to the 119th Congress.** The 120th Congress starts **Jan 3, 2027**, about 3 months from now. Without an edit, the tracker will keep showing the outgoing roster and old votes.
- **The `/.netlify/functions/claude` endpoint is an open relay.** Anyone on the internet can send it any request and it gets billed to the site's Anthropic API key. Of everything in this report, this is the most urgent to fix.
- **Four pages are orphaned or leftovers:** `congress-restored.html`, `scotus.html`, `obama-timeline.html` and `dfars-2027-gulf-coast-report.html`. **Seventeen exhibits or entries are marked "Coming Soon" or "In Development".**

---

## 1. How the Congress.gov data gets updated

**Answer: it's automatic and live. Each page view fetches fresh data, with no storage and no schedule. The *rules* for scoring are manual.**

### What happens when someone opens `/congress.html`

1. The browser downloads React, ReactDOM and **Babel-standalone** from cdnjs. It then compiles about 2,200 lines of JSX in the browser (`congress.html:723`).
2. `loadMembers()` makes **3 calls** to `/.netlify/functions/congress?path=member&congress=119&currentMember=true&limit=250&offset=0|250|500` (`congress.html:2643-2679`).
3. `backgroundScore()` makes **8 more calls**, one per hardcoded key vote, to `/.netlify/functions/congress/house-vote/119/{session}/{roll}/members` (`congress.html:2708-2768`).
4. The Netlify function `netlify/functions/congress.js` adds the secret `CONGRESS_API_KEY` and passes each request through to `https://api.congress.gov/v3/...`. It returns the raw JSON without changing it.
5. Scores are calculated in the browser and thrown away when the tab closes.
6. On the **Key Votes** tab, opening a vote's breakdown makes one more live call per vote (`congress.html:2445`).

### What is automatic

- The current-member roster (names, party, state, chamber)
- How each House member voted on the 8 key roll calls
- The resulting loyalty scores for House Republicans

### What is manual (only changes when someone edits `congress.html`)

| Thing | Where | Notes |
|---|---|---|
| Congress number (`119`) | `congress.html:2648-2658, 2718, 2445` | Must change for the 120th Congress (Jan 3, 2027) |
| List of 8 key votes (session, roll #, "conservative" position) | `KEY_VOTES`, `congress.html:2690-2699` | **Duplicated** in `KEY_VOTES_LIBRARY`, `congress.html:2413-2422`. Both lists must be edited together or the "how scores work" tab drifts from the real math. |
| Scoring weights: baseline 72 for R / 8 for others; +6 aye, −10 against, −3 skip | `congress.html:2623, 2739-2741, 2762` | Also repeated as display text at `congress.html:2512-2514` and `2578-2584` |
| Governors (50), Supreme Court (9), Media outlets (25), DOGE stats and agency ratings | `GOVERNORS`, `SCOTUS`, `MEDIA_OUTLETS`, `DOGE_STATS`, `AGENCY_RATINGS` | Entirely hand-entered. DOGE says "Last updated: Jan 2026". |

### Consequences of the live-only design

- **No caching.** Each visit costs 11 Congress.gov requests. Congress.gov allows about **5,000 requests per hour per key**, so roughly **450 page views per hour** will start getting throttled. A traffic spike from a shared link would hit this.
- **When Congress.gov is slow or down, so is the tracker.** Member-load errors are only logged to the console (`congress.html:2661`). The page would then render "0 members" with no explanation.
- **No history.** There's no record of past scores, so "score went up/down this week" isn't possible.
- **Page load is slow.** Users wait on 3 member calls in a row before anything renders, then 8 vote calls one after another. Babel compiling JSX in the browser adds more time on top.
- The methodology text says *"Scores updated in real time on every page load"* (`congress.html:2598`). That's accurate, but it's the cause of all of the above.

---

## 2. Inventory: every page

"Reachable from" lists pages whose **rendered** links point to it. Links inside HTML comments or stray markup aren't counted.

| Page | What it is | Status | Reachable from |
|---|---|---|---|
| `index.html` | Homepage: hero plus cards for the major sections | **Complete** | Every page (logo / Home) |
| `museum.html` | "Museum of 21st Century Govt Corruption". Gallery of exhibits. | **Complete shell.** 7 live exhibits, **13 "Coming Soon"** | index, nav |
| `congress.html` | **RINO Report**: React congressional loyalty tracker (see §3) | **Live, with gaps** (§3, §4) | index, nav, museum |
| `trump-timeline.html` | "The Campaign Against Trump" timeline | Complete | index, nav, museum |
| `obama-full-record.html` | "The Obama Record" (editorial style, rebuilt in latest commit) | Complete | index, museum |
| `the-mirror.html` | "The Mirror": accusation vs. record | Complete | index, nav, museum |
| `the-architects.html` | "The Architects": seven figures | Complete | index, museum |
| `flyover-america.html` | Flyover America series hub | **Partial.** 1 live entry, **4 "In Development"** | index, nav, museum |
| `crowley-county.html` | Flyover America Entry 001: Crowley County water | Complete | **flyover-america only**. Not in the nav. |
| `deindustrialization-timeline.html` | "How They Dismantled American Industry" | Complete | museum only |
| `suspicious-deaths.html` | "Suspicious Deaths & Unanswered Questions" | Complete (has a markup bug, §4) | museum only |
| `wef-globalist-agenda.html` | "The Globalist Agenda": WEF / Great Reset | Complete | museum only |
| `save-america-act.html` | SAVE America Act explainer | Complete | index only |
| `about-mission.html` | "Our Editorial Standard" | Complete | index, nav, museum |
| `scotus.html` | Supreme Court tracker stub: 4 bullet points, "coming soon" | **Stub / orphan** | **Nothing links to it.** Commit history says it was created "to fix 404 error". |
| `congress-restored.html` | Older stub of the Congress tracker: "Full detailed tracker coming soon" | **Stub / orphan, superseded** | **Nothing** |
| `obama-timeline.html` | Older Obama page, no site nav | **Orphan, superseded** by `obama-full-record.html` | **Nothing** |
| `dfars-2027-gulf-coast-report.html` | "DFARS 2027 Compliance Brief — Gulf Coast Defense Corridor". Different design and topic, no nav. | **Orphan, off-brand.** Looks like it belongs to a different project. | **Nothing** |

### Backend (Netlify Functions)

| Function | What it does | Env var |
|---|---|---|
| `netlify/functions/congress.js` | Pass-through proxy to `api.congress.gov/v3`. Accepts either `?path=...` or a path suffix. Adds the API key. | `CONGRESS_API_KEY` |
| `netlify/functions/claude.js` | Pass-through proxy to `api.anthropic.com/v1/messages`. Forwards the request body **unchanged**. | `ANTHROPIC_API_KEY` |

`netlify.toml` sets only the functions directory. There's no build command and no `publish` setting, so the publish directory depends on whatever is configured in the Netlify UI.

---

## 3. Inventory: Congress tracker features (`congress.html`)

| Tab / feature | Data source | Status |
|---|---|---|
| Header stats (Tracked, GOP Avg, Live Scored) and stat boxes | Live | Works |
| **Tracker**: search, party/chamber filter, sort | Live | Works. Senators and non-R members show the default score, though. |
| **Half-Asses (RINOs)**: bottom 25 Republicans | Live | Works for House. Unscored senators sit at 72 mixed into the list. |
| **Heroes**: top 25 Republicans | Live | Same caveat |
| **My Reps**: ZIP lookup | zippopotam.us plus the live roster | **Likely broken** (§4.1). Also matches by *state*, not district. |
| **AI Analysis**: "Intel Brief" | Claude via `claude.js` | Works if the key is set. Fails silently (shows "No response."). |
| **Contact modal**: AI letter draft, contact links | Claude plus roster | Draft works. **Website link likely wrong** (§4.1). Phone is never shown. |
| **Key Votes**: 8 votes, live breakdown on click | Live | Works. List is hardcoded and duplicated. |
| **Obstructors** | Live (derived) | **Half-broken** (§4.1) |
| **Supreme Court**: 9 justices, modal | Static | Works. Hand-maintained. |
| **DOGE Report**: Scorecard / Agencies / Congressional Support | Static, plus the live loyalty score | Scorecard and Agencies work. **Congressional Support is half-built** (§4.2). |
| **Governors**: all 50, Goobs / Patriots views | Static | Works. **Data is going stale** (§4.3). |
| **Media Scorecard**: 25 outlets, filters, modal | Static | Works. Hand-maintained. |
| Stripe support bar ($3/mo, $5 one-time) | Hardcoded Stripe links | Present on `congress.html` only, not on any other page |

---

## 4. What's half-built or broken

### 4.1 Bugs in the Congress tracker (from reading the code)

Items marked *likely* depend on the Congress.gov response shape and should be confirmed against a live response.

1. **Only House Republicans are ever scored.**
   - `backgroundScore` skips anyone whose `voteParty !== "R"` (`congress.html:2731`).
   - It only fetches `house-vote` endpoints. The Senate has no equivalent in the Congress.gov API.
   - Result: **all senators, all Democrats and all Independents always show 72 or 8**. Nothing tells the user those numbers are placeholders, apart from the absence of a "LIVE" tag.
2. **Obstructors tab: the Democrats half can never fill.**
   - The tab only includes Democrats who are `liveScored` (`congress.html:2308-2313`). Per item 1, no Democrat ever is.
   - So "DEMS BLOCKING" is always **0**, and the "Democrats Only" filter is always empty.
3. **Obstructors "×AGAINST" counts are estimates, not real counts.**
   - The count is back-calculated as `|score − 72| / 8` (`congress.html:2316-2322`).
   - The banner right above it says *"verified votes against … sourced from official Congressional records"* (`congress.html:2355`). That claim doesn't match the code.
4. **My Reps is likely broken.**
   - The code compares the ZIP's two-letter state (`"FL"`) against `m.state` (`congress.html:1050`).
   - Congress.gov's member list returns **full state names** (`"Florida"`). That's also why the code falls back to `STATE_MAP[m.state] || m.state` everywhere.
   - If that's right, every lookup will say "No members found for state FL."
   - Even if it worked, it returns every member from the state (both senators and the whole House delegation), not the visitor's own representative.
5. **The Contact modal's "Website" link likely points at the raw API.**
   - It uses `member.url` (`congress.html:817`). In the member-list response, that field is the Congress.gov **API** URL for the member, not their official site.
   - Clicking it would give an API-key error.
   - `phone` / `officialPhone` aren't in the list response either, so the phone link never appears.
6. **The governor website doesn't appear in the modal.** Governors are passed with a `website` field (`congress.html:2901`), but the modal only reads `url` or `officialWebsiteUrl`.
7. **Silent failures:**
   - A member-load failure leaves an empty tracker with no message (`congress.html:2661`).
   - A Claude error shows "No response." (`congress.html:780`).
   - A vote-breakdown error only logs to the console (`congress.html:2462`).
8. **The loading text is off.** It shows "Loading members (1/2)…", then "(2/2)", then "(3/3)" (`congress.html:2647-2657`).
9. **The Claude model is pinned** to `claude-sonnet-4-20250514` in the browser (`congress.html:774`). Check whether that model is still available, and move the model choice server-side (see §6).

### 4.2 Built but not wired up

- **`DOGE_CONGRESS_VOTES` is defined and never used** (`congress.html:1648-1651`). The DOGE "Congressional Support" view doesn't use DOGE votes at all. It re-sorts the general loyalty score (`congress.html:1795-1809`), and its own disclaimer says support is "inferred". Its "Top DOGE Obstructors" list is always empty for the same reason as §4.1 item 2.
- **The Flyover America tip CTA has no way to submit a tip.** The "Know a Town That Deserves to Be Here?" section invites tips (`flyover-america.html:563`) but has no form, no email, and no link.

### 4.3 Content that is stale or will go stale

- **The 120th Congress starts Jan 3, 2027.** `congress=119` and the 119th-Congress roll calls are hardcoded. After that date the roster and scores will be wrong until someone edits the file.
- **Governors:**
  - Virginia still lists **Glenn Youngkin**. His term ended in January 2026. New Jersey was updated to Mikie Sherrill in the same period, so the list is inconsistent.
  - **36 governorships are on the ballot Nov 3, 2026**, so this table needs a pass in January 2027.
- **DOGE data:** "Last updated: Jan 2026".
- **Key-vote labels need checking against Clerk records.** One looks like a placeholder: `"H.Res.1075 — Conservative Priority"` (`congress.html:2420, 2693`) has a generic description. Roll numbers and dates haven't been cross-checked.
- **`scotus.html`** lists "2024-2025: Chevron overturned (Loper Bright)". That decision was June 2024.

### 4.4 "Coming Soon" / "In Development" placeholders (17)

**Museum (13):**
- The Clinton Record
- The Federal Reserve & the Wealth Transfer
- Voter Fraud Tracker
- Congressional Portfolio Watch
- Infrastructure Vulnerability
- Satellite & Space Watch
- The 2016 Predicate
- Rural Resource Extraction
- The Opioid Distribution Network
- Military Industrial Complex
- Supply Chain Watch
- Technology & Data Exposure
- The Media Record

**Flyover America (4):**
- 002 Coal Extraction Compact
- 003 NAFTA's Ground Zero
- 004 Opioid Distribution Map
- 005 The Consolidation

**Stubs:**
- `scotus.html`: "Full case-by-case tracker … coming soon". The Congress tracker already has a fuller SCOTUS tab.
- `congress-restored.html`: "Full detailed tracker coming soon". Superseded by `congress.html`.

### 4.5 Markup and navigation leftovers

- **A nav block was pasted inside a `<style>` tag** in `suspicious-deaths.html:29-37`. It doesn't render, but the browser's CSS error recovery likely discards the next rule (`.rule-thick`). It also links to `crowley-county.html` with relative paths that don't exist anywhere else in the live nav.
- **Commented-out duplicate nav plus paste instructions** ("Add this right after `<body>` … tag in every new HTML file") ship to visitors in:
  - `trump-timeline.html:404-420`
  - `deindustrialization-timeline.html`
  - `suspicious-deaths.html`
  - `wef-globalist-agenda.html`
- **The nav is inconsistent.**
  - The universal nav is Museum / Congress / Timeline / Flyover / Mirror / Standard.
  - `index.html` uses its own nav without Flyover or Mirror.
  - `congress.html` has no site nav; only the logo links home.
  - `obama-timeline.html` and `dfars-…html` have no nav at all.
- **Crowley County isn't in the nav.** It was removed and restored several times in the history. It's only reachable through Flyover America.
- **`museum.html:851` and `save-america-act.html` link to `/congress`** with no `.html`. That works on Netlify's pretty URLs, but every other page uses `/congress.html`.
- **`scotus.html`** has a leftover `.nav` CSS block from an older design and loads the Cinzel font twice.

---

## 5. Test coverage

**There are no tests.** There's no test runner, no `package.json`, no CI workflow (`.github/` doesn't exist), no linter, no HTML validator and no link checker. Every deploy is checked by hand on the live site. The history shows this: there are several "FORCE REDEPLOY", "Revert broken home link" and "Fix nav link visibility" commits within a few hours.

| Area | Has tests? | Risk if it breaks | Suggested first test |
|---|---|---|---|
| `congress.js` proxy (URL building, missing key, error path) | No | Whole tracker is down | Unit test the handler with a mocked `https.get` |
| `claude.js` proxy | No | AI features down, or abused (§6) | Unit test: rejects non-POST, missing key, disallowed model |
| Scoring math (`backgroundScore`: +6 / −10 / −3, clamp 0-100) | No | Wrong public scores attached to real people's names | Pull out a pure `scoreMembers(votes, keyVotes)` and test it against fixture JSON |
| `detectChamber`, `normalizeParty`, member dedupe | No | Members put in the wrong chamber or party | Unit tests with recorded Congress.gov fixtures |
| My Reps lookup | No | Already likely broken (§4.1) | Fixture test: ZIP → state → members |
| Obstructors / DOGE derived lists | No | Already half-empty (§4.1) | Fixture test |
| `KEY_VOTES` vs `KEY_VOTES_LIBRARY` agree | No | Methodology page doesn't match the real math | One assertion test, or merge them into a single list |
| All 18 pages: internal links resolve | No | 404s (e.g. `scotus.html` was created to patch one) | Link checker in CI |
| HTML validity (stray markup like §4.5) | No | Silent styling breakage | `html-validate` in CI |
| Pages render (smoke) | No | Blank page after a bad push | Playwright: load each page, check `<h1>` and no console errors |
| Congress tracker loads members end-to-end | No | Blank tracker | Playwright against `netlify dev` with fixture-backed functions |

---

## 6. Security, operations and SEO gaps

### Security

- **`claude.js` is an open relay to the Anthropic API.**
  - It forwards any POST body unchanged, with `Access-Control-Allow-Origin: *`.
  - There's no auth, no rate limit, and no restriction on model or `max_tokens`.
  - Anyone can use the site's key for anything.
  - **Fix:** build the prompt server-side from a small allowed set of inputs (member id, issue, brief type). Fix the model and token cap. Add basic rate limiting and an origin check.
- **`congress.js` is an open proxy to any Congress.gov path**, also with CORS `*`. That's lower risk (read-only public data), but anyone can use up the site's 5,000-per-hour quota.

### Operations

- **No caching layer.** A scheduled Netlify function, or `Cache-Control` / Netlify on-demand caching on `congress.js` responses, would cut Congress.gov calls from 11 per visitor to a few per hour. It would also allow score history.
- **Babel-standalone in production.** It's about 3 MB of JavaScript, plus JSX compilation on every load. A tiny build step (esbuild) would remove both.
- **The repo history is shallow.** This clone only has the 50 most recent commits, all from 2026-05-22, so earlier history wasn't reviewed.
- **No `publish` directory in `netlify.toml`.** Deploy behavior depends on the Netlify UI settings.

### SEO / sharing

- No page has a `<meta name="description">` or Open Graph / Twitter tags, so links shared on social media show no preview.
- There's no `favicon`, `robots.txt`, `sitemap.xml` or custom `404.html`.
- There's no analytics, so there's no visibility into traffic or into which pages are used.

---

## 7. Suggested priority order

1. **Lock down `claude.js`**: prompts built server-side, fixed model, token cap, rate limit.
2. **Plan the 120th Congress cutover before Jan 3, 2027**: make the Congress number a single constant and pick the new key votes.
3. **Fix tracker correctness:**
   - My Reps state matching
   - Website link
   - The Obstructors "verified" claim, or score Democrats too
   - Label unscored members as "not yet scored" instead of showing 72 / 8
4. **Add caching** for Congress.gov responses. A daily or hourly snapshot would also enable score history.
5. **Add a minimal CI:** link check, HTML validation, a Playwright smoke test of every page, and unit tests for the scoring function.
6. **Clean up pages:**
   - Delete or redirect `congress-restored.html`, `scotus.html` and `obama-timeline.html`
   - Move `dfars-2027-…` out if it belongs to another project
   - Remove the pasted nav comments and the `<style>`-embedded nav
   - Unify the nav, including Crowley County
7. **Refresh content:** Governors (Virginia now; all of them after the November 2026 election), DOGE stats, and checking key-vote labels against Clerk records.
8. **Give the Flyover America tip CTA a real submission path**, and add meta / OG tags across all pages.
