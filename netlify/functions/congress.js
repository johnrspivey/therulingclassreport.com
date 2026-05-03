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
    url = `https://api.congress.gov/v3/${apiPath}?${params}`;
  }
  // Path mode: /.netlify/functions/congress/house-vote/119/2/74/members
  else if (path.startsWith("/.netlify/functions/congress/")) {
    const apiPath = path.replace("/.netlify/functions/congress", "");
    url = `https://api.congress.gov/v3${apiPath}?api_key=${apiKey}&format=json`;
  } else {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request" }) };
  }

  try {
    const res = await fetch(url);
    const data = await res.text();
    return {
      statusCode: res.status,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: data,
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
