/** Next may reconstruct request.url with an internal hostname. Compare the
 * browser Origin to the actual HTTP Host authority, never a client bypass flag
 * or an arbitrary forwarded-host header. Browsers cannot set Host themselves. */
export function isBookingSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin"); const host = request.headers.get("host");
  if (!origin || !host || !/^[a-z0-9.\-:[\]]+$/i.test(host)) return false;
  try {
    const url = new URL(origin);
    return ["http:", "https:"].includes(url.protocol) && origin === url.origin
      && new URL(`${url.protocol}//${host}`).origin === url.origin;
  } catch { return false; }
}
