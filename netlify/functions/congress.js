// FORCE REBUILD 2026-05-02
exports.handler = async (event) => {
  const path = event.path;
  const apiKey = process.env.CONGRESS_API_KEY;

  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({error: "CONGRESS_API_KEY not set"}) };
  }

  if (path.includes('/member')) {
    // Keep your existing member proxy code here if you want
    const url = `https://api.congress.gov/v3${path.replace('/.netlify/functions/congress', '')}?api_key=${apiKey}`;
    const res = await fetch(url);
    return { statusCode: res.status, body: await res.text() };
  }  if (path.includes('/house-member-votes')) {
    const identifier = event.queryStringParameters.identifier;
    if (!identifier) {
      return { statusCode: 400, body: JSON.stringify({error: "Missing identifier"}) };
    }
    try {
      const url = `https://api.congress.gov/v3/house-vote/${identifier}/member-votes?api_key=${apiKey}&format=json`;
      const res = await fetch(url);
      const text = await res.text();  // get raw response for debug
      return { 
        statusCode: res.status, 
        body: JSON.stringify({ 
          status: res.status, 
          error: text.length > 500 ? text.substring(0, 500) + "..." : text 
        }) 
      };
    } catch (e) {
      return { statusCode: 500, body: JSON.stringify({error: e.message}) };
    }
  }    }
    try {
      const url = `https://api.congress.gov/v3/house-vote/${identifier}/member-votes?api_key=${apiKey}&format=json`;
      const res = await fetch(url);
      if (!res.ok) {
        return { statusCode: res.status, body: JSON.stringify({error: "Congress API error"}) };
      }
      const data = await res.json();
      return { statusCode: 200, body: JSON.stringify(data) };
    } catch (e) {
      return { statusCode: 500, body: JSON.stringify({error: e.message}) };
    }
  }

  return { statusCode: 404, body: 'Not found' };
};
