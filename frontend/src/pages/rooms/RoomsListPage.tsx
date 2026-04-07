import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../shared/api/client";
import { useAuth } from "../../app/auth/AuthContext";
import { useI18n } from "../../shared/i18n/I18nContext";
import { currencySymbol } from "../../shared/lib/currency";
import { Modal } from "../../ui/molecules/Modal";
import formStyles from "../FormPage.module.css";

type Room = {
  id: string;
  name: string;
  currency?: string;
  memberIds: string[];
  createdBy: string;
};

export function RoomsListPage() {
  const { token, user } = useAuth();
  const { t } = useI18n();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newName, setNewName] = useState("");
  const [currency, setCurrency] = useState("RUB");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const loadRooms = useCallback(async () => {
    if (!token) return;
    const list = await api<Room[]>("/api/rooms", { token });
    setRooms(list);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadRooms().catch(() => {});
  }, [token, loadRooms]);

  async function createRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setErr("");
    setLoading(true);
    try {
      await api("/api/rooms", {
        method: "POST",
        token,
        body: JSON.stringify({ name: newName.trim(), currency }),
      });
      setNewName("");
      setCreateOpen(false);
      await loadRooms();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="container page-hero">
        <h1 className="page-title">{t("rooms.title")}</h1>
        <p className="section-text">{t("rooms.guestHint")}</p>
        <p>
          <Link to="/login">{t("nav.login")}</Link>
          {" · "}
          <Link to="/register">{t("nav.register")}</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="container page-hero">
      <div className={formStyles.roomsPageTop}>
        <h1 className="page-title">{t("rooms.title")}</h1>
        <div className={formStyles.roomsTopActions}>
          <span className={formStyles.roomsIntroHintWrap}>
            <button
              type="button"
              className={formStyles.roomsIntroBtn}
              aria-label={t("rooms.introHintAria")}
            >
              i
            </button>
            <span className={formStyles.roomsIntroTooltip} role="tooltip">
              {t("rooms.intro")}
            </span>
          </span>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setErr("");
              setCreateOpen(true);
            }}
          >
            {t("rooms.new")}
          </button>
        </div>
      </div>

      <ul className={formStyles.roomList}>
        {rooms.length === 0 && <li className={formStyles.subtle}>{t("rooms.empty")}</li>}
        {rooms.map((r) => (
          <li key={r.id} className={formStyles.roomItem}>
            <div className={formStyles.roomHead}>
              <span className={formStyles.roomName}>{r.name}</span>
              <Link to={`/rooms/${r.id}`} className="btn-ghost">
                {t("common.open")}
              </Link>
            </div>
            <p className={formStyles.subtle}>
              {currencySymbol(r.currency || "RUB")} · {t("room.membersCount")}: {r.memberIds.length}
              {r.createdBy === user?.id ? ` · ${t("room.creator")}` : ""}
            </p>
          </li>
        ))}
      </ul>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t("rooms.new")}>
        <form className="form-grid-2" onSubmit={createRoom}>
          {err && (
            <p className="err full-span" style={{ margin: 0 }}>
              {err}
            </p>
          )}
          <div className="fw-input-row full-span">
            <span>{t("rooms.name")}</span>
            <input
              className="fw-base-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t("rooms.namePh")}
              minLength={2}
              required
            />
          </div>
          <div className="fw-input-row full-span">
            <span>{t("calc.currency")}</span>
            <select
              className="fw-base-input"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="RUB">{t("currency.rub")}</option>
              <option value="USD">{t("currency.usd")}</option>
              <option value="EUR">{t("currency.eur")}</option>
            </select>
          </div>
          <div className="full-span">
            <button type="submit" className="btn-primary" disabled={loading}>
              {t("rooms.create")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
