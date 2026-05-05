from decimal import Decimal

from django.test import SimpleTestCase

from core.expense_utils import shares_from_line_items
from core.settlement import simplify_debts


class SharesFromLineItemsTests(SimpleTestCase):
    def test_splits_valid_lines_between_participants(self):
        member_ids = {"u1", "u2", "u3"}
        line_items = [
            {"name": "Milk", "amount": "120", "participantIds": ["u1", "u2"]},
            {"name": "Bread", "amount": "90", "participantIds": ["u2", "u3"]},
        ]

        total, owed, stored = shares_from_line_items(member_ids, line_items)

        self.assertEqual(total, Decimal("210"))
        self.assertAlmostEqual(owed["u1"], 60.0, places=6)
        self.assertAlmostEqual(owed["u2"], 105.0, places=6)
        self.assertAlmostEqual(owed["u3"], 45.0, places=6)
        self.assertEqual(len(stored), 2)

    def test_ignores_invalid_and_non_positive_lines(self):
        member_ids = {"u1", "u2"}
        line_items = [
            {"name": "Bad amount", "amount": "abc", "participantIds": ["u1"]},
            {"name": "Zero", "amount": "0", "participantIds": ["u1"]},
            {"name": "Negative", "amount": "-10", "participantIds": ["u1"]},
            {"name": "", "amount": "100", "participantIds": ["u1"]},
            {"name": "No participants", "amount": "100", "participantIds": []},
        ]

        total, owed, stored = shares_from_line_items(member_ids, line_items)

        self.assertEqual(total, Decimal("0"))
        self.assertEqual(owed, {"u1": 0.0, "u2": 0.0})
        self.assertEqual(stored, [])

    def test_deduplicates_participants_inside_single_line(self):
        member_ids = {"u1", "u2"}
        line_items = [
            {"name": "Pizza", "amount": "300", "participantIds": ["u1", "u1", "u2"]},
        ]

        total, owed, stored = shares_from_line_items(member_ids, line_items)

        self.assertEqual(total, Decimal("300"))
        self.assertAlmostEqual(owed["u1"], 150.0, places=6)
        self.assertAlmostEqual(owed["u2"], 150.0, places=6)
        self.assertEqual(stored[0]["participantIds"], ["u1", "u2"])

    def test_ignores_unknown_participant_ids(self):
        member_ids = {"u1", "u2"}
        line_items = [
            {"name": "Coffee", "amount": "200", "participantIds": ["u1", "ghost"]},
        ]

        total, owed, stored = shares_from_line_items(member_ids, line_items)

        self.assertEqual(total, Decimal("200"))
        self.assertAlmostEqual(owed["u1"], 200.0, places=6)
        self.assertAlmostEqual(owed["u2"], 0.0, places=6)
        self.assertEqual(stored[0]["participantIds"], ["u1"])


class SimplifyDebtsTests(SimpleTestCase):
    def test_builds_transfers_for_simple_case(self):
        balances = {"alice": 100, "bob": -60, "carol": -40}

        transfers = simplify_debts(balances)

        self.assertEqual(
            transfers,
            [
                {"from": "bob", "to": "alice", "amount": 60.0},
                {"from": "carol", "to": "alice", "amount": 40.0},
            ],
        )

    def test_rounds_transfer_amounts_to_two_decimals(self):
        balances = {"a": 10.005, "b": -10.005}

        transfers = simplify_debts(balances)

        self.assertEqual(transfers, [{"from": "b", "to": "a", "amount": 10.01}])

    def test_ignores_tiny_residuals(self):
        balances = {"a": 0.0000000001, "b": -0.0000000001}

        transfers = simplify_debts(balances)

        self.assertEqual(transfers, [])
