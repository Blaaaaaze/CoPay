import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../shared/api/client";
import { useAuth, type AuthUser } from "../../app/auth/AuthContext";
import { useI18n } from "../../shared/i18n/I18nContext";
import { Button } from "../../ui/atoms/Button";
import { TextInput } from "../../ui/atoms/TextInput";
import { PageHero } from "../../ui/templates/PageHero";
import styles from "../FormPage.module.css";
import pageStyles from "./AuthPages.module.css";

type RegResp = { token: string; user: AuthUser };

export function RegisterPage() {
  const { setSession } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const data = await api<RegResp>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          displayName: displayName.trim(),
          lastName: lastName.trim(),
          password,
        }),
      });
      setSession(data.token, data.user);
      nav("/rooms");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("register.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageHero>
      <h1 className="page-title">{t("register.title")}</h1>
      <form className={`card form-grid-2 ${pageStyles.registerForm}`} onSubmit={submit}>
        {err && (
          <p className={`err full-span ${pageStyles.inlineMsgNoMargin}`}>
            {err}
          </p>
        )}
        <label>
          {t("register.firstName")}
          <TextInput value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        </label>
        <label>
          {t("register.lastName")}
          <TextInput value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </label>
        <label className="full-span">
          {t("register.email")}
          <TextInput
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="full-span">
          {t("register.password")}
          <TextInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            autoComplete="new-password"
            required
          />
        </label>
        <div className="full-span">
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? t("register.loading") : t("register.submit")}
          </Button>
        </div>
        <p className={`${styles.authSwitch} full-span`}>
          {t("register.hasAccount")} <Link to="/login">{t("nav.login")}</Link>
        </p>
      </form>
    </PageHero>
  );
}
