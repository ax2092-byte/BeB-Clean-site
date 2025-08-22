exports.handler = async () => {
  const domain = process.env.AUTH0_DOMAIN;
  const client_id = process.env.AUTH0_MGMT_CLIENT_ID;
  const client_secret = process.env.AUTH0_MGMT_CLIENT_SECRET;
  const url = `https://${domain}/oauth/token`;
  const res = await fetch(url, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      client_id, client_secret,
      audience: `https://${domain}/api/v2/`,
      grant_type: 'client_credentials'
    })
  });
  if (!res.ok) return { statusCode:500, body: await res.text() };
  const js = await res.json();
  return { statusCode:200, body: JSON.stringify(js) };
};
