import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../shared/api/client";
import { useAuth, type AuthUser } from "../../app/auth/AuthContext";
import { useI18n } from "../../shared/i18n/I18nContext";
import styles from "../FormPage.module.css";

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
    <div className="container page-hero">
      <h1 className="page-title">{t("register.title")}</h1>
      <form className="card form-grid-2" onSubmit={submit} style={{ maxWidth: "40rem" }}>
        {err && (
          <p className="err full-span" style={{ margin: 0 }}>
            {err}
          </p>
        )}
        <label>
          {t("register.firstName")}
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        </label>
        <label>
          {t("register.lastName")}
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </label>
        <label className="full-span">
          {t("register.email")}
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="full-span">
          {t("register.password")}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            autoComplete="new-password"
            required
          />
        </label>
        <div className="full-span">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? t("register.loading") : t("register.submit")}
          </button>
        </div>
        <p className={`${styles.authSwitch} full-span`}>
          {t("register.hasAccount")} <Link to="/login">{t("nav.login")}</Link>
        </p>
      </form>
    </div>
  );
}
