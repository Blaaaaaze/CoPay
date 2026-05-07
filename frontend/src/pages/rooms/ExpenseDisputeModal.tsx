import { useEffect, useState } from "react";
import { api } from "../../shared/api/client";
import { useI18n } from "../../shared/i18n/I18nContext";
import { Modal } from "../../ui/molecules/Modal";
import { Button } from "../../ui/atoms/Button";
import { TextArea } from "../../ui/atoms/TextArea";
import type { RoomExpense } from "./roomTypes";
import styles from "./ExpenseDisputeModal.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  roomId: string;
  expenseId: string;
  token: string;
  onResolved: (ex: RoomExpense) => void;
};

export function ExpenseDisputeModal({
  open,
  onClose,
  roomId,
  expenseId,
  token,
  onResolved,
}: Props) {
  const { t } = useI18n();
  const [message, setMessage] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMessage("");
    setErr("");
  }, [open, expenseId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const text = message.trim();
    if (!text) {
      setErr(t("room.disputeNeedText"));
      return;
    }
    setLoading(true);
    try {
      const ex = await api<RoomExpense>(`/api/rooms/${roomId}/expenses/${expenseId}/dispute`, {
        method: "POST",
        token,
        body: JSON.stringify({ message: text }),
      });
      onResolved(ex);
      onClose();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("room.disputeTitle")}>
      <form onSubmit={submit}>
        {err && <p className="err">{err}</p>}
        <p className={`section-text ${styles.hint}`}>
          {t("room.disputeHint")}
        </p>
        <TextArea
          variant="fw"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("room.disputePlaceholder")}
          className={styles.message}
        />
        <div className={styles.actionsRow}>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? t("expense.saving") : t("room.disputeSend")}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
