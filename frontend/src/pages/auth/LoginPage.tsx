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
    <PageHero>
      <h1 className="page-title">{t("login.title")}</h1>
      <form className={`card form-grid-2 ${pageStyles.loginForm}`} onSubmit={submit}>
        {err && (
          <p className={`err full-span ${pageStyles.inlineMsgNoMargin}`}>
            {err}
          </p>
        )}
        <label className="full-span">
          {t("login.email")}
          <TextInput
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="full-span">
          {t("login.password")}
          <TextInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <div className="full-span">
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? t("login.loading") : t("login.submit")}
          </Button>
        </div>
        <p className={`${styles.authSwitch} full-span`}>
          {t("login.noAccount")} <Link to="/register">{t("nav.register")}</Link>
        </p>
      </form>
    </PageHero>
  );
}
