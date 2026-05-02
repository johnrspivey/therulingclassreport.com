const CG_KEY = "5lsDCFzIBQ60fA6ZAc8JBzcWRcJBn6WW5L5m3I0H";
const CG_BASE = "https://api.congress.gov/v3";

exports.handler = async function(event) {
  const path = event.queryStringParameters?.path || "";
  const params = { ...event.queryStringParameters };
  delete params.path;
  params.api_key = CG_KEY;
  params.format = "json";

  const queryString = new URLSearchParams(params).toString();
  const url = `${CG_BASE}/${path}?${queryString}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
