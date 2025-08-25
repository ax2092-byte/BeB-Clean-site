// Verifica Access Token JWT (Auth0) via JWKS — usa jose
import { createRemoteJWKSet, jwtVerify } from 'jose';

const DOMAIN = process.env.AUTH0_DOMAIN;           // es. dev-xxxx.eu.auth0.com
const AUDIENCE = process.env.AUTH0_AUDIENCE || 'https://bebclean.it/api';

if (!DOMAIN) console.warn('[auth] Missing AUTH0_DOMAIN');
if (!AUDIENCE) console.warn('[auth] Missing AUTH0_AUDIENCE');

const JWKS = DOMAIN ? createRemoteJWKSet(new URL(`https://${DOMAIN}/.well-known/jwks.json`)) : null;

export async function verifyAccessToken(authorizationHeader) {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    throw Object.assign(new Error('Missing Bearer token'), { statusCode: 401 });
  }
  const token = authorizationHeader.slice('Bearer '.length);
  if (!JWKS) throw Object.assign(new Error('JWKS not configured'), { statusCode: 500 });

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://${DOMAIN}/`,
      audience: AUDIENCE
    });
    // payload.sub = user id (es. auth0|abc123)
    return payload;
  } catch (e) {
    throw Object.assign(new Error('Invalid token'), { statusCode: 401, detail: e.message });
  }
}

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  };
}

export function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(), ...extraHeaders },
    body: JSON.stringify(body)
  };
}
