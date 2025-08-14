// netlify/functions/notify.js
// Invia email via Resend alla tua casella per nuove prenotazioni e candidature partner.
// Richiede: RESEND_API_KEY, NOTIFY_EMAIL nelle Environment variables Netlify.

const fetch = global.fetch;

function htmlFromObject(obj) {
  const safe = (v) => (v === undefined || v === null) ? "" : String(v);
  const rows = Object.entries(obj).map(([k, v]) => {
    return `<tr><td style="padding:6px 10px;background:#f6f8fa;border:1px solid #eaecef;"><b>${k}</b></td><td style="padding:6px 10px;border:1px solid #eaecef;">${safe(v)}</td></tr>`;
  }).join("");
  return `<table style="border-collapse:collapse;font-family:system-ui, -apple-system, Segoe UI, Roboto, Arial;font-size:14px;">${rows}</table>`;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, headers: { "Allow": "POST" }, body: "Method Not Allowed" };
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const TO = process.env.NOTIFY_EMAIL || "alessandrospanu92@gmail.com";
    if (!RESEND_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: "Missing RESEND_API_KEY" }) };
    }

    const body = JSON.parse(event.body || "{}");
    const type = body.type;                  // 'booking' | 'partner'
    const data = body.data || {};            // campi del form
    const estimate = body.estimate || null;  // per prenotazione: { acconto, km, durata, address, rate }

    let subject = "Notifica B&B Clean";
    let intro = "";
    let replyTo = undefined;

    if (type === "booking") {
      subject = "Nuova prenotazione — B&B Clean";
      intro = "<p>Hai ricevuto una nuova <b>prenotazione</b>.</p>";
      replyTo = data.email || undefined;
    } else if (type === "partner") {
      subject = "Nuova candidatura partner — B&B Clean";
      intro = "<p>Hai ricevuto una nuova <b>candidatura partner</b>.</p>";
      replyTo = data.email || undefined;
    } else {
      subject = "Nuova notifica — B&B Clean";
    }

    const estHtml = estimate ? `
      <h3>Stima</h3>
      ${htmlFromObject({
        "Tariffa partner (€/h)": estimate.rate,
        "Durata (ore)": estimate.durata,
        "Acconto (€)": estimate.acconto,
        "Distanza stimata (km)": estimate.km,
        "Indirizzo": estimate.address
      })}
    ` : "";

    const formHtml = `
      <h3>Dati inviati</h3>
      ${htmlFromObject(data)}
    `;

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;font-size:14px;color:#0b1220">
        ${intro}
        ${formHtml}
        ${estHtml}
        <p style="margin-top:20px;color:#6b7280">Email inviata automaticamente dal sito B&B Clean.</p>
      </div>
    `;

    // Invia email con Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "B&B Clean <onboarding@resend.dev>",   // per produzione potrai usare un dominio verificato
        to: [TO],
        subject,
        html,
        reply_to: replyTo
      })
    });

    const j = await res.json();
    if (!res.ok) {
      return { statusCode: 502, body: JSON.stringify({ error: "Resend error", details: j }) };
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: true, id: j.id })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
