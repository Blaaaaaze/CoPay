def simplify_debts(balances: dict) -> list[dict]:
    entries = [(k, float(v)) for k, v in balances.items()]
    debtors = []
    creditors = []
    for pid, b in entries:
        if b < -1e-9:
            debtors.append([pid, -b])
        elif b > 1e-9:
            creditors.append([pid, b])
    debtors.sort(key=lambda x: -x[1])
    creditors.sort(key=lambda x: -x[1])
    transfers = []
    i = j = 0
    while i < len(debtors) and j < len(creditors):
        d_id, d_amt = debtors[i]
        c_id, c_amt = creditors[j]
        pay = min(d_amt, c_amt)
        if pay > 1e-9:
            transfers.append(
                {"from": d_id, "to": c_id, "amount": round(pay, 2)}
            )
        debtors[i][1] -= pay
        creditors[j][1] -= pay
        if debtors[i][1] < 1e-9:
            i += 1
        if creditors[j][1] < 1e-9:
            j += 1
    return transfers
