// Secret-bearing field names only. Generic words such as "code", "key" or "auth" are left alone so
// diagnostic error codes (e.g. code=23505, err:rate_limited) stay readable.
const FIELDS = "access_token|refresh_token|id_token|token|apikey|api_key|x-api-key|client_secret|secret|password|passwd|pwd|pin|authorization|cookie|set-cookie|session";

/** Removes credentials, tokens and URL parameters while keeping the diagnostic shape. */
export function redactSensitive(text: string): string {
  return text
    // Authorization schemes (header values, quoted or not).
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, "$1 [redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted-jwt]")
    .replace(/\bsb_(?:publishable|secret)_[A-Za-z0-9_-]+/g, "[redacted-key]")
    // Credentials in URLs (user:pass@host) and query/fragment parameters.
    .replace(/\b(https?:\/\/)[^\s/@"']+@/gi, "$1[redacted]@")
    .replace(/\b(https?:\/\/[^\s?#"']+)[?#][^\s"']*/gi, "$1?[redacted]")
    // JSON / quoted fields: "password":"x", 'token': 'x', password="a b".
    .replace(new RegExp(`(["']?)\\b(${FIELDS})\\1(\\s*[=:]\\s*)(["'])(?:\\\\.|(?!\\4).)*\\4`, "gi"), "$1$2$1$3$4[redacted]$4")
    // Unquoted fields: password=x, token: x (already-redacted scheme values are kept).
    .replace(new RegExp(`\\b(${FIELDS})(\\s*[=:]\\s*)(?!["'\\[]|Bearer |Basic )[^\\s&"',;}]+`, "gi"), "$1$2[redacted]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]");
}
