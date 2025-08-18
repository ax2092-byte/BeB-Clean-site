// netlify/functions/healthcheck.js
exports.handler = async () => {
  return { statusCode: 200, headers: { 'content-type': 'text/plain' }, body: 'ok' };
};
