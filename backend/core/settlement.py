def simplify_debts(balances: dict) -> list[dict]:
    """
    Convert net balances into a minimal set of transfers.

    IMPORTANT: works in integer cents to avoid float rounding drift.
    Positive balance => creditor, negative => debtor.
    """

    def to_cents(v) -> int:
        if isinstance(v, int):
            return v
        try:
            return int(round(float(v) * 100))
        except Exception:
            return 0

    debtors: list[list] = []
    creditors: list[list] = []
    for pid, bal in balances.items():
        c = to_cents(bal)
        if c < 0:
            debtors.append([pid, -c])
        elif c > 0:
            creditors.append([pid, c])

    debtors.sort(key=lambda x: -x[1])
    creditors.sort(key=lambda x: -x[1])

    transfers: list[dict] = []
    i = j = 0
    while i < len(debtors) and j < len(creditors):
        d_id, d_cents = debtors[i]
        c_id, c_cents = creditors[j]
        pay_cents = min(d_cents, c_cents)
        if pay_cents > 0:
            transfers.append(
                {"from": d_id, "to": c_id, "amount": round(pay_cents / 100.0, 2)}
            )
        debtors[i][1] -= pay_cents
        creditors[j][1] -= pay_cents
        if debtors[i][1] <= 0:
            i += 1
        if creditors[j][1] <= 0:
            j += 1
    return transfers
