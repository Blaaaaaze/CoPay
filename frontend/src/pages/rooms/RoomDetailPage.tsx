import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../shared/api/client";
import { useAuth } from "../../app/auth/AuthContext";
import { useI18n } from "../../shared/i18n/I18nContext";
import { formatMoney } from "../../shared/lib/currency";
import { ExpenseDisputeModal } from "./ExpenseDisputeModal";
import { ExpenseViewModal } from "./ExpenseViewModal";
import { ExpenseWizardModal } from "./ExpenseWizardModal";
import { InviteMembersModal } from "./InviteMembersModal";
import { roomActivityLine } from "./roomActivityText";
import type { BalanceResp, RoomActivityItem, RoomExpense, RoomInfo } from "./roomTypes";
import formStyles from "../FormPage.module.css";
import styles from "./RoomDetailPage.module.css";

export function RoomDetailPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { token, user } = useAuth();
  const { t } = useI18n();
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [expenses, setExpenses] = useState<RoomExpense[]>([]);
  const [balance, setBalance] = useState<BalanceResp | null>(null);
  const [activities, setActivities] = useState<RoomActivityItem[]>([]);
  const [err, setErr] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<RoomExpense | null>(null);
  const [viewingExpense, setViewingExpense] = useState<RoomExpense | null>(null);
  const [roomNameDraft, setRoomNameDraft] = useState("");
  const [roomNameEditing, setRoomNameEditing] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameErr, setNameErr] = useState("");
  const [disputeFor, setDisputeFor] = useState<RoomExpense | null>(null);
  const [receiveBusyId, setReceiveBusyId] = useState<string | null>(null);

  const nameById = useCallback(
    (id: string) => room?.members.find((m) => m.id === id)?.fullName || id.slice(0, 8) + "…",
    [room]
  );

  const reloadAll = useCallback(async () => {
    if (!token || !roomId) return;
    const [info, ex, bal, act] = await Promise.all([
      api<RoomInfo>(`/api/rooms/${roomId}`, { token }),
      api<RoomExpense[]>(`/api/rooms/${roomId}/expenses`, { token }),
      api<BalanceResp>(`/api/rooms/${roomId}/balance`, { token }),
      api<RoomActivityItem[]>(`/api/rooms/${roomId}/activities`, { token }),
    ]);
    setRoom(info);
    setExpenses(ex);
    setBalance(bal);
    setActivities(act);
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

  useEffect(() => {
    if (room) setRoomNameDraft(room.name);
  }, [room?.id, room?.name]);

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

  async function saveRoomName(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !roomId || !room || user?.id !== room.createdBy) return;
    const next = roomNameDraft.trim();
    if (next.length < 2) {
      setNameErr(t("rooms.namePh"));
      return;
    }
    if (next === room.name) {
      setRoomNameEditing(false);
      return;
    }
    setNameErr("");
    setNameSaving(true);
    try {
      await api<RoomInfo>(`/api/rooms/${roomId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ name: next }),
      });
      await reloadAll();
      setRoomNameEditing(false);
    } catch (ex) {
      setNameErr(ex instanceof Error ? ex.message : t("common.error"));
    } finally {
      setNameSaving(false);
    }
  }

  async function recordReceived(fromUserId: string) {
    if (!token || !roomId || !user) return;
    setErr("");
    setReceiveBusyId(fromUserId);
    try {
      await api(`/api/rooms/${roomId}/settlements/received`, {
        method: "POST",
        token,
        body: JSON.stringify({ fromUserId }),
      });
      await reloadAll();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("common.error"));
    } finally {
      setReceiveBusyId(null);
    }
  }

  async function deleteRoom() {
    if (!token || !roomId || !room) return;
    if (user?.id !== room.createdBy) return;
    if (!window.confirm(t("room.deleteRoomConfirm", { name: room.name }))) return;
    setErr("");
    try {
      await api(`/api/rooms/${roomId}`, { method: "DELETE", token });
      window.location.href = "/rooms";
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("common.error"));
    }
  }

  async function removeMember(userId: string) {
    if (!token || !roomId || !room) return;
    if (user?.id !== room.createdBy) return;
    if (!window.confirm(t("room.removeMemberConfirm"))) return;
    setErr("");
    try {
      await api(`/api/rooms/${roomId}/members/${userId}`, { method: "DELETE", token });
      await reloadAll();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("common.error"));
    }
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

  const receiveOwedBy = (memberId: string) =>
    balance?.viewer.receiveFrom.find((r) => r.fromUserId === memberId);

  const roomHasActiveDebts = (balance?.transfersById?.length ?? 0) > 0;
  const viewerHasActiveDebts =
    (balance?.viewer.payTo?.some((x) => x.amount > 0) ?? false) || (balance?.viewer.receiveFrom?.some((x) => x.amount > 0) ?? false);

  const historySection = (
    <div>
      <h2 className={styles.historyHeading}>{t("room.history")}</h2>
      <ul className={styles.historyList}>
        {expenses.map((ex) => (
          <li key={ex.id} className={styles.expenseCard}>
            <div
              role="button"
              tabIndex={0}
              className={`${styles.expenseMain} ${styles.expenseRowClickable}`}
              onClick={() => setViewingExpense(ex)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setViewingExpense(ex);
                }
              }}
            >
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
          </li>
        ))}
        {expenses.length === 0 && <li className={formStyles.subtle}>{t("room.noExpenses")}</li>}
      </ul>
    </div>
  );

  const activitySection = (
    <div className={styles.activityCard}>
      <h2 className={formStyles.cardTitle} style={{ marginTop: 0 }}>
        {t("room.activityFeed")}
      </h2>
      {activities.length === 0 ? (
        <p className={formStyles.subtle}>{t("room.activityEmpty")}</p>
      ) : (
        <ul className={styles.activityList}>
          {activities.map((a) => (
            <li key={a.id}>
              {roomActivityLine(a, t, cur, nameById)}
              <span className={styles.activityMeta}>{new Date(a.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const asideSection = (
    <>
      {activitySection}

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
              {balance.viewer.payTo
                .filter((x) => x.amount > 0)
                .map((x, i) => (
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
              {balance.viewer.receiveFrom
                .filter((x) => x.amount > 0)
                .map((x, i) => (
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
        {!isCreator && (
          <p className={formStyles.subtle} style={{ marginTop: 0, marginBottom: "0.65rem", fontSize: "0.9rem" }}>
            {t("room.membersLockedHint")}
          </p>
        )}
        <ul className={styles.membersList}>
          {room.members.map((m) => {
            const owed = user && m.id !== user.id ? receiveOwedBy(m.id) : undefined;
            const busy = receiveBusyId === m.id;
            const canRemove = isCreator && m.id !== room.createdBy;
            const hasNonZero =
              !!balance?.transfersById?.some((tr) => tr.fromUserId === m.id || tr.toUserId === m.id) ||
              Math.abs(balance?.balancesById?.[m.id] ?? 0) > 1e-9;
            return (
              <li key={m.id} className={styles.memberRow}>
                <span>
                  {m.fullName}
                  {m.id === user?.id ? ` (${t("room.you")})` : ""}
                </span>
                {canRemove && (
                  !hasNonZero && (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => void removeMember(m.id)}
                      style={{ opacity: 0.95 }}
                      title={t("common.delete")}
                    >
                      {t("common.delete")}
                    </button>
                  )
                )}
                {owed && owed.amount > 0 && (
                  <button
                    type="button"
                    className={`btn-primary ${styles.memberReceiveBtn}`}
                    title={t("room.markReceivedHint")}
                    disabled={busy}
                    onClick={() => void recordReceived(m.id)}
                  >
                    {busy ? t("expense.saving") : `${t("room.markReceived")} · ${formatMoney(owed.amount, cur)}`}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {isCreator && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
            <button type="button" className="btn-ghost" onClick={() => setInviteOpen(true)}>
              {t("room.invitePeople")}
            </button>
            {!roomHasActiveDebts && !viewerHasActiveDebts && (
              <button
                type="button"
                className="fw-btn fw-btn-del"
                onClick={() => void deleteRoom()}
                title={t("common.delete")}
                style={{ border: "1px solid color-mix(in srgb, var(--danger, #ff4d4f) 40%, var(--border))" }}
              >
                {t("room.deleteRoom")}
              </button>
            )}
          </div>
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
      <div className={styles.roomGrid}>
        <div className={styles.roomMain}>
          {isCreator && !roomNameEditing ? (
            <h1 className={`page-title ${styles.roomTitleClickable}`} onClick={() => setRoomNameEditing(true)}>
              {room.name}{" "}
              <span style={{ fontWeight: 500, fontSize: "1rem", color: "var(--muted)" }}>({cur})</span>
            </h1>
          ) : isCreator && roomNameEditing ? (
            <form className={styles.creatorTitleBlock} onSubmit={saveRoomName}>
              <div className={styles.creatorTitleRow}>
                <input
                  className={styles.roomNameInput}
                  value={roomNameDraft}
                  onChange={(e) => {
                    setRoomNameDraft(e.target.value);
                    setNameErr("");
                  }}
                  aria-label={t("rooms.name")}
                  minLength={2}
                  required
                  autoFocus
                />
                <span className={styles.roomCurrencyBadge}>({cur})</span>
              </div>
              {nameErr && (
                <p className="err" style={{ margin: "0.35rem 0 0" }}>
                  {nameErr}
                </p>
              )}
              <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={nameSaving || roomNameDraft.trim().length < 2}
                >
                  {nameSaving ? t("expense.saving") : t("common.save")}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={nameSaving}
                  onClick={() => {
                    setRoomNameDraft(room.name);
                    setNameErr("");
                    setRoomNameEditing(false);
                  }}
                >
                  {t("common.cancel")}
                </button>
              </div>
            </form>
          ) : (
            <h1 className="page-title">
              {room.name}{" "}
              <span style={{ fontWeight: 500, fontSize: "1rem", color: "var(--muted)" }}>({cur})</span>
            </h1>
          )}
          {err && <p className="err">{err}</p>}

          <div className={styles.roomToolbar}>
            <button type="button" className="btn-primary" onClick={openCreate}>
              {t("room.newExpense")}
            </button>
          </div>

          {historySection}
        </div>

        <aside className={styles.roomAside}>{asideSection}</aside>
      </div>

      <ExpenseViewModal
        open={!!viewingExpense}
        expense={viewingExpense}
        currency={cur}
        onClose={() => setViewingExpense(null)}
        nameById={nameById}
        currentUserId={user?.id}
        onEdit={openEdit}
        onDelete={deleteExpense}
        onDispute={(ex) => setDisputeFor(ex)}
      />

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

      {token && disputeFor && (
        <ExpenseDisputeModal
          open
          onClose={() => setDisputeFor(null)}
          roomId={roomId!}
          expenseId={disputeFor.id}
          token={token}
          onResolved={() => {
            void reloadAll();
          }}
        />
      )}

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
