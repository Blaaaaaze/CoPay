import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../app/auth/AuthContext";
import { useI18n } from "../../shared/i18n/I18nContext";
import { normalizeMediaUrl } from "../../shared/lib/mediaUrl";
import { Button } from "../atoms/Button";
import styles from "./AppHeader.module.css";

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${styles.navLink} ${styles.active}` : styles.navLink;

function UserAvatar() {
  const { user } = useAuth();
  const [imgBroken, setImgBroken] = useState(false);
  if (!user) return null;
  const initial = (user.displayName || user.login || "?").slice(0, 1).toUpperCase();
  const src = normalizeMediaUrl(user.avatarUrl ?? undefined) ?? user.avatarUrl;
  if (src && !imgBroken) {
    return (
      <img
        className={styles.avatar}
        src={src}
        alt=""
        width={40}
        height={40}
        onError={() => setImgBroken(true)}
      />
    );
  }
  return (
    <span className={styles.avatarFallback} aria-hidden>
      {initial}
    </span>
  );
}

export function AppHeader() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.logo}>
          CoPay
        </Link>
        <nav className={styles.nav}>
          <NavLink to="/calculator" className={navClass}>
            {t("nav.calc")}
          </NavLink>
          <NavLink to="/rooms" className={navClass}>
            {t("nav.rooms")}
          </NavLink>
          <NavLink to="/contacts" className={navClass}>
            {t("nav.contacts")}
          </NavLink>
        </nav>
        <div className={styles.user}>
          {user ? (
            <div className={styles.menuWrap} ref={wrapRef}>
              <Button
                type="button"
                variant="ghost"
                className={styles.avatarBtn}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((v) => !v);
                }}
              >
                <UserAvatar />
              </Button>
              {menuOpen && (
                <div className={styles.dropdown} role="menu">
                  <Link
                    to="/profile"
                    className={styles.dropdownItem}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t("nav.profile")}
                  </Link>
                  <Link
                    to="/settings"
                    className={styles.dropdownItem}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t("nav.settings")}
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    className={styles.dropdownItem}
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                  >
                    {t("nav.logout")}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/register" className={styles.loginLink}>
                {t("nav.register")}
              </Link>
              <Link to="/login" className={styles.loginLink}>
                {t("nav.login")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
