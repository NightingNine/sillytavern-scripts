// 只代理固定 GitHub App 的设备授权接口；不存储令牌，也不接触仓库内容。
const CLIENT_ID = 'Iv23liCdP6AKzGp5KhEY';
const DEVICE_URL = 'https://github.com/login/device/code';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';

const RESPONSE_HEADERS = Object.freeze({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
});

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: RESPONSE_HEADERS });
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: RESPONSE_HEADERS });
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

    const url = new URL(request.url);
    if (url.pathname !== '/device' && url.pathname !== '/token') return json({ error: 'not_found' }, 404);
    if (Number(request.headers.get('content-length') || 0) > 4096) return json({ error: 'payload_too_large' }, 413);

    let input;
    try {
      input = await request.json();
    } catch {
      return json({ error: 'invalid_json' }, 400);
    }

    const params = new URLSearchParams({ client_id: CLIENT_ID });
    if (url.pathname === '/token') {
      const deviceCode = typeof input.device_code === 'string' ? input.device_code : '';
      const refreshToken = typeof input.refresh_token === 'string' ? input.refresh_token : '';
      if (deviceCode && deviceCode.length <= 256) {
        params.set('device_code', deviceCode);
        params.set('grant_type', 'urn:ietf:params:oauth:grant-type:device_code');
      } else if (refreshToken && refreshToken.length <= 512) {
        params.set('refresh_token', refreshToken);
        params.set('grant_type', 'refresh_token');
      } else {
        return json({ error: 'invalid_request' }, 400);
      }
    }

    const upstream = await fetch(url.pathname === '/device' ? DEVICE_URL : TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'AUTO-Card-Cloud-Auth',
      },
      body: params,
    });

    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: RESPONSE_HEADERS,
    });
  },
};
