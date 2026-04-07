import { useI18n } from "../../shared/i18n/I18nContext";
import { formatMoney } from "../../shared/lib/currency";
import { Modal } from "../../ui/molecules/Modal";
import type { RoomExpense } from "./roomTypes";

type Props = {
  open: boolean;
  expense: RoomExpense | null;
  currency: string;
  onClose: () => void;
  nameById: (id: string) => string;
  currentUserId?: string;
  onEdit: (ex: RoomExpense) => void;
  onDelete: (ex: RoomExpense) => void;
  onDispute: (ex: RoomExpense) => void;
};

export function ExpenseViewModal({
  open,
  expense,
  currency,
  onClose,
  nameById,
  currentUserId,
  onEdit,
  onDelete,
  onDispute,
}: Props) {
  const { t } = useI18n();
  if (!expense) return null;

  const authorId = expense.createdById ?? expense.payerId;
  const isAuthor = currentUserId === authorId;
  const canDispute = !!currentUserId && !isAuthor;

  return (
    <Modal open={open} onClose={onClose} title={expense.title} wide>
      <p style={{ marginTop: 0, fontSize: "1.05rem", fontWeight: 600 }}>
        {formatMoney(expense.amount, currency)}
      </p>
      <p className="section-text" style={{ margin: "0.35rem 0" }}>
        {t("expense.payer")}: <strong>{nameById(expense.payerId)}</strong>
      </p>
      <p className="section-text" style={{ margin: "0.35rem 0", fontSize: "0.9rem" }}>
        {t("room.expenseAuthor")}: <strong>{nameById(authorId)}</strong>
      </p>
      <p className="section-text" style={{ margin: "0.35rem 0", fontSize: "0.85rem", color: "var(--muted)" }}>
        {new Date(expense.createdAt).toLocaleString()}
      </p>

      {expense.lineItems && expense.lineItems.length > 0 && (
        <>
          <h3 style={{ fontSize: "1rem", margin: "0.75rem 0 0.35rem" }}>{t("adhoc.lineItems")}</h3>
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            {expense.lineItems.map((li, i) => (
              <li key={i}>
                {li.name} — {formatMoney(li.amount, currency)}
                <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
                  {" "}
                  ({li.participantIds.map((id) => nameById(id)).join(", ")})
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {expense.disputes && expense.disputes.length > 0 && (
        <>
          <h3 style={{ fontSize: "1rem", margin: "0.75rem 0 0.35rem" }}>{t("room.disputesHeading")}</h3>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.9rem" }}>
            {expense.disputes.map((d, i) => (
              <li key={i} style={{ marginBottom: "0.5rem" }}>
                <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                  {nameById(d.userId)} · {new Date(d.createdAt).toLocaleString()}
                </span>
                <br />
                {d.message}
              </li>
            ))}
          </ul>
        </>
      )}

      <div style={{ marginTop: "1.25rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {isAuthor && (
          <>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                onEdit(expense);
                onClose();
              }}
            >
              {t("common.edit")}
            </button>
            <button
              type="button"
              className="fw-btn fw-btn-del"
              onClick={() => {
                onDelete(expense);
                onClose();
              }}
            >
              {t("common.delete")}
            </button>
          </>
        )}
        {canDispute && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              onDispute(expense);
              onClose();
            }}
          >
            {t("room.dispute")}
          </button>
        )}
        <button type="button" className="btn-ghost" onClick={onClose}>
          {t("common.close")}
        </button>
      </div>
    </Modal>
  );
}
