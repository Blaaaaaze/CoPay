"""
Модульные тесты расчётной логики (5 сценариев из отчёта по практике).
"""

from decimal import Decimal

from django.test import SimpleTestCase

from core.expense_utils import shares_from_line_items
from core.settlement import simplify_debts


class CalculationModuleTests(SimpleTestCase):
    def test_three_participants_two_line_items(self):
        """
        3 участника, 2 позиции расчёта.
        Проверка корректности базового распределения долей и суммарного значения.
        """
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

    def test_ten_participants_twenty_five_lines_total_40127(self):
        """
        10 участников, 25 позиций, общая стоимость 40 127 ₽, поровну между всеми.
        Устойчивость алгоритма при большом объёме входных данных.
        """
        member_ids = {f"u{i}" for i in range(10)}
        all_pids = [f"u{i}" for i in range(10)]
        # 24 × 1605 + 1607 = 40 127
        amounts = ["1605"] * 24 + ["1607"]
        line_items = [
            {"name": f"Product {i + 1}", "amount": amt, "participantIds": all_pids}
            for i, amt in enumerate(amounts)
        ]

        total, owed, stored = shares_from_line_items(member_ids, line_items)

        self.assertEqual(total, Decimal("40127"))
        self.assertEqual(len(stored), 25)
        expected_per_person = 4012.7
        for mid in member_ids:
            self.assertAlmostEqual(owed[mid], expected_per_person, places=6)

    def test_three_balances_minimal_transfers(self):
        """
        3 участника с балансами +100, −60 и −40 (рубли).
        Минимальный набор переводов для закрытия задолженности.
        """
        balances = {"alice": 100.0, "bob": -60.0, "carol": -40.0}

        transfers = simplify_debts(balances)

        self.assertEqual(
            transfers,
            [
                {"from": "bob", "to": "alice", "amount": 60.0},
                {"from": "carol", "to": "alice", "amount": 40.0},
            ],
        )

    def test_rounding_to_two_decimal_places(self):
        """
        2 баланса со значениями с более чем двумя знаками после запятой.
        """
        balances = {"a": 10.005, "b": -10.005}

        transfers = simplify_debts(balances)

        self.assertEqual(transfers, [{"from": "b", "to": "a", "amount": 10.01}])

    def test_ignore_near_zero_balances(self):
        """
        2 баланса, близкие к нулю — без ложных микропереводов.
        """
        balances = {"a": 0.0000000001, "b": -0.0000000001}

        transfers = simplify_debts(balances)

        self.assertEqual(transfers, [])
