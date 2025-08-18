// netlify/functions/_lib/verify-jwt.js
import { createRemoteJWKSet, jwtVerify } from 'jose';

const ISSUER = process.env.AUTH0_ISSUER;   // deve finire con /
const AUD     = process.env.AUTH0_AUDIENCE; // es. https://bebclean.it/api

if (!ISSUER || !AUD) {
  console.warn('Missing AUTH0_ISSUER or AUTH0_AUDIENCE env vars');
}

const JWKS = createRemoteJWKSet(new URL('.well-known/jwks.json', ISSUER));

export async function verifyAccessToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const e = new Error('Missing bearer token');
    e.status = 401;
    throw e;
  }
  const token = authHeader.slice(7);
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: ISSUER,
    audience: AUD
  });
  // payload.sub, payload.email, ecc. (se presenti negli scope)
  return payload;
}

export function corsHeaders(origin) {
  return {
    'access-control-allow-origin': origin || '*',
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'authorization, content-type'
  };
}
