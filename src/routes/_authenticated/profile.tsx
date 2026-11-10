import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { getMe, updateProfile } from "@/lib/backend/online.functions";
import { AVATARS, COUNTRIES, flag } from "@/lib/backend/profile-options";
import { loadProfileSnapshot, saveProfileSnapshot } from "@/lib/backend/snapshot";
import { useOwnAvatar } from "@/lib/player/avatar";
import { rememberProfileName, syncProfileName } from "@/lib/player/profile-name";
import { PlayerAvatar } from "@/components/app/PlayerAvatar";
import { errorMessage, useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Profil – Mr.B. Sokudo" },
      { name: "description", content: "Ditt spelarnamn, avatar och land." },
      { property: "og:title", content: "Profil – Mr.B. Sokudo" },
      { property: "og:description", content: "Ditt spelarnamn, avatar och land." },
    ],
  }),
  component: ProfilePage,
});

type Me = Awaited<ReturnType<typeof getMe>>;

function ProfilePage() {
  const { t } = useTranslation();
  const [me, setMe] = useState<Me | null>(null);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🧩");
  const [country, setCountry] = useState("SE");
  const own = useOwnAvatar();
  useEffect(() => {
    const apply = (m: Me) => { setMe(m); if (m.profile) { setName(m.profile.display_name); setAvatar(m.profile.avatar); setCountry(m.profile.country); } };
    const cached = loadProfileSnapshot(); if (cached) apply(cached);
    syncProfileName().then(() => getMe()).then(m => { saveProfileSnapshot(m); apply(m); }).catch(() => {});
  }, []);
  const save = async () => {
    try { await updateProfile({ data: { display_name: name, avatar, country } }); const fresh = await getMe(); rememberProfileName(fresh.userId, name.trim()); saveProfileSnapshot(fresh); setMe(fresh); toast.success(t("profileSaved")); }
    catch (e) { toast.error(errorMessage(e, t) || t("saveFailed")); }
  };
  return (
    <main className="app-screen">
      <div className="home-stack">
        <Link to="/settings" className="mb-2 flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft size={16} /> {t("back")}</Link>
        <h1 className="brand-title mb-3 text-3xl">{t("profileTitle")}</h1>
        {!me ? <p className="text-sm text-muted-foreground">{t("loading")}</p> : (<>
          <div className="mb-2">
            <PlayerAvatar emoji={avatar} image={own} className="h-14 w-14 rounded-full border border-border/60 bg-surface text-2xl" />
          </div>
          <label className="text-xs text-muted-foreground" htmlFor="pname">{t("playerName")}</label>
          <input id="pname" maxLength={20} className="h-11 rounded-[10px] border bg-card px-3 text-sm outline-none focus:border-gold" value={name} onChange={(e) => setName(e.target.value)} />
          <p className="mt-3 text-xs text-muted-foreground">{t("avatar")}</p>
          <div className="grid grid-cols-6 gap-[7px]">
            {AVATARS.map((a) => <button key={a} aria-label={`${t("avatar")} ${a}`} onClick={() => setAvatar(a)} className={`h-11 rounded-[10px] border text-xl ${a === avatar ? "border-gold bg-card" : "bg-surface"}`}>{a}</button>)}
          </div>
          <label className="mt-3 text-xs text-muted-foreground" htmlFor="country">{t("country")}</label>
          <select id="country" className="h-11 rounded-[10px] border bg-card px-3 text-sm" value={country} onChange={(e) => setCountry(e.target.value)}>
            {COUNTRIES.map((c) => <option key={c} value={c}>{flag(c)} {c}</option>)}
          </select>
          <button className="home-action home-action-gold mt-3" onClick={save}>{t("save")}</button>
        </>)}
      </div>
    </main>
  );
}
