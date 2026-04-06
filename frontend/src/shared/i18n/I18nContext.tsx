import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fallbacksForLang, interpolate } from "./fallbacks";

type I18nCtx = {
  lang: string;
  setLang: (l: string) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nCtx | null>(null);

const LANG_KEY = "copay_lang";

function initialLang(): string {
  const raw = localStorage.getItem(LANG_KEY) || "ru";
  return raw.startsWith("en") ? "en" : "ru";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState(initialLang);
  const [dict, setDict] = useState<Record<string, string>>(() => fallbacksForLang(initialLang()));

  const setLang = useCallback((l: string) => {
    const v = l.startsWith("en") ? "en" : "ru";
    setLangState(v);
    localStorage.setItem(LANG_KEY, v);
  }, []);

  useEffect(() => {
    setDict(fallbacksForLang(lang));
  }, [lang]);

  useEffect(() => {
    let cancelled = false;
    const base = fallbacksForLang(lang);
    fetch(`/api/i18n?lang=${lang}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data && typeof data === "object") {
          setDict({ ...base, ...data });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const base = fallbacksForLang(lang);
      let s = dict[key] ?? base[key] ?? key;
      if (vars && Object.keys(vars).length) {
        s = interpolate(s, vars);
      }
      return s;
    },
    [dict, lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n outside I18nProvider");
  return ctx;
}
