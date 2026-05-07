import { useEffect, useState } from "react";
import { api } from "../../shared/api/client";
import { useI18n } from "../../shared/i18n/I18nContext";
import { Modal } from "../../ui/molecules/Modal";
import type { SearchHit } from "./roomTypes";
import formStyles from "../FormPage.module.css";

type Selected = { id: string; label: string; inviteCode?: string };

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
  const [selected, setSelected] = useState<Record<string, Selected>>({});
  const [okMsg, setOkMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) {
      setSearchQ("");
      setHits([]);
      setErr("");
      setOkMsg("");
      setSelected({});
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

  async function addSelectedUsers() {
    const ids = Object.keys(selected).filter((id) => !memberIds.includes(id));
    if (ids.length === 0) return;
    setErr("");
    setOkMsg("");
    setLoading(true);
    try {
      for (const uid of ids) {
        // sequential to keep API simple and avoid flooding
        await api(`/api/rooms/${roomId}/members`, {
          method: "POST",
          token,
          body: JSON.stringify({ userId: uid }),
        });
      }
      setSelected({});
      setSearchQ("");
      setHits([]);
      setOkMsg(t("room.membersAdded", { count: String(ids.length) }));
      onAdded();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  function toggleHit(h: SearchHit) {
    if (memberIds.includes(h.id)) return;
    setSelected((prev) => {
      const next = { ...prev };
      if (next[h.id]) {
        delete next[h.id];
        return next;
      }
      next[h.id] = { id: h.id, label: h.fullName, inviteCode: h.inviteCode };
      return next;
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={t("room.invitePeople")}>
      {err && <p className="err">{err}</p>}
      {okMsg && <p className="ok">{okMsg}</p>}
      {Object.keys(selected).length > 0 && (
        <div
          className="card"
          style={{
            padding: "0.65rem 0.75rem",
            marginBottom: "0.75rem",
            background: "var(--surface)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: "0.35rem" }}>{t("room.selected")}:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
            {Object.values(selected).map((x) => (
              <button
                key={x.id}
                type="button"
                className="btn-ghost"
                onClick={() =>
                  setSelected((prev) => {
                    const next = { ...prev };
                    delete next[x.id];
                    return next;
                  })
                }
                style={{
                  padding: "0.2rem 0.45rem",
                  borderRadius: 999,
                  fontSize: "0.85rem",
                  lineHeight: 1.1,
                }}
                title={t("common.delete")}
              >
                {x.label} ×
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.6rem" }}>
            <button type="button" className="btn-primary" disabled={loading} onClick={() => void addSelectedUsers()}>
              {t("room.addSelected")}
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={loading}
              onClick={() => setSelected({})}
              style={{ opacity: 0.9 }}
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
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
        <ul
          className={formStyles.searchHits}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(25%, 12rem), 1fr))",
            gap: "0.35rem",
            padding: "0.35rem",
          }}
        >
          {hits.map((h) => (
            <li key={h.id} style={{ listStyle: "none" }}>
              <label
                className={formStyles.searchHit}
                style={{
                  display: "flex",
                  gap: "0.45rem",
                  alignItems: "flex-start",
                  padding: "0.45rem 0.55rem",
                  fontSize: "0.92rem",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  background: "var(--surface)",
                  height: "100%",
                }}
              >
                <input
                  type="checkbox"
                  checked={!!selected[h.id]}
                  disabled={loading || memberIds.includes(h.id)}
                  onChange={() => toggleHit(h)}
                  style={{ marginTop: 2 }}
                />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, overflowWrap: "anywhere" }}>
                    {h.fullName}
                  </div>
                  {h.inviteCode && (
                    <div style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: 2 }}>
                      {h.inviteCode}
                    </div>
                  )}
                  {memberIds.includes(h.id) && (
                    <div style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: 2 }}>
                      {t("room.alreadyMember")}
                    </div>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
