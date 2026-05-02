exports.handler = async (event) => {
  const path = event.path;
  const apiKey = process.env.CONGRESS_API_KEY;

  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({error: "CONGRESS_API_KEY not set in Netlify env vars"}) };
  }

  // Your existing member proxy (keep if present)
  if (path.includes('/member')) {
    // your old code here...
    // FORCE REBUILD 2026-05-02  }

  if (path.includes('/house-member-votes')) {
    const identifier = event.queryStringParameters.identifier;
    if (!identifier) {
      return { statusCode: 400, body: JSON.stringify({error: "Missing identifier"}) };
    }

    try {
      const url = `https://api.congress.gov/v3/house-vote/${identifier}/member-votes?api_key=${apiKey}&format=json`;
      const res = await fetch(url);   // Native fetch should work on Netlify

      if (!res.ok) {
        return { statusCode: res.status, body: JSON.stringify({error: "Congress API failed", status: res.status}) };
      }

      const data = await res.json();
      return { statusCode: 200, body: JSON.stringify(data) };
    } catch (e) {
      return { statusCode: 500, body: JSON.stringify({error: e.message}) };
    }
  }

  return { statusCode: 404, body: 'Not found' };
};
