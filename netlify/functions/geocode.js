// netlify/functions/geocode.js
// Geocoding con OpenRouteService (ENV: ORS_API_KEY)
const fetch = global.fetch;

function cors(){ return {
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"Content-Type",
  "Access-Control-Allow-Methods":"OPTIONS, POST"
};}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode:200, headers:cors(), body:'ok' };
  try {
    const { address } = JSON.parse(event.body || "{}");
    if (!address) return { statusCode: 400, headers:cors(), body: JSON.stringify({ error: "Missing address" }) };

    const key = process.env.ORS_API_KEY;
    if (!key) return { statusCode: 500, headers:cors(), body: JSON.stringify({ error: "Missing ORS_API_KEY" }) };

    const url = `https://api.openrouteservice.org/geocode/search?api_key=${encodeURIComponent(key)}&text=${encodeURIComponent(address)}&boundary.country=IT&size=1`;
    const res = await fetch(url);
    if (!res.ok) {
      const t = await res.text();
      return { statusCode: 502, headers:cors(), body: JSON.stringify({ error: "Geocode failed", details: t }) };
    }
    const data = await res.json();
    const f = data.features && data.features[0];
    if (!f) return { statusCode: 404, headers:cors(), body: JSON.stringify({ error: "Address not found" }) };
    const [lon, lat] = f.geometry.coordinates;
    return { statusCode: 200, headers:cors(), body: JSON.stringify({ lat, lon, label: f.properties.label || address }) };
  } catch (e) {
    return { statusCode: 500, headers:cors(), body: JSON.stringify({ error: e.message }) };
  }
};
