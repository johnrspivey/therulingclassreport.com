// FORCE REBUILD 2026-05-02 v3
exports.handler = async (event) => {
 const path = event.path;
 const apiKey = process.env.CONGRESS_API_KEY;

 if (!apiKey) {
 return { statusCode: 500, body: JSON.stringify({error: "CONGRESS_API_KEY not set"}) };
 }

 // Proxy any Congress.gov path
 if (path.startsWith('/.netlify/functions/congress/')) {
 const apiPath = path.replace('/.netlify/functions/congress', '');
 const url = `https://api.congress.gov/v3${apiPath}?api_key=${apiKey}&format=json`;
 try {
 const res = await fetch(url);
 const data = await res.text();
 return { statusCode: res.status, body: data };
 } catch (e) {
 return { statusCode: 500, body: JSON.stringify({error: e.message}) };
 }
 }

 return { statusCode: 404, body: 'Not found' };
};
