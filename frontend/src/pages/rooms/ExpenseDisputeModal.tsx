import { useEffect, useState } from "react";
import { api } from "../../shared/api/client";
import { useI18n } from "../../shared/i18n/I18nContext";
import { Modal } from "../../ui/molecules/Modal";
import type { RoomExpense } from "./roomTypes";

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
        <p className="section-text" style={{ marginTop: 0, fontSize: "0.92rem" }}>
          {t("room.disputeHint")}
        </p>
        <textarea
          className="fw-base-input"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("room.disputePlaceholder")}
          style={{ minHeight: "5rem", resize: "vertical" }}
        />
        <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? t("expense.saving") : t("room.disputeSend")}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t("common.cancel")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
