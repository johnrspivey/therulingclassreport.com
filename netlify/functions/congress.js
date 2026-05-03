// FORCE REBUILD 2026-05-02 v4
exports.handler = async (event) => {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "CONGRESS_API_KEY not set" }) };
  }

  const path = event.path;
  const qs = event.queryStringParameters || {};

  let url;

  // Query string mode: ?path=member&congress=119&chamber=house&limit=435&offset=0
  if (qs.path) {
    const { path: apiPath, ...rest } = qs;
    const params = new URLSearchParams({ ...rest, api_key: apiKey, format: "json" });
    url = `https://api.congress.gov/v3/${a
