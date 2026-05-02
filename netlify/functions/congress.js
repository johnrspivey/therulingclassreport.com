const CG_KEY = "5lsDCFzIBQ60fA6ZAc8JBzcWRcJBn6WW5L5m3I0H";
const CG_BASE = "https://api.congress.gov/v3";

exports.handler = async function(event) {
  const params = { ...event.queryStringParameters };
  const path = params.path || "";
  delete params.path;
  params.api_key = CG_KEY;
  params.format = "json";

  const queryString = new URLSearchParams(params).toString();
  const url = `${CG_BASE}/${path}?${queryString}`;

  console.log("Fetching:", url);

  try {
    const res = await fetch(url);
    const text = await res.text();
    return {
      statusCode: res.status,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: text
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
