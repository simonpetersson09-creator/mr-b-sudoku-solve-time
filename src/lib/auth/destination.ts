/** Only existing app pages may be selected as the post-auth destination. */
export function safeAuthDestination(value: unknown): string {
  return typeof value === "string" && ["/", "/profile", "/admin", "/settings", "/stats", "/setup", "/play", "/rules"].includes(value) ? value : "/";
}