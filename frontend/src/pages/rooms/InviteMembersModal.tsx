import { useEffect, useState } from "react";
import { api } from "../../shared/api/client";
import { useI18n } from "../../shared/i18n/I18nContext";
import { Modal } from "../../ui/molecules/Modal";
import type { SearchHit } from "./roomTypes";
import formStyles from "../FormPage.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  token: string;
  roomId: string;
  memberIds: string[];
  onAdded: () => void;
};

export function InviteMembersModal({
  open,
  onClose,
  token,
  roomId,
  memberIds,
  onAdded,
}: Props) {
  const { t } = useI18n();
  const [searchQ, setSearchQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) {
      setSearchQ("");
      setHits([]);
      setInviteCodeInput("");
      setErr("");
    }
  }, [open]);

  useEffect(() => {
    if (!token || searchQ.trim().length < 2) {
      setHits([]);
      return;
    }
    const tm = setTimeout(() => {
      api<SearchHit[]>(`/api/users/search?q=${encodeURIComponent(searchQ.trim())}`, {
        token,
      })
        .then(setHits)
        .catch(() => setHits([]));
    }, 320);
    return () => clearTimeout(tm);
  }, [searchQ, token]);

  async function addByUserId(uid: string) {
    setErr("");
    setLoading(true);
    try {
      await api(`/api/rooms/${roomId}/members`, {
        method: "POST",
        token,
        body: JSON.stringify({ userId: uid }),
      });
      setSearchQ("");
      setHits([]);
      onAdded();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  async function addByCode(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;
    setErr("");
    setLoading(true);
    try {
      await api(`/api/rooms/${roomId}/members`, {
        method: "POST",
        token,
        body: JSON.stringify({ inviteCode: inviteCodeInput.trim() }),
      });
      setInviteCodeInput("");
      onAdded();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("room.invitePeople")}>
      {err && <p className="err">{err}</p>}
      <h3 className={formStyles.cardTitle} style={{ marginTop: 0, fontSize: "1rem" }}>
        {t("room.inviteByName")}
      </h3>
      <p className={formStyles.subtle}>{t("room.searchHint")}</p>
      <div className="fw-input-row">
        <span>{t("room.searchLabel")}</span>
        <input
          className="fw-base-input"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder={t("room.searchHint")}
          autoComplete="off"
        />
      </div>
      {hits.length > 0 && (
        <ul className={formStyles.searchHits}>
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                className={formStyles.searchHit}
                onClick={() => addByUserId(h.id)}
                disabled={loading || memberIds.includes(h.id)}
              >
                {h.fullName}
                {memberIds.includes(h.id) ? ` — ${t("room.alreadyMember")}` : ""}
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3 className={formStyles.cardTitle} style={{ marginTop: "1.25rem", fontSize: "1rem" }}>
        {t("room.inviteByCode")}
      </h3>
      <form onSubmit={addByCode}>
        <div className="fw-input-row">
          <span>{t("room.codeLabel")}</span>
          <input
            className="fw-base-input"
            value={inviteCodeInput}
            onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
            placeholder="XXXXXXXX"
            maxLength={16}
          />
        </div>
        <button type="submit" className="btn-ghost" disabled={loading}>
          {t("common.add")}
        </button>
      </form>
    </Modal>
  );
}
