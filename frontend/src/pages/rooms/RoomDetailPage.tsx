import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../shared/api/client";
import { useAuth } from "../../app/auth/AuthContext";
import { useI18n } from "../../shared/i18n/I18nContext";
import { formatMoney } from "../../shared/lib/currency";
import { ExpenseWizardModal } from "./ExpenseWizardModal";
import { InviteMembersModal } from "./InviteMembersModal";
import type { BalanceResp, RoomExpense, RoomInfo } from "./roomTypes";
import formStyles from "../FormPage.module.css";
import styles from "./RoomDetailPage.module.css";

export function RoomDetailPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { token, user } = useAuth();
  const { t } = useI18n();
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [expenses, setExpenses] = useState<RoomExpense[]>([]);
  const [balance, setBalance] = useState<BalanceResp | null>(null);
  const [err, setErr] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<RoomExpense | null>(null);

  const nameById = useCallback(
    (id: string) => room?.members.find((m) => m.id === id)?.fullName || id.slice(0, 8) + "…",
    [room]
  );

  const reloadAll = useCallback(async () => {
    if (!token || !roomId) return;
    const [info, ex, bal] = await Promise.all([
      api<RoomInfo>(`/api/rooms/${roomId}`, { token }),
      api<RoomExpense[]>(`/api/rooms/${roomId}/expenses`, { token }),
      api<BalanceResp>(`/api/rooms/${roomId}/balance`, { token }),
    ]);
    setRoom(info);
    setExpenses(ex);
    setBalance(bal);
  }, [token, roomId]);

  useEffect(() => {
    if (!token || !roomId) return;
    let cancelled = false;
    (async () => {
      try {
        await reloadAll();
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Error");
          setRoom(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, roomId, reloadAll]);

  const cur = room?.currency || "RUB";

  async function deleteExpense(ex: RoomExpense) {
    if (!token || !roomId) return;
    if (!window.confirm(t("room.deleteExpenseConfirm", { title: ex.title }))) return;
    setErr("");
    try {
      await api(`/api/rooms/${roomId}/expenses/${ex.id}`, { method: "DELETE", token });
      await reloadAll();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("common.error"));
    }
  }

  function openCreate() {
    setEditing(null);
    setWizardOpen(true);
  }

  function openEdit(ex: RoomExpense) {
    setEditing(ex);
    setWizardOpen(true);
  }

  if (!token) {
    return (
      <div className="container page-hero">
        <p className="section-text">{t("room.loginToOpen")}</p>
        <Link to="/login">{t("nav.login")}</Link>
      </div>
    );
  }

  if (err && !room) {
    return (
      <div className="container page-hero">
        <p className="err">{err}</p>
        <Link to="/rooms">{t("room.backToList")}</Link>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="container page-hero">
        <p className={formStyles.subtle}>{t("common.loading")}</p>
      </div>
    );
  }

  const isCreator = user?.id === room.createdBy;
  const payerDefault = user && room.memberIds.includes(user.id) ? user.id : room.memberIds[0] || "";

  const historySection = (
    <div className={styles.historyCard}>
      <h2 className={formStyles.cardTitle}>{t("room.history")}</h2>
      <ul className={formStyles.expList} style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {expenses.map((ex) => (
          <li key={ex.id} className={styles.expenseRow}>
            <div>
              <strong>{ex.title}</strong> — {formatMoney(ex.amount, cur)}
              <div className={styles.lineHint}>
                {t("calc.payer")}: {nameById(ex.payerId)}
                {ex.lineItems && ex.lineItems.length > 0 && (
                  <>
                    <br />
                    {ex.lineItems.map((li) => li.name).join(", ")}
                  </>
                )}
              </div>
            </div>
            <div className={styles.expenseActions}>
              <button type="button" className="fw-btn fw-btn-edit item-btn" onClick={() => openEdit(ex)}>
                {t("common.edit")}
              </button>
              <button
                type="button"
                className="fw-btn fw-btn-del item-btn"
                onClick={() => deleteExpense(ex)}
              >
                {t("common.delete")}
              </button>
            </div>
          </li>
        ))}
        {expenses.length === 0 && <li className={formStyles.subtle}>{t("room.noExpenses")}</li>}
      </ul>
    </div>
  );

  const asideSection = (
    <>
      {balance && (
        <div className={styles.viewerBlock}>
          <h3>{t("room.balanceHint")}</h3>
          <p className={formStyles.subtle} style={{ marginTop: 0 }}>
            {t("room.youPay")}
          </p>
          {balance.viewer.payTo.length === 0 ? (
            <p className={formStyles.subtle}>—</p>
          ) : (
            <ul className={styles.viewerList}>
              {balance.viewer.payTo.map((x, i) => (
                <li key={i}>
                  <strong>{x.toName}</strong>: {formatMoney(x.amount, balance.currency)}
                </li>
              ))}
            </ul>
          )}
          <p className={formStyles.subtle}>{t("room.youReceive")}</p>
          {balance.viewer.receiveFrom.length === 0 ? (
            <p className={formStyles.subtle}>—</p>
          ) : (
            <ul className={styles.viewerList}>
              {balance.viewer.receiveFrom.map((x, i) => (
                <li key={i}>
                  <strong>{x.fromName}</strong>: {formatMoney(x.amount, balance.currency)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className={styles.membersCard}>
        <h2>{t("room.members")}</h2>
        <ul className={styles.membersList}>
          {room.members.map((m) => (
            <li key={m.id}>
              {m.fullName}
              {m.id === user?.id ? ` (${t("room.you")})` : ""}
            </li>
          ))}
        </ul>
        {isCreator && (
          <button type="button" className="btn-ghost" style={{ marginTop: "0.75rem" }} onClick={() => setInviteOpen(true)}>
            {t("room.invitePeople")}
          </button>
        )}
      </div>

      {balance && (
        <details className="card" style={{ marginTop: "0.5rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>{t("room.allTransfers")}</summary>
          <div className={formStyles.balanceBox} style={{ marginTop: "0.75rem" }}>
            <strong>{t("room.balancesByMember")}</strong>
            <ul>
              {Object.entries(balance.balances).map(([name, v]) => (
                <li key={name}>
                  {name}: {v > 0 ? "+" : ""}
                  {formatMoney(v, balance.currency)}
                </li>
              ))}
            </ul>
            {balance.transfers.length > 0 && (
              <>
                <strong>{t("room.whoPaysWhom")}</strong>
                <ul>
                  {balance.transfers.map((tr, i) => (
                    <li key={i}>
                      {tr.from} → {tr.to}: {formatMoney(tr.amount, balance.currency)}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </details>
      )}
    </>
  );

  return (
    <div className="container page-hero">
      <p className={formStyles.subtle}>
        <Link to="/rooms">← {t("nav.rooms")}</Link>
      </p>
      <h1 className="page-title">
        {room.name}{" "}
        <span style={{ fontWeight: 500, fontSize: "1rem", color: "var(--muted)" }}>({cur})</span>
      </h1>
      {err && <p className="err">{err}</p>}

      <div className={styles.roomGrid}>
        <div className={styles.roomToolbar}>
          <button type="button" className="btn-primary" onClick={openCreate}>
            {t("room.newExpense")}
          </button>
        </div>

        <div className={styles.roomCenter}>{historySection}</div>

        <aside className={styles.roomAside}>{asideSection}</aside>
      </div>

      <ExpenseWizardModal
        open={wizardOpen}
        onClose={() => {
          setWizardOpen(false);
          setEditing(null);
        }}
        roomId={roomId!}
        token={token}
        currency={cur}
        members={room.members}
        memberIds={room.memberIds}
        defaultPayerId={payerDefault}
        editing={editing}
        onSaved={() => reloadAll()}
      />

      {isCreator && token && (
        <InviteMembersModal
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          token={token}
          roomId={roomId!}
          memberIds={room.memberIds}
          onAdded={() => {
            void reloadAll();
            setInviteOpen(false);
          }}
        />
      )}
    </div>
  );
}
