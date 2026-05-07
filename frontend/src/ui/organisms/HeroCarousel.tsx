import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../../shared/i18n/I18nContext";
import { Button } from "../atoms/Button";
import { IconChevron } from "../atoms/IconChevron";
import styles from "./HeroCarousel.module.css";

export type CarouselSlide = { src: string; caption: string; fallbackSrc?: string };

type Props = { slides: CarouselSlide[]; autoMs?: number };

export function HeroCarousel({ slides, autoMs = 0 }: Props) {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  const n = slides.length;
  const prev = useCallback(() => setI((x) => (x - 1 + n) % n), [n]);
  const next = useCallback(() => setI((x) => (x + 1) % n), [n]);

  useEffect(() => {
    if (!autoMs || n < 2) return;
    const t = setInterval(next, autoMs);
    return () => clearInterval(t);
  }, [autoMs, n, next]);

  useEffect(() => {
    if (n < 2) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable=true]")) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [n, prev, next]);

  if (!n) return null;
  const slide = slides[i];

  return (
    <div className={styles.wrap}>
      <div className={styles.viewport}>
        <div className={styles.track}>
          {slides.map((s, idx) => (
            <div
              key={s.src}
              className={`${styles.slide} ${idx === i ? styles.slideActive : ""}`}
              aria-hidden={idx !== i}
            >
              <img
                src={s.src}
                alt=""
                onError={(e) => {
                  if (s.fallbackSrc && e.currentTarget.src !== new URL(s.fallbackSrc, window.location.origin).href) {
                    e.currentTarget.src = s.fallbackSrc;
                  }
                }}
              />
            </div>
          ))}
          <div className={styles.overlay} aria-hidden />
          <p className={styles.caption}>{slide.caption}</p>
        </div>
        {n > 1 && (
          <>
            <Button
              type="button"
              variant="ghost"
              className={`${styles.arrow} ${styles.arrowLeft}`}
              onClick={prev}
              aria-label={t("carousel.prev")}
            >
              <IconChevron direction="left" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={`${styles.arrow} ${styles.arrowRight}`}
              onClick={next}
              aria-label={t("carousel.next")}
            >
              <IconChevron direction="right" />
            </Button>
          </>
        )}
      </div>
      {n > 1 && (
        <div className={styles.dots} role="tablist" aria-label={t("carousel.list")}>
          {slides.map((_, idx) => (
            <Button
              key={idx}
              type="button"
              variant="ghost"
              className={`${styles.dot} ${idx === i ? styles.dotActive : ""}`}
              aria-selected={idx === i}
              aria-label={t("carousel.slideN", { n: idx + 1 })}
              onClick={() => setI(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
