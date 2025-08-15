
const fetch = global.fetch;

exports.handler = async (event) => {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return { statusCode: 500, body: JSON.stringify({ error: "Missing STRIPE_SECRET_KEY" }) };
    const { acconto_eur, meta } = JSON.parse(event.body || "{}");
    const amount = Math.round(Number(acconto_eur || 0) * 100);
    if (!amount || amount < 50) {
      return { statusCode: 400, body: JSON.stringify({ error: "Importo acconto non valido" }) };
    }

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        mode: "payment",
        success_url: `${process.env.URL || "https://example.com"}/success.html`,
        cancel_url: `${process.env.URL || "https://example.com"}/prenota.html`,
        "line_items[0][price_data][currency]": "eur",
        "line_items[0][price_data][product_data][name]": "Acconto prenotazione B&B Clean (10% compenso partner)",
        "line_items[0][price_data][unit_amount]": String(amount),
        "line_items[0][quantity]": "1",
        "metadata[durata_ore]": meta && meta.durata_ore ? String(meta.durata_ore) : "",
        "metadata[km]": meta && meta.km ? String(meta.km) : "",
        "metadata[address]": meta && meta.address ? String(meta.address) : ""
      })
    });
    const data = await res.json();
    if (!res.ok) {
      return { statusCode: 502, body: JSON.stringify({ error: "Stripe error", details: data }) };
    }
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ url: data.url })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
