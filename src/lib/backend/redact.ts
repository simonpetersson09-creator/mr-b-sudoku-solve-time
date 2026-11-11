/** Removes credentials, tokens and URL parameters while keeping the diagnostic shape. */
export function redactSensitive(text: string): string {
  return text
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted-jwt]")
    .replace(/\bsb_(?:publishable|secret)_[A-Za-z0-9_-]+/g, "[redacted-key]")
    .replace(/\b(https?:\/\/[^\s?#"']+)[?#][^\s"']*/gi, "$1?[redacted]")
    .replace(/\b(token|access_token|refresh_token|apikey|api_key|key|secret|password|pin|code|auth)\s*[=:]\s*[^\s&"',;]+/gi, "$1=[redacted]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]");
}
