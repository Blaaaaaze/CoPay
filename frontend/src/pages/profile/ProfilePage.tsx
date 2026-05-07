import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api, uploadAvatar } from "../../shared/api/client";
import { useAuth, type AuthUser } from "../../app/auth/AuthContext";
import { useI18n } from "../../shared/i18n/I18nContext";
import { copyToClipboard } from "../../shared/lib/copyToClipboard";
import { normalizeMediaUrl } from "../../shared/lib/mediaUrl";
import { showToast } from "../../shared/ui/toast";
import styles from "../FormPage.module.css";

export function ProfilePage() {
  const { token, setSession } = useAuth();
  const { t } = useI18n();
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await api<AuthUser>("/api/me", { token });
        if (cancelled) return;
        setProfile(p);
        setAvatarBroken(false);
        setDisplayName(p.displayName || "");
        setLastName(p.lastName || "");
        setEmail(p.email || "");
        setPhone(p.phone || "");
      } catch {
        if (!cancelled) setProfile(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErr("");
    setOk("");
    setLoading(true);
    try {
      const p = await api<AuthUser>("/api/me", {
        method: "PATCH",
        token,
        body: JSON.stringify({
          displayName: displayName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      });
      setProfile(p);
      setAvatarBroken(false);
      setSession(token, p);
      setOk(t("profile.saved"));
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  async function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !token) return;
    setErr("");
    setOk("");
    setLoading(true);
    try {
      await uploadAvatar(token, f);
      const p = await api<AuthUser>("/api/me", { token });
      setProfile(p);
      setAvatarBroken(false);
      setSession(token, p);
      setOk(t("profile.photoOk"));
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("profile.uploadErr"));
    } finally {
      setLoading(false);
    }
    e.target.value = "";
  }

  async function copyCode() {
    const code = profile?.inviteCode;
    if (!code) return;
    const ok = await copyToClipboard(code);
    if (ok) showToast(t("common.copied"));
    else setErr(t("common.error"));
  }

  const avatarSrc =
    normalizeMediaUrl(profile?.avatarUrl ?? undefined) ?? profile?.avatarUrl;

  return (
    <div className="container page-hero">
      <h1 className="page-title">{t("profile.title")}</h1>
      <p className={styles.subtle}>
        <Link to="/rooms">{t("nav.rooms")}</Link>
      </p>

      {profile && (
        <div className="card" style={{ maxWidth: "48rem", marginBottom: "1.5rem" }}>
          <h2 className={styles.cardTitle}>{t("profile.inviteTitle")}</h2>
          <p className="section-text" style={{ marginBottom: "0.75rem" }}>
            {t("profile.inviteText")}
          </p>
          <p
            style={{
              fontSize: "1.35rem",
              fontWeight: 800,
              letterSpacing: "0.12em",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            {profile.inviteCode}
          </p>
          <button type="button" className="btn-ghost" onClick={copyCode}>
            {t("profile.copyCode")}
          </button>
        </div>
      )}

      <div
        className="card form-grid-2"
        style={{ maxWidth: "48rem", marginBottom: "1.5rem", alignItems: "start" }}
      >
        <div className="full-span">
          <h2 className={styles.cardTitle}>{t("profile.avatar")}</h2>
        </div>
        {avatarSrc && !avatarBroken && (
          <div className="full-span">
            <img
              src={avatarSrc}
              alt=""
              width={120}
              height={120}
              onError={() => setAvatarBroken(true)}
              style={{
                borderRadius: 16,
                objectFit: "cover",
                marginBottom: "0.75rem",
                display: "block",
              }}
            />
          </div>
        )}
        <label className={`${styles.fileLabel} full-span`}>
          <input type="file" accept="image/*" onChange={onAvatar} disabled={loading} />
          {t("profile.uploadPhoto")}
        </label>
      </div>

      <form className="card form-grid-2" onSubmit={saveProfile} style={{ maxWidth: "48rem" }}>
        <h2 className={`${styles.cardTitle} full-span`}>{t("profile.data")}</h2>
        {err && (
          <p className={`err full-span`} style={{ margin: 0 }}>
            {err}
          </p>
        )}
        {ok && (
          <p className={`ok full-span`} style={{ margin: 0 }}>
            {ok}
          </p>
        )}
        <label>
          {t("profile.firstName")}
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </label>
        <label>
          {t("profile.lastName")}
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </label>
        <label className="full-span">
          {t("profile.email")}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="full-span">
          {t("profile.phone")}
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <div className="full-span">
          <button type="submit" className="btn-primary" disabled={loading}>
            {t("common.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
