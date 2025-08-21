// /.netlify/functions/geocode
// Chiamata: /.netlify/functions/geocode?q=Via%20Roma%201,%20Nuoro,%20Sardegna,%20Italia
// Risponde: { lat: 40.12, lon: 9.45, raw: {...} }

export async function handler(event) {
  try {
    const { q } = event.queryStringParameters || {};
    if (!q || q.trim().length < 3) {
      return json(400, { error: 'Parametro q mancante o troppo corto' });
    }

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('addressdetails', '0');
    url.searchParams.set('countrycodes', 'it');
    url.searchParams.set('q', q);

    const ua = 'BebBCleanSite/1.0 (Netlify Function; https://bebclean.it)';
    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': ua,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      return json(res.status, { error: 'Errore Nominatim', statusText: res.statusText });
    }
    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) {
      return json(404, { error: 'Indirizzo non trovato' });
    }
    const best = arr[0];
    const lat = parseFloat(best.lat);
    const lon = parseFloat(best.lon);
    if (isNaN(lat) || isNaN(lon)) {
      return json(502, { error: 'Coordinate non valide' });
    }

    return json(200, { lat, lon, raw: best });
  } catch (err) {
    return json(500, { error: 'Errore interno', detail: String(err && err.message || err) });
  }
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(body)
  };
}
