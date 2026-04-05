from decimal import Decimal, InvalidOperation
from typing import Any


def shares_from_line_items(
    member_ids: set[str], line_items: list[dict[str, Any]]
) -> tuple[Decimal, dict[str, float], list[dict]]:
    """
    line_items: [{ "name": str, "amount": num, "participantIds": [uuid str, ...] }]
    Returns (total_amount, shares_by_member_id, cleaned_line_items for storage).
    """
    owed: dict[str, float] = {mid: 0.0 for mid in member_ids}
    total = Decimal(0)
    stored: list[dict] = []
    for line in line_items or []:
        name = str(line.get("name") or "").strip()[:300]
        try:
            amt = Decimal(str(line.get("amount")))
        except (InvalidOperation, TypeError, ValueError):
            continue
        if amt <= 0 or not name:
            continue
        pids = [str(x) for x in (line.get("participantIds") or []) if str(x) in member_ids]
        pids = list(dict.fromkeys(pids))
        if not pids:
            continue
        total += amt
        per = float(amt) / len(pids)
        for p in pids:
            owed[p] += per
        stored.append({"name": name, "amount": float(amt), "participantIds": pids})
    return total, owed, stored
