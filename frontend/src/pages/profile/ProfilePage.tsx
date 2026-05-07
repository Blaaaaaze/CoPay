import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api, uploadAvatar } from "../../shared/api/client";
import { useAuth, type AuthUser } from "../../app/auth/AuthContext";
import { useI18n } from "../../shared/i18n/I18nContext";
import { copyToClipboard } from "../../shared/lib/copyToClipboard";
import { normalizeMediaUrl } from "../../shared/lib/mediaUrl";
import { showToast } from "../../shared/ui/toast";
import { Button } from "../../ui/atoms/Button";
import { FileInput } from "../../ui/atoms/FileInput";
import { TextInput } from "../../ui/atoms/TextInput";
import { PageHero } from "../../ui/templates/PageHero";
import styles from "../FormPage.module.css";
import pageStyles from "./ProfilePage.module.css";

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
    <PageHero>
      <h1 className="page-title">{t("profile.title")}</h1>
      <p className={styles.subtle}>
        <Link to="/rooms">{t("nav.rooms")}</Link>
      </p>

      {profile && (
        <div className={`card ${pageStyles.panel48WithBottomGap}`}>
          <h2 className={styles.cardTitle}>{t("profile.inviteTitle")}</h2>
          <p className={`section-text ${pageStyles.inviteText}`}>
            {t("profile.inviteText")}
          </p>
          <p className={pageStyles.inviteCode}>
            {profile.inviteCode}
          </p>
          <Button type="button" variant="ghost" onClick={copyCode}>
            {t("profile.copyCode")}
          </Button>
        </div>
      )}

      <div
        className={`card form-grid-2 ${pageStyles.avatarPanel}`}
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
              className={pageStyles.avatarImg}
            />
          </div>
        )}
        <label className={`${styles.fileLabel} full-span`}>
          <FileInput accept="image/*" onChange={onAvatar} disabled={loading} />
          {t("profile.uploadPhoto")}
        </label>
      </div>

      <form className={`card form-grid-2 ${pageStyles.panel48}`} onSubmit={saveProfile}>
        <h2 className={`${styles.cardTitle} full-span`}>{t("profile.data")}</h2>
        {err && (
          <p className={`err full-span ${pageStyles.inlineMsgNoMargin}`}>
            {err}
          </p>
        )}
        {ok && (
          <p className={`ok full-span ${pageStyles.inlineMsgNoMargin}`}>
            {ok}
          </p>
        )}
        <label>
          {t("profile.firstName")}
          <TextInput
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </label>
        <label>
          {t("profile.lastName")}
          <TextInput value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </label>
        <label className="full-span">
          {t("profile.email")}
          <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="full-span">
          {t("profile.phone")}
          <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <div className="full-span">
          <Button type="submit" variant="primary" disabled={loading}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </PageHero>
  );
}
