// JSON response helpers with sensible default headers for an API
// that returns hash-keyed timeline data and accepts authenticated
// writes. No caching, no MIME sniffing, no referrer leakage.

const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...DEFAULT_HEADERS, ...(init.headers as Record<string, string> | undefined) },
  });
}

export function jsonError(status: number, code: string, message?: string): Response {
  return jsonResponse({ error: code, ...(message ? { message } : {}) }, { status });
}
