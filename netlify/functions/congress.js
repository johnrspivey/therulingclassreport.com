const CG_KEY = "5lsDCFzIBQ60fA6ZAc8JBzcWRcJBn6WW5L5m3I0H";
const CG_BASE = "https://api.congress.gov/v3";

export default async (request) => {
  const url = new URL(request.url);
  const path = url.searchParams.get("path") || "";
  url.searchParams.delete("path");
  url.searchParams.set("api_key", CG_KEY);
  url.searchParams.set("format", "json");

  const apiUrl = `${CG_BASE}/${path}?${url.searchParams.toString()}`;

  try {
    const res = await fetch(apiUrl);
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const config = { path: "/api/congress" };
