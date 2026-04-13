import { useEffect, useRef, type ReactNode } from "react";
import { useI18n } from "../../shared/i18n/I18nContext";
import styles from "./Modal.module.css";

let bodyScrollLockCount = 0;
let bodyScrollLockPrevOverflow = "";

type Props = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  bodyClassName?: string;
};

export function Modal({ open, title, children, onClose, wide, bodyClassName }: Props) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (bodyScrollLockCount === 0) {
      bodyScrollLockPrevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    bodyScrollLockCount += 1;
    return () => {
      bodyScrollLockCount -= 1;
      if (bodyScrollLockCount === 0) {
        document.body.style.overflow = bodyScrollLockPrevOverflow;
      }
    };
  }, [open]);

  if (!open) return null;

  const panelClass = [styles.panel, wide ? styles.panelWide : ""].filter(Boolean).join(" ");
  const bodyClass = [styles.body, bodyClassName].filter(Boolean).join(" ");

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={panelClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className={styles.head}>
          <h2 id="modal-title" className={styles.title}>
            {title}
          </h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label={t("common.close")}>
            ×
          </button>
        </div>
        <div className={bodyClass}>{children}</div>
      </div>
    </div>
  );
}
