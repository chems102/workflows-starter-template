// NeuroTrade Binance Proxy — Cloudflare Worker
// Deploy at: https://workers.cloudflare.com (free tier: 100k req/day)

const BINANCE = 'https://api.binance.com';
const ALLOWED_PATHS = [
  '/api/v3/account',
  '/api/v3/order',
  '/api/v3/openOrders',
  '/api/v3/ticker/24hr',
  '/api/v3/klines',
  '/api/v3/time',
  '/api/v3/ping',
  '/api/v3/depth',
  '/api/v3/userDataStream',
  '/api/v3/ticker/price',
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-MBX-APIKEY',
};

export default {
  async fetch(request) {
    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Only allow Binance API paths
    const allowed = ALLOWED_PATHS.some(p => path.startsWith(p));
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Path not allowed' }), {
        status: 403,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // Forward to Binance
    const binanceUrl = BINANCE + path + url.search;
    const headers = {};
    
    // Forward API key header
    const apiKey = request.headers.get('X-MBX-APIKEY');
    if (apiKey) headers['X-MBX-APIKEY'] = apiKey;
    
    const fetchOptions = {
      method: request.method,
      headers,
    };

    // Forward body for POST/PUT
    if (['POST', 'PUT'].includes(request.method)) {
      fetchOptions.body = await request.text();
      headers['Content-Type'] = request.headers.get('Content-Type') || 'application/x-www-form-urlencoded';
    }

    try {
      const response = await fetch(binanceUrl, fetchOptions);
      const data = await response.text();
      
      return new Response(data, {
        status: response.status,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
  }
};
