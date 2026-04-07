import { useEffect, useMemo, useState } from "react";
import { api } from "../../shared/api/client";
import { useI18n } from "../../shared/i18n/I18nContext";
import { Modal } from "../../ui/molecules/Modal";
import { currencySymbol, formatMoney } from "../../shared/lib/currency";
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

function emptyLine(memberIds: string[]): DraftLine {
  return { name: "", amount: "", participantIds: [...memberIds] };
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
        setLines([emptyLine(memberIds)]);
      }
    } else {
      setTitle("");
      setPayerId(defaultPayerId);
      setSimpleMode(false);
      setSimpleAmount("");
      setLines([emptyLine(memberIds)]);
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
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim() || t("expense.defaultTitle"),
        payerId,
      };
      if (simpleMode) {
        const amt = Number(simpleAmount.replace(",", "."));
        if (!amt || amt <= 0) {
          setErr(t("expense.needAmount"));
          setLoading(false);
          return;
        }
        body.amount = amt;
      } else {
        const lineItems = lines
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
            <input
              className="fw-base-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("expense.titlePh")}
            />
          </div>

          <div className="fw-input-row">
            <span>{t("expense.payer")}</span>
            <select
              className="fw-base-input"
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
            >
              {memberIds.map((mid) => (
                <option key={mid} value={mid}>
                  {members.find((m) => m.id === mid)?.fullName || mid}
                </option>
              ))}
            </select>
          </div>

          <label className="fw-check" style={{ marginBottom: "0.75rem", display: "flex" }}>
            <input
              type="checkbox"
              checked={simpleMode}
              onChange={(e) => setSimpleMode(e.target.checked)}
            />
            {t("expense.simpleSplit")}
          </label>

          {simpleMode ? (
            <div className="fw-input-row">
              <span>
                {t("expense.amount")} ({sym})
              </span>
              <input
                className="fw-base-input"
                value={simpleAmount}
                onChange={(e) => setSimpleAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0"
              />
            </div>
          ) : (
            <>
              <p className="section-text" style={{ fontSize: "0.9rem", margin: "0 0 0.5rem" }}>
                {t("expense.linesHint")}
              </p>
              {lines.map((line, i) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "0.75rem",
                    marginBottom: "0.75rem",
                    background: "var(--page-bg)",
                  }}
                >
                  <div className="fw-input-row">
                    <span>{t("expense.product")}</span>
                    <input
                      className="fw-base-input"
                      value={line.name}
                      onChange={(e) => updateLine(i, { name: e.target.value })}
                      placeholder={t("expense.milkPh")}
                    />
                  </div>
                  <div className="fw-input-row">
                    <span>{t("expense.amount")}</span>
                    <input
                      className="fw-base-input"
                      value={line.amount}
                      onChange={(e) => updateLine(i, { amount: e.target.value })}
                      inputMode="decimal"
                      placeholder="0"
                    />
                  </div>
                  <div className="fw-persons-grid" style={{ justifyContent: "flex-start" }}>
                    {memberIds.map((mid) => {
                      const m = members.find((x) => x.id === mid);
                      return (
                        <label key={mid} className="fw-check">
                          <input
                            type="checkbox"
                            checked={line.participantIds.includes(mid)}
                            onChange={() => toggleParticipant(i, mid)}
                          />
                          {m?.fullName || mid}
                        </label>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="fw-btn fw-btn-del"
                    onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                    disabled={lines.length <= 1}
                  >
                    {t("expense.removeLine")}
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="fw-btn fw-btn-add"
                onClick={() => setLines((prev) => [...prev, emptyLine(memberIds)])}
              >
                {t("expense.addLine")}
              </button>
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
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading
                ? t("expense.saving")
                : editing
                  ? t("common.save")
                  : t("expense.create")}
            </button>
            <button type="button" className="btn-ghost" onClick={onClose}>
              {t("common.cancel")}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
