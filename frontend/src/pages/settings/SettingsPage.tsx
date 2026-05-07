import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api } from "../../shared/api/client";
import { useAuth, type AuthUser } from "../../app/auth/AuthContext";
import { useI18n } from "../../shared/i18n/I18nContext";
import { applyThemeToDocument } from "../../app/PreferenceSync";
import { Button } from "../../ui/atoms/Button";
import { Select } from "../../ui/atoms/Select";
import { PageHero } from "../../ui/templates/PageHero";
import styles from "../FormPage.module.css";
import pageStyles from "./SettingsPage.module.css";

const THEME_KEY = "copay_theme";
const ACCENT_KEY = "copay_accent";

export function SettingsPage() {
  const { token, setSession, user } = useAuth();
  const { t, setLang } = useI18n();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [accent, setAccent] = useState("mint");
  const [prefLang, setPrefLang] = useState("ru");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setTheme(user.theme === "dark" ? "dark" : "light");
    setAccent(user.accent || "mint");
    setPrefLang(user.preferredLanguage?.startsWith("en") ? "en" : "ru");
  }, [user]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  async function save(e: React.FormEvent) {
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
          preferredLanguage: prefLang,
          theme,
          accent,
        }),
      });
      setSession(token, p);
      localStorage.setItem(THEME_KEY, theme);
      localStorage.setItem(ACCENT_KEY, accent);
      applyThemeToDocument(theme, accent);
      setLang(prefLang);
      setOk(t("settings.saved"));
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageHero>
      <p className={styles.subtle}>
        <Link to="/profile">← {t("nav.profile")}</Link>
      </p>
      <h1 className="page-title">{t("settings.title")}</h1>

      <form className={`fw-panel form-grid-2 ${pageStyles.form40}`} onSubmit={save}>
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

        <div className="fw-input-row full-span">
          <span>{t("settings.lang")}</span>
          <Select
            variant="fw"
            value={prefLang}
            onChange={(e) => setPrefLang(e.target.value)}
          >
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </Select>
        </div>

        <div className="fw-input-row">
          <span>{t("settings.theme")}</span>
          <Select
            variant="fw"
            value={theme}
            onChange={(e) => setTheme(e.target.value as "light" | "dark")}
          >
            <option value="light">{t("settings.themeLight")}</option>
            <option value="dark">{t("settings.themeDark")}</option>
          </Select>
        </div>

        <div className="fw-input-row">
          <span>{t("settings.accent")}</span>
          <Select
            variant="fw"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
          >
            <option value="mint">{t("settings.accentMint")}</option>
            <option value="blue">{t("settings.accentBlue")}</option>
            <option value="red">{t("settings.accentRed")}</option>
            <option value="purple">{t("settings.accentPurple")}</option>
          </Select>
        </div>

        <p className={`${styles.subtle} full-span ${pageStyles.previewNote}`}>
          {t("settings.previewNote")}
        </p>

        <div className="full-span">
          <Button type="submit" variant="primary" disabled={loading}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </PageHero>
  );
}
