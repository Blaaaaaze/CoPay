/** Приводит абсолютный URL медиа к пути на текущем origin (прокси Vite / тот же хост). */
export function normalizeMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const s = url.trim();
  if (!s) return undefined;
  try {
    const u = new URL(s, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    if (u.pathname.startsWith("/media/")) {
      return u.pathname + u.search;
    }
  } catch {
    /* ignore */
  }
  if (s.startsWith("/media/")) return s;
  return s;
}
