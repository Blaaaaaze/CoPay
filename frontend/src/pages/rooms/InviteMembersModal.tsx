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

const SEARCH_DEBOUNCE_MS = 550;

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
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searchErr, setSearchErr] = useState("");
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Record<string, Selected>>({});
  const [okMsg, setOkMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebouncedQ("");
      setHits([]);
      setSearchErr("");
      setSearching(false);
      setErr("");
      setOkMsg("");
      setSelected({});
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const tm = setTimeout(() => setDebouncedQ(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(tm);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    if (!token || debouncedQ.length < 2) {
      setHits([]);
      setSearchErr("");
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    setSearchErr("");

    api<SearchHit[]>(`/api/users/search?q=${encodeURIComponent(debouncedQ)}`, {
      token,
    })
      .then((data) => {
        if (!cancelled) {
          setHits(Array.isArray(data) ? data : []);
        }
      })
      .catch((ex) => {
        if (!cancelled) {
          setHits([]);
          setSearchErr(ex instanceof Error ? ex.message : t("room.searchFailed"));
        }
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQ, token, open, t]);

  async function addSelectedUsers() {
    const ids = Object.keys(selected).filter((id) => !memberIds.includes(id));
    if (ids.length === 0) return;
    setErr("");
    setOkMsg("");
    setLoading(true);
    try {
      for (const uid of ids) {
        await api(`/api/rooms/${roomId}/members`, {
          method: "POST",
          token,
          body: JSON.stringify({ userId: uid }),
        });
      }
      setSelected({});
      setQuery("");
      setDebouncedQ("");
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

  const showMinChars = query.trim().length > 0 && query.trim().length < 2;
  const showNoResults =
    debouncedQ.length >= 2 && !searching && !searchErr && hits.length === 0;

  return (
    <Modal open={open} onClose={onClose} title={t("room.invitePeople")} bodyClassName={styles.modalBody}>
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
      <p className={formStyles.subtle}>{t("room.searchHint")}</p>
      <div className={`fw-input-row ${styles.searchRow}`}>
        <span className={styles.searchLabel}>{t("room.searchLabel")}</span>
        <TextInput
          variant="fw"
          className={styles.searchInput}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("room.searchPlaceholder")}
          autoComplete="off"
        />
      </div>
      {showMinChars && (
        <p className={`${formStyles.subtle} ${styles.searchStatus}`}>{t("room.searchMinChars")}</p>
      )}
      {searching && debouncedQ.length >= 2 && (
        <p className={`${formStyles.subtle} ${styles.searchStatus}`}>{t("room.searching")}</p>
      )}
      {searchErr && <p className={`err ${styles.searchStatus}`}>{searchErr}</p>}
      {showNoResults && (
        <p className={`${formStyles.subtle} ${styles.searchStatus}`}>{t("room.searchNoResults")}</p>
      )}
      <div className={styles.hitsSlot}>
        {hits.length > 0 && (
          <ul className={`${styles.hitsList} ${styles.hitsGrid}`}>
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
      </div>
    </Modal>
  );
}
