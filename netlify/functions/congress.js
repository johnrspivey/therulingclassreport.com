// FORCE REBUILD 2026-05-02 v5
const https = require("https");

exports.handler = async (event) => {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "CONGRESS_API_KEY not set" }) };
  }

  const path = event.path;
  const qs = event.queryStringParameters || {};

  let url;

  if (qs.path) {
    const { path: apiPath, ...rest } = qs;
    const params = new URLSearchParams({ ...rest, api_key: apiKey, format: "json" });
    url = `https://api.congress.gov/v3/${apiPath}?${params}`;
  } else if (path.startsWith("/.netlify/functions/congress/")) {
    const apiPath = path.replace("/.netlify/functions/congress", "");
    url = `https://api.congress.gov/v3${apiPath}?api_key=${apiKey}&format=json`;
  } else {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request" }) };
  }

  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          body: data,
        });
      });
    }).on("error", (e) => {
      resolve({ statusCode: 500, body: JSON.stringify({ error: e.message }) });
    });
  });
};
