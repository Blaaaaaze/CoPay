import { useEffect, useMemo, useState } from "react";
import { api } from "../../shared/api/client";
import { ReceiptParseButton } from "../../shared/receipt/ReceiptParseButton";
import { useI18n } from "../../shared/i18n/I18nContext";
import { Modal } from "../../ui/molecules/Modal";
import { Button } from "../../ui/atoms/Button";
import { Checkbox } from "../../ui/atoms/Checkbox";
import { Select } from "../../ui/atoms/Select";
import { TextInput } from "../../ui/atoms/TextInput";
import { currencySymbol, formatMoney } from "../../shared/lib/currency";
import { mergeDuplicateRoomLines } from "../../shared/lib/mergeDuplicateLines";
import type { Member, RoomExpense } from "./roomTypes";
import styles from "./ExpenseWizardModal.module.css";

type DraftLine = { name: string; amount: string; participantIds: string[] };

type Props = {
  open: boolean;
  onClose: () => void;
  roomId: string;
  token: string;
  currency: string;
  members: Member[];
  memberIds: string[];
  defaultPayerId: string;
  editing: RoomExpense | null;
  onSaved: () => void;
};

function emptyLine(): DraftLine {
  return { name: "", amount: "", participantIds: [] };
}

export function ExpenseWizardModal({
  open,
  onClose,
  roomId,
  token,
  currency,
  members,
  memberIds,
  defaultPayerId,
  editing,
  onSaved,
}: Props) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [payerId, setPayerId] = useState(defaultPayerId);
  const [simpleMode, setSimpleMode] = useState(false);
  const [simpleAmount, setSimpleAmount] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [err, setErr] = useState("");
  const [titleErr, setTitleErr] = useState("");
  const [amountErr, setAmountErr] = useState("");
  const [loading, setLoading] = useState(false);

  const sym = currencySymbol(currency);

  const footerStats = useMemo(() => {
    if (simpleMode) {
      const n = parseFloat(simpleAmount.replace(",", "."));
      const total = !Number.isFinite(n) || n <= 0 ? 0 : n;
      return { count: 1, total };
    }
    let total = 0;
    for (const L of lines) {
      const v = parseFloat(L.amount.replace(",", "."));
      if (Number.isFinite(v) && v > 0) total += v;
    }
    return { count: lines.length, total };
  }, [simpleMode, simpleAmount, lines]);

  useEffect(() => {
    if (!open) return;
    setErr("");
    if (editing) {
      setTitle(editing.title);
      setPayerId(editing.payerId);
      const li = editing.lineItems || [];
      if (li.length > 0) {
        setSimpleMode(false);
        setLines(
          li.map((x) => ({
            name: x.name,
            amount: String(x.amount),
            participantIds: [...(x.participantIds || [])],
          }))
        );
        setSimpleAmount("");
      } else {
        setSimpleMode(true);
        setSimpleAmount(String(editing.amount));
        setLines([emptyLine()]);
      }
    } else {
      setTitle("");
      setPayerId(defaultPayerId);
      setSimpleMode(false);
      setSimpleAmount("");
      setLines([emptyLine()]);
    }
  }, [open, editing, defaultPayerId, memberIds.join(",")]);

  function toggleParticipant(lineIdx: number, mid: string) {
    setLines((prev) => {
      const next = [...prev];
      const row = { ...next[lineIdx] };
      const set = new Set(row.participantIds);
      if (set.has(mid)) set.delete(mid);
      else set.add(mid);
      row.participantIds = memberIds.filter((id) => set.has(id));
      next[lineIdx] = row;
      return next;
    });
  }

  function updateLine(i: number, patch: Partial<DraftLine>) {
    setLines((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setTitleErr("");
    setAmountErr("");
    if (!title.trim()) {
      setTitleErr(t("expense.needTitle"));
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        payerId,
      };
      if (simpleMode) {
        const amt = Number(simpleAmount.replace(",", "."));
        if (!amt || amt <= 0) {
          setAmountErr(t("expense.needAmount"));
          setLoading(false);
          return;
        }
        body.amount = amt;
      } else {
        for (const L of lines) {
          if (L.name.trim() && (!L.amount.trim() || Number(L.amount.replace(",", ".")) <= 0)) {
            setErr(t("expense.needLineAmount"));
            setLoading(false);
            return;
          }
          if (L.amount.trim() && !L.name.trim()) {
            setErr(t("expense.needLineName"));
            setLoading(false);
            return;
          }
        }
        const lineItems = mergeDuplicateRoomLines(lines)
          .map((L) => ({
            name: L.name.trim(),
            amount: Number(L.amount.replace(",", ".")),
            participantIds: L.participantIds,
          }))
          .filter((L) => L.name && L.amount > 0 && L.participantIds.length > 0);
        if (lineItems.length === 0) {
          setErr(t("expense.needLines"));
          setLoading(false);
          return;
        }
        body.lineItems = lineItems;
      }

      if (editing) {
        await api(`/api/rooms/${roomId}/expenses/${editing.id}`, {
          method: "PATCH",
          token,
          body: JSON.stringify(body),
        });
      } else {
        await api(`/api/rooms/${roomId}/expenses`, {
          method: "POST",
          token,
          body: JSON.stringify(body),
        });
      }
      onSaved();
      onClose();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? t("expense.edit") : t("expense.new")}
      wide
      bodyClassName={styles.modalBodyFill}
    >
      <form className={styles.formStack} onSubmit={submit}>
        <div className={styles.scroll}>
          {err && <p className="err">{err}</p>}

          <div className="fw-input-row">
            <span>{t("expense.titleLabel")}</span>
            <TextInput
              variant="fw"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleErr("");
              }}
              placeholder={t("expense.titlePh")}
            />
            {titleErr && <span className={`err ${styles.fieldErr}`}>{titleErr}</span>}
          </div>

          <div className="fw-input-row">
            <span>{t("expense.payer")}</span>
            <Select
              variant="fw"
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
            >
              {memberIds.map((mid) => (
                <option key={mid} value={mid}>
                  {members.find((m) => m.id === mid)?.fullName || mid}
                </option>
              ))}
            </Select>
          </div>

          <label className={`fw-check ${styles.simpleSplitRow}`}>
            <Checkbox checked={simpleMode} onChange={(e) => setSimpleMode(e.target.checked)} />
            {t("expense.simpleSplit")}
          </label>

          <div className={styles.receiptBlock}>
            <ReceiptParseButton
              label={t("expense.receiptUpload")}
              onError={(m) => setErr(m)}
              onParsed={(items, _total, meta) => {
                if (items.length === 0) {
                  setErr(meta.note || "");
                  return;
                }
                setErr("");
                const newRows = items.map((it) => ({
                  name: it.name,
                  amount: String(Math.round(it.qty * it.price * 100) / 100),
                  participantIds: [],
                }));
                if (simpleMode) {
                  setLines(
                    newRows.length
                      ? mergeDuplicateRoomLines(newRows)
                      : [emptyLine()]
                  );
                } else {
                  setLines((prev) => mergeDuplicateRoomLines([...prev, ...newRows]));
                }
                setSimpleMode(false);
                setSimpleAmount("");
              }}
            />
          </div>

          {simpleMode ? (
            <div className="fw-input-row">
              <span>
                {t("expense.amount")} ({sym})
              </span>
              <TextInput
                variant="fw"
                value={simpleAmount}
                onChange={(e) => {
                  setSimpleAmount(e.target.value);
                  setAmountErr("");
                }}
                inputMode="decimal"
                placeholder="0"
              />
              {amountErr && <span className={`err ${styles.fieldErr}`}>{amountErr}</span>}
            </div>
          ) : (
            <>
              <p className={`section-text ${styles.linesHint}`}>
                {t("expense.linesHint")}
              </p>
              {lines.map((line, i) => (
                <div
                  key={i}
                  className={styles.lineCard}
                >
                  <div className="fw-input-row">
                    <span>{t("expense.product")}</span>
                    <TextInput
                      variant="fw"
                      value={line.name}
                      onChange={(e) => updateLine(i, { name: e.target.value })}
                      placeholder={t("expense.milkPh")}
                    />
                  </div>
                  <div className="fw-input-row">
                    <span>{t("expense.amount")}</span>
                    <TextInput
                      variant="fw"
                      value={line.amount}
                      onChange={(e) => updateLine(i, { amount: e.target.value })}
                      inputMode="decimal"
                      placeholder="0"
                    />
                  </div>
                  <div className={`fw-persons-grid ${styles.linePersonsGrid}`}>
                    {memberIds.map((mid) => {
                      const m = members.find((x) => x.id === mid);
                      return (
                        <label key={mid} className="fw-check">
                          <Checkbox checked={line.participantIds.includes(mid)} onChange={() => toggleParticipant(i, mid)} />
                          {m?.fullName || mid}
                        </label>
                      );
                    })}
                  </div>
                  <Button
                    type="button"
                    variant="fwDel"
                    onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                    disabled={lines.length <= 1}
                  >
                    {t("expense.removeLine")}
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="fwAdd"
                onClick={() => setLines((prev) => [...prev, emptyLine()])}
              >
                {t("expense.addLine")}
              </Button>
            </>
          )}
        </div>

        <div className={styles.footer}>
          <p className={styles.summary}>
            {t("expense.footerSummary", {
              count: String(footerStats.count),
              total: formatMoney(footerStats.total, currency),
            })}
          </p>
          <div className={styles.actions}>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading
                ? t("expense.saving")
                : editing
                  ? t("common.save")
                  : t("expense.create")}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
