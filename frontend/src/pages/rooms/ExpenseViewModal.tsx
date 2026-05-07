import { useI18n } from "../../shared/i18n/I18nContext";
import { formatMoney } from "../../shared/lib/currency";
import { Modal } from "../../ui/molecules/Modal";
import { Button } from "../../ui/atoms/Button";
import type { RoomExpense } from "./roomTypes";
import styles from "./ExpenseViewModal.module.css";

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
      <p className={styles.amountLine}>
        {formatMoney(expense.amount, currency)}
      </p>
      <p className={`section-text ${styles.metaLine}`}>
        {t("expense.payer")}: <strong>{nameById(expense.payerId)}</strong>
      </p>
      <p className={`section-text ${styles.authorLine}`}>
        {t("room.expenseAuthor")}: <strong>{nameById(authorId)}</strong>
      </p>
      <p className={`section-text ${styles.dateLine}`}>
        {new Date(expense.createdAt).toLocaleString()}
      </p>

      {expense.lineItems && expense.lineItems.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>{t("adhoc.lineItems")}</h3>
          <ul className={styles.itemsList}>
            {expense.lineItems.map((li, i) => (
              <li key={i}>
                {li.name} — {formatMoney(li.amount, currency)}
                <span className={styles.itemsHint}>
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
          <h3 className={styles.sectionTitle}>{t("room.disputesHeading")}</h3>
          <ul className={styles.disputesList}>
            {expense.disputes.map((d, i) => (
              <li key={i} className={styles.disputeRow}>
                <span className={styles.disputeMeta}>
                  {nameById(d.userId)} · {new Date(d.createdAt).toLocaleString()}
                </span>
                <br />
                {d.message}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className={styles.actionsRow}>
        {isAuthor && (
          <>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                onEdit(expense);
                onClose();
              }}
            >
              {t("common.edit")}
            </Button>
            <Button
              type="button"
              variant="fwDel"
              onClick={() => {
                onDelete(expense);
                onClose();
              }}
            >
              {t("common.delete")}
            </Button>
          </>
        )}
        {canDispute && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onDispute(expense);
              onClose();
            }}
          >
            {t("room.dispute")}
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onClose}>
          {t("common.close")}
        </Button>
      </div>
    </Modal>
  );
}
