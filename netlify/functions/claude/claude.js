// Generates the two AI features on congress.html: a constituent letter and the
// "Intel Brief". The page sends only structured inputs; this function builds the
// prompt and pins the model and token caps, so the endpoint cannot be used as a
// general-purpose proxy to the Anthropic API.
const crypto = require("crypto");
const Anthropic = require("@anthropic-ai/sdk");
const { connectLambda, getStore } = require("@netlify/blobs");
const GOVERNORS = require("./governors.json");

const MODELS = { sonnet: "claude-sonnet-4-20250514", haiku: "claude-haiku-4-5" };
const MODEL = MODELS.sonnet; // switch to MODELS.haiku to cut cost
const MAX_TOKENS = { letter: 500, brief: 800 };
const MAX_BODY_BYTES = 1024;
const RATE_LIMIT = { perIp: 10, windowMs: 10 * 60 * 1000, perDay: 1000 };
const MEMBER_CACHE_MS = 7 * 24 * 60 * 60 * 1000;

// Must match ISSUES in congress.html (checked by tests/claude.test.js).
const ISSUES = [
  "Immigration & Border Security",
  "Government Spending & Debt",
  "Second Amendment",
  "Energy & Fossil Fuels",
  "Election Integrity",
  "Foreign Aid",
  "China Policy",
  "Crime & Law Enforcement",
  "Healthcare Policy",
  "Trade & Tariffs",
];

const BIOGUIDE_ID = /^[A-Z][0-9]{6}$/;
// Roster names as Congress.gov formats them, e.g. "Ocasio-Cortez, Alexandria" or "Smith, John A., Jr."
const MEMBER_NAME = /^[\p{L}\p{M}][\p{L}\p{M} .,'-]{0,59}$/u;
const GOVERNOR_BY_CODE = Object.fromEntries(GOVERNORS.map(g => [g.code, g]));

// ── RESPONSES ─────────────────────────────────────────────────────────────────
function reply(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
  };
}

// ── INPUT VALIDATION ──────────────────────────────────────────────────────────
class ValidationError extends Error {}

function check(condition, message) {
  if (!condition) throw new ValidationError(message);
}

function rejectUnknown(obj, allowed, where) {
  const unknown = Object.keys(obj).filter(k => !allowed.includes(k));
  if (unknown.length) throw new ValidationError(`Unknown field in ${where}: ${unknown.join(", ")}`);
}

const isPlainObject = v => v !== null && typeof v === "object" && !Array.isArray(v);
const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

function validateRankedList(list, where) {
  check(Array.isArray(list) && list.length <= 5, `${where} must be a list of up to 5 members`);
  for (const entry of list) {
    check(isPlainObject(entry), `${where} entries must be objects`);
    rejectUnknown(entry, ["name", "score"], where);
    check(typeof entry.name === "string" && MEMBER_NAME.test(entry.name), `${where} has an invalid name`);
    check(isInt(entry.score, 0, 100), `${where} has an invalid score`);
  }
}

// Returns the input if it is a well-formed request; throws ValidationError otherwise.
function validate(input) {
  check(isPlainObject(input), "Request body must be a JSON object");

  if (input.type === "letter" && "governorState" in input) {
    rejectUnknown(input, ["type", "issue", "governorState"], "letter");
    check(ISSUES.includes(input.issue), "Unknown issue");
    check(typeof input.governorState === "string" && Object.hasOwn(GOVERNOR_BY_CODE, input.governorState), "Unknown governor");
    return input;
  }
  if (input.type === "letter") {
    rejectUnknown(input, ["type", "issue", "bioguideId", "score"], "letter");
    check(ISSUES.includes(input.issue), "Unknown issue");
    check(typeof input.bioguideId === "string" && BIOGUIDE_ID.test(input.bioguideId), "Invalid member id");
    check(isInt(input.score, 0, 100), "Score must be a whole number from 0 to 100");
    return input;
  }
  if (input.type === "brief") {
    rejectUnknown(input, ["type", "total", "republicans", "live", "avg", "top", "bottom"], "brief");
    check(isInt(input.total, 0, 1000), "Invalid total");
    check(isInt(input.republicans, 0, 1000) && input.republicans <= input.total, "Invalid republican count");
    check(isInt(input.live, 0, 1000) && input.live <= input.total, "Invalid live count");
    check(isInt(input.avg, 0, 100), "Invalid average");
    validateRankedList(input.top, "top");
    validateRankedList(input.bottom, "bottom");
    return input;
  }
  throw new ValidationError("Unknown request type");
}

// ── RATE LIMITING ─────────────────────────────────────────────────────────────
// Counters live in Netlify Blobs. Reads and writes are not atomic, so bursts can
// slip a few requests past the limit; the per-day cap bounds total spend either way.
// Returns null if the request may proceed, or which limit it hit.
async function checkRateLimit(store, ip, now) {
  const window = Math.floor(now / RATE_LIMIT.windowMs);
  const day = new Date(now).toISOString().slice(0, 10);
  const ipKey = "ratelimit/ip/" + crypto.createHash("sha256").update(ip).digest("hex");

  const [ipRecord, dayRecord] = await Promise.all([
    store.get(ipKey, { type: "json" }),
    store.get("ratelimit/day", { type: "json" }),
  ]);
  const ipCount = ipRecord && ipRecord.window === window ? ipRecord.count : 0;
  const dayCount = dayRecord && dayRecord.day === day ? dayRecord.count : 0;

  if (ipCount >= RATE_LIMIT.perIp) return "ip";
  if (dayCount >= RATE_LIMIT.perDay) return "day";

  await Promise.all([
    store.setJSON(ipKey, { window, count: ipCount + 1 }),
    store.setJSON("ratelimit/day", { day, count: dayCount + 1 }),
  ]);
  return null;
}

// ── NAME LOOKUPS ──────────────────────────────────────────────────────────────
function cleanName(name) {
  return String(name || "").replace(/[^\p{L}\p{M} .,'-]/gu, "").slice(0, 80).trim();
}

async function fetchMember(bioguideId) {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) throw new Error("CONGRESS_API_KEY not set");
  const url = `https://api.congress.gov/v3/member/${bioguideId}?format=json&api_key=${apiKey}`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(`Congress.gov returned ${resp.status}`);
  const { member } = await resp.json();
  if (!member) return null;

  const parties = member.partyHistory || [];
  const party = (parties[parties.length - 1] || {}).partyAbbreviation || "";
  let terms = member.terms || [];
  if (!Array.isArray(terms)) terms = terms.item || [];
  const chamber = ((terms[terms.length - 1] || {}).chamber || "").includes("Senate") ? "Senate" : "House";
  return {
    name: cleanName(member.directOrderName || `${member.firstName || ""} ${member.lastName || ""}`),
    party: party === "R" || party === "D" ? party : "I",
    state: cleanName(member.state),
    chamber,
  };
}

// Looks up a member, using the Blobs store as a cache. A cache failure falls
// back to Congress.gov rather than failing the request.
async function lookupMember(store, fetcher, bioguideId, now) {
  const key = "member/" + bioguideId;
  const cached = await store.get(key, { type: "json" }).catch(() => null);
  if (cached && now - cached.fetchedAt < MEMBER_CACHE_MS) return cached.member;
  const member = await fetcher(bioguideId);
  if (member) await store.setJSON(key, { member, fetchedAt: now }).catch(() => {});
  return member;
}

// ── PROMPTS ───────────────────────────────────────────────────────────────────
const PARTY_LABEL = { R: "Republican", D: "Democrat", I: "Independent" };

function buildLetterPrompt({ name, party, state, title, issue, score }) {
  const stance = score >= 60 ? "conservative loyalty" : score >= 35 ? "mixed record" : "frequent opposition to conservative priorities";
  const role = title === "Governor" ? "governor" : "member";
  return (
    `Write a firm but respectful constituent letter to ${title} ${name}, ${PARTY_LABEL[party] || "Independent"} from ${state}, regarding ${issue}. ` +
    `This ${role} has a RINO Report loyalty score of ${score}/100, indicating ${stance}. ` +
    `If they are a Republican with a low score, call them out specifically for not representing conservative values. ` +
    `Keep it under 250 words. Be direct. Sign off as "A Concerned Constituent." ` +
    `Reply with the letter only.`
  );
}

function buildBriefPrompt({ total, republicans, live, avg, top, bottom }) {
  const list = members => members.map(m => `${m.name} (${m.score})`).join(", ") || "none";
  return (
    `You are a conservative political analyst for RINO Report, a congressional loyalty tracker. ` +
    `Generate a sharp, direct intelligence brief about the current state of the Republican party in Congress. ` +
    `Data: ${total} total members tracked, ${republicans} Republicans, avg GOP loyalty score ${avg}/100, ` +
    `${live} members with live vote data. ` +
    `Top patriots: ${list(top)}. Biggest RINOs: ${list(bottom)}. ` +
    `Write 3-4 punchy paragraphs. Call out sellouts by name. Be direct, not diplomatic. No fluff. ` +
    `End with one actionable recommendation for conservative voters.`
  );
}

// Resolves a validated request into the prompt to send. Returns null if the
// referenced member does not exist. The brief path never calls Congress.gov.
async function buildPrompt(input, lookup) {
  if (input.type === "brief") return buildBriefPrompt(input);
  if (input.governorState) {
    const gov = GOVERNOR_BY_CODE[input.governorState];
    return buildLetterPrompt({ name: cleanName(gov.name), party: gov.party, state: gov.state, title: "Governor", issue: input.issue, score: gov.score });
  }
  const member = await lookup(input.bioguideId);
  if (!member) return null;
  const title = member.chamber === "Senate" ? "Senator" : "Representative";
  return buildLetterPrompt({ ...member, title, issue: input.issue, score: input.score });
}

// ── HANDLER ───────────────────────────────────────────────────────────────────
// Dependencies are injected so tests can run without network or Netlify Blobs.
function createHandler({ anthropic, fetchMember: fetcher, storeFor, now }) {
  return async function handler(event) {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: { Allow: "POST, OPTIONS" }, body: "" };
    if (event.httpMethod !== "POST") return reply(405, { error: "Method not allowed" }, { Allow: "POST, OPTIONS" });

    const raw = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : event.body || "";
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return reply(413, { error: "Request too large" });

    let input;
    try {
      input = validate(JSON.parse(raw));
    } catch (e) {
      if (e instanceof SyntaxError) return reply(400, { error: "Invalid JSON" });
      if (e instanceof ValidationError) return reply(400, { error: e.message });
      throw e;
    }

    const headers = event.headers || {};
    const ip = headers["x-nf-client-connection-ip"] || "unknown";
    let store, limited;
    try {
      store = storeFor(event);
      limited = await checkRateLimit(store, ip, now());
    } catch (e) {
      console.error("Rate limit store unavailable:", e);
      return reply(503, { error: "Service temporarily unavailable. Please try again later." });
    }
    if (limited === "ip") return reply(429, { error: "Too many requests. Please try again in a few minutes." });
    if (limited === "day") return reply(429, { error: "Daily limit reached. Please try again tomorrow." });

    let prompt;
    try {
      prompt = await buildPrompt(input, id => lookupMember(store, fetcher, id, now()));
    } catch (e) {
      console.error("Member lookup failed:", e);
      return reply(502, { error: "Could not look up member details. Please try again later." });
    }
    if (!prompt) return reply(400, { error: "Unknown member" });

    // Upstream failures are logged here and never passed through to the caller.
    try {
      const response = await anthropic().messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS[input.type],
        messages: [{ role: "user", content: prompt }],
      });
      const text = response.content.filter(b => b.type === "text").map(b => b.text).join("");
      if (response.stop_reason === "refusal" || !text) return reply(502, { error: "No text was generated. Please try again." });
      return reply(200, { text });
    } catch (e) {
      console.error("Anthropic API error:", e);
      return reply(502, { error: "The AI service is unavailable. Please try again later." });
    }
  };
}

let client;
exports.handler = createHandler({
  anthropic: () => (client ||= new Anthropic({ timeout: 9000, maxRetries: 0 })),
  fetchMember,
  storeFor: event => {
    connectLambda(event);
    return getStore({ name: "claude-function", consistency: "strong" });
  },
  now: () => Date.now(),
});

exports.createHandler = createHandler;
exports.validate = validate;
exports.ISSUES = ISSUES;
exports.MODELS = MODELS;
exports.MODEL = MODEL;
exports.MAX_TOKENS = MAX_TOKENS;
exports.MAX_BODY_BYTES = MAX_BODY_BYTES;
exports.RATE_LIMIT = RATE_LIMIT;
