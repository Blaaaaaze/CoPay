import { useEffect, useState } from "react";
import { api } from "../../shared/api/client";
import { useI18n } from "../../shared/i18n/I18nContext";
import { Modal } from "../../ui/molecules/Modal";
import { SelectedChips } from "../../ui/molecules/SelectedChips";
import { UserSearchSelectCard } from "../../ui/molecules/UserSearchSelectCard";
import { TextInput } from "../../ui/atoms/TextInput";
import type { SearchHit } from "./roomTypes";
import formStyles from "../FormPage.module.css";
import styles from "./InviteMembersModal.module.css";

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
      <SelectedChips
        title={t("room.selected")}
        chips={Object.values(selected).map((x) => ({ id: x.id, label: x.label }))}
        loading={loading}
        primaryLabel={t("room.addSelected")}
        secondaryLabel={t("common.cancel")}
        onPrimary={() => void addSelectedUsers()}
        onSecondary={() => setSelected({})}
        onRemoveChip={(id) =>
          setSelected((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          })
        }
      />
      <h3 className={`${formStyles.cardTitle} ${styles.heading}`}>
        {t("room.inviteByName")}
      </h3>
      <p className={formStyles.subtle}>{t("room.searchHint")}</p>
      <div className="fw-input-row">
        <span>{t("room.searchLabel")}</span>
        <TextInput
          variant="fw"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder={t("room.searchHint")}
          autoComplete="off"
        />
      </div>
      {hits.length > 0 && (
        <ul className={`${formStyles.searchHits} ${styles.hitsGrid}`}>
          {hits.map((h) => (
            <li key={h.id} className={styles.hitItem}>
              <UserSearchSelectCard
                checked={!!selected[h.id]}
                disabled={loading || memberIds.includes(h.id)}
                name={h.fullName}
                onToggle={() => toggleHit(h)}
              />
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
