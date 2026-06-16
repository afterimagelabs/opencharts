// Cloudflare Pages Function: proxies tracking lookups to the records
// backend so the browser never sees the upstream hostname. Browser
// sees only opencharts.org URLs.
//
// Route: GET /api/track/:hash

interface Env {
  // Override default upstream by setting TRACKING_UPSTREAM in the
  // Pages project environment if the API ever moves.
  TRACKING_UPSTREAM?: string;
}

const HASH_RE = /^[A-Za-z0-9_-]{16,32}$/;

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const hash = String(params.hash ?? '');

  if (!HASH_RE.test(hash)) {
    return new Response(JSON.stringify({ error: 'not_found' }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }

  const base = env.TRACKING_UPSTREAM ?? 'https://portal.ezra.legal';
  const url = `${base}/api/public/records-request/${encodeURIComponent(hash)}`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      headers: { Accept: 'application/json' },
      cf: { cacheTtl: 0, cacheEverything: false } as any,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'upstream_unreachable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  const body = await upstream.text();

  return new Response(body, {
    status: upstream.status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
};
