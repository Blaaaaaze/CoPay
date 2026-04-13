import { formatMoney } from "../../shared/lib/currency";
import type { RoomActivityItem } from "./roomTypes";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export function roomActivityLine(
  a: RoomActivityItem,
  t: Translate,
  currency: string,
  nameById: (id: string) => string
): string {
  const p = a.payload;
  const actor = a.actorName;
  switch (a.kind) {
    case "expense_created":
      return t("activity.expense_created", {
        actor,
        title: String(p.title ?? ""),
        amount: formatMoney(Number(p.amount) || 0, currency),
      });
    case "expense_updated":
      return t("activity.expense_updated", {
        actor,
        title: String(p.title ?? ""),
        amount: formatMoney(Number(p.amount) || 0, currency),
      });
    case "expense_deleted":
      return t("activity.expense_deleted", {
        actor,
        title: String(p.title ?? ""),
      });
    case "dispute_added":
      return t("activity.dispute_added", {
        actor,
        title: String(p.title ?? ""),
      });
    case "settlement_paid":
      return t("activity.settlement_paid", {
        actor,
        amount: formatMoney(Number(p.amount) || 0, currency),
        toName: nameById(String(p.toUserId ?? "")),
      });
    case "settlement_received":
      return t("activity.settlement_received", {
        actor,
        amount: formatMoney(Number(p.amount) || 0, currency),
        fromName: nameById(String(p.fromUserId ?? "")),
      });
    case "debts_cleared":
      return t("activity.debts_cleared", {
        actor,
        count: Number(p.paymentsCount ?? 0),
      });
    default:
      return a.kind;
  }
}
