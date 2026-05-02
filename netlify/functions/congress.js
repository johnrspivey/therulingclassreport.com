exports.handler = async (event) => {
  const path = event.path;
  const apiKey = process.env.CONGRESS_API_KEY;   // <-- Make sure this env var exists in Netlify

  // Keep your existing member code here if you want
  if (path.includes('/member')) {
    // your current code for members...
    return { statusCode: 200, body: "member proxy works" }; // placeholder
  }

  // === NEW CODE: ADD THIS BLOCK ===
  if (path.includes('/house-member-votes')) {
    const identifier = event.queryStringParameters.identifier;
    if (!identifier) {
      return { statusCode: 400, body: JSON.stringify({error: "Missing identifier"}) };
    }
    const url = `https://api.congress.gov/v3/house-vote/${identifier}/member-votes?api_key=${apiKey}&format=json`;
    const res = await fetch(url);  // use node-fetch if fetch doesn't work
    if (!res.ok) return { statusCode: res.status, body: "API error" };
    const data = await res.json();
    return { statusCode: 200, body: JSON.stringify(data) };
  }
  // === END NEW CODE ===

  return { statusCode: 404, body: 'Not found' };
};
