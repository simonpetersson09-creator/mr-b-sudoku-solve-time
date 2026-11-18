import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ensurePlayerSession } from "@/lib/auth/player";
import { adminPinLogin } from "@/lib/backend/online.functions";
import { errorMessage, useTranslation } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/admin-login")({
  head: () => ({ meta: [
    { title: "Administratörsåtkomst – Mr.B. Sudoku" },
    { name: "description", content: "Skyddad administratörsåtkomst till Mr.B. Sudoku." },
    { property: "og:title", content: "Administratörsåtkomst – Mr.B. Sudoku" },
    { property: "og:description", content: "Skyddad administratörsåtkomst till Mr.B. Sudoku." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }), component: AdminLogin,
});
function AdminLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
    <form className="w-full max-w-sm space-y-3" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError("");
      try {
        // The PIN unlocks admin for this device's own player identity; nothing is replaced.
        await ensurePlayerSession();
        await adminPinLogin({ data: { pin } });
        await qc.invalidateQueries();
        await navigate({ to: "/admin", replace: true });
      } catch (e) { setError(errorMessage(e, t)); }
      finally { setPin(""); setBusy(false); }
    }}>
      <h1 className="text-xl font-semibold">Admin</h1>
      <input name="admin-password" className="w-full rounded-md border border-border bg-card px-3 py-2" type="password" inputMode="numeric" pattern="[0-9]*" autoComplete="current-password" maxLength={12} aria-label="Adminnyckel" placeholder="Adminnyckel" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} required />
      <Button type="submit" className="w-full" disabled={busy || pin.length < 4}>{busy ? "Laddar…" : "Logga in"}</Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Link to="/" className="block text-center text-sm text-muted-foreground">Tillbaka</Link>
    </form>
  </div>;
}
