
const fetch = global.fetch;

exports.handler = async (event) => {
  try {
    const { from, to } = JSON.parse(event.body || "{}");
    if (!from || !to) return { statusCode: 400, body: JSON.stringify({ error: "Missing coordinates" }) };

    const key = process.env.ORS_API_KEY;
    if (!key) return { statusCode: 500, body: JSON.stringify({ error: "Missing ORS_API_KEY" }) };

    const url = `https://api.openrouteservice.org/v2/directions/driving-car`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": key },
      body: JSON.stringify({ coordinates: [[from.lon, from.lat], [to.lon, to.lat]] })
    });
    if (!res.ok) {
      const t = await res.text();
      return { statusCode: 502, body: JSON.stringify({ error: "Route failed", details: t }) };
    }
    const data = await res.json();
    const sum = data.routes && data.routes[0] && data.routes[0].summary;
    if (!sum) return { statusCode: 502, body: JSON.stringify({ error: "No route summary" }) };
    const km = (sum.distance || 0) / 1000;
    const dur_min = (sum.duration || 0) / 60;
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ distance_km: km, duration_min: dur_min })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
