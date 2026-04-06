import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../shared/api/client";
import { useAuth, type AuthUser } from "../../app/auth/AuthContext";
import { useI18n } from "../../shared/i18n/I18nContext";
import styles from "../FormPage.module.css";

type LoginResp = { token: string; user: AuthUser };

export function LoginPage() {
  const { setSession } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const data = await api<LoginResp>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: login.trim(), password }),
      });
      setSession(data.token, data.user);
      nav("/rooms");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("login.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container page-hero">
      <h1 className="page-title">{t("login.title")}</h1>
      <form className="card form-grid-2" onSubmit={submit} style={{ maxWidth: "28rem" }}>
        {err && (
          <p className="err full-span" style={{ margin: 0 }}>
            {err}
          </p>
        )}
        <label className="full-span">
          {t("login.email")}
          <input
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="full-span">
          {t("login.password")}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <div className="full-span">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? t("login.loading") : t("login.submit")}
          </button>
        </div>
        <p className={`${styles.authSwitch} full-span`}>
          {t("login.noAccount")} <Link to="/register">{t("nav.register")}</Link>
        </p>
      </form>
    </div>
  );
}
