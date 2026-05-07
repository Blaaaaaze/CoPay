import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../shared/api/client";
import { useAuth } from "../../app/auth/AuthContext";
import { useI18n } from "../../shared/i18n/I18nContext";
import { currencySymbol } from "../../shared/lib/currency";
import { Modal } from "../../ui/molecules/Modal";
import { Button } from "../../ui/atoms/Button";
import { Select } from "../../ui/atoms/Select";
import { TextInput } from "../../ui/atoms/TextInput";
import { LinkButton } from "../../ui/atoms/LinkButton";
import { PageHero } from "../../ui/templates/PageHero";
import formStyles from "../FormPage.module.css";
import styles from "./RoomsListPage.module.css";

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
  const [introOpen, setIntroOpen] = useState(true);

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
      <PageHero>
        <h1 className="page-title">{t("rooms.title")}</h1>
        <p className="section-text">{t("rooms.guestHint")}</p>
        <p>
          <Link to="/login">{t("nav.login")}</Link>
          {" · "}
          <Link to="/register">{t("nav.register")}</Link>
        </p>
      </PageHero>
    );
  }

  return (
    <PageHero>
      <div className={formStyles.roomsPageTop}>
        <h1 className="page-title">{t("rooms.title")}</h1>
        <div className={formStyles.roomsTopActions}>
          <span className={formStyles.roomsIntroHintWrap}>
            <Button
              type="button"
              variant="bare"
              className={formStyles.roomsIntroBtn}
              aria-label={t("rooms.introHintAria")}
              aria-expanded={introOpen}
              aria-controls="rooms-intro-panel"
              onClick={() => setIntroOpen((v) => !v)}
            >
              i
            </Button>
          </span>
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setErr("");
              setCreateOpen(true);
            }}
          >
            {t("rooms.new")}
          </Button>
        </div>
      </div>
      <div
        id="rooms-intro-panel"
        className={formStyles.roomsIntroInlinePanel}
        role="region"
        aria-label={t("rooms.introHintAria")}
        hidden={!introOpen}
      >
        {t("rooms.intro")}
      </div>

      <ul className={formStyles.roomList}>
        {rooms.length === 0 && <li className={formStyles.subtle}>{t("rooms.empty")}</li>}
        {rooms.map((r) => (
          <li key={r.id} className={formStyles.roomItem}>
            <div className={formStyles.roomHead}>
              <span className={formStyles.roomName}>{r.name}</span>
              <LinkButton to={`/rooms/${r.id}`} variant="ghost">
                {t("common.open")}
              </LinkButton>
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
            <p className={`err full-span ${styles.inlineMsgNoMargin}`}>
              {err}
            </p>
          )}
          <div className="fw-input-row full-span">
            <span>{t("rooms.name")}</span>
            <TextInput
              variant="fw"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t("rooms.namePh")}
              minLength={2}
              required
            />
          </div>
          <div className="fw-input-row full-span">
            <span>{t("calc.currency")}</span>
            <Select
              variant="fw"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="RUB">{t("currency.rub")}</option>
              <option value="USD">{t("currency.usd")}</option>
              <option value="EUR">{t("currency.eur")}</option>
            </Select>
          </div>
          <div className="full-span">
            <Button type="submit" variant="primary" disabled={loading}>
              {t("rooms.create")}
            </Button>
          </div>
        </form>
      </Modal>
    </PageHero>
  );
}
