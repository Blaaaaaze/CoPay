import { useEffect } from "react";
import { useAuth } from "./auth/AuthContext";
import { useI18n } from "../shared/i18n/I18nContext";

const THEME_KEY = "copay_theme";
const ACCENT_KEY = "copay_accent";

export function applyThemeToDocument(theme: string, accent: string) {
  const th = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", th);
  document.documentElement.setAttribute("data-accent", accent || "mint");
}

/** Синхронизация темы/языка из профиля и localStorage */
export function PreferenceSync() {
  const { user } = useAuth();
  const { setLang } = useI18n();

  useEffect(() => {
    if (user) {
      const theme = user.theme || localStorage.getItem(THEME_KEY) || "light";
      const accent = user.accent || localStorage.getItem(ACCENT_KEY) || "mint";
      applyThemeToDocument(theme, accent);
    } else {
      applyThemeToDocument("light", "mint");
    }
  }, [user?.theme, user?.accent, user?.id]);

  useEffect(() => {
    if (user?.preferredLanguage) {
      setLang(user.preferredLanguage);
    }
  }, [user?.id, user?.preferredLanguage, setLang]);

  return null;
}
