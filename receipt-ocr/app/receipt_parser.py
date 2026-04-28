"""
Парсинг чека после OCR: табличная раскладка (колонки) + запасной режим по одной строке текста.
"""

from __future__ import annotations

import re
import statistics
from dataclasses import dataclass
from typing import Any

from app.schemas import ProductItem


def _bbox_center_y(bbox: list[list[float]]) -> float:
    ys = [float(p[1]) for p in bbox]
    return sum(ys) / len(ys)


def _bbox_center_x(bbox: list[list[float]]) -> float:
    xs = [float(p[0]) for p in bbox]
    return sum(xs) / len(xs)


def _bbox_left_x(bbox: list[list[float]]) -> float:
    return min(float(p[0]) for p in bbox)


def _bbox_right_x(bbox: list[list[float]]) -> float:
    return max(float(p[0]) for p in bbox)


def _bbox_height(bbox: list[list[float]]) -> float:
    ys = [float(p[1]) for p in bbox]
    return max(ys) - min(ys)


def _page_width(detections: list[tuple[Any, str, float]]) -> float:
    xs: list[float] = []
    for bbox, _, _ in detections:
        for p in bbox:
            xs.append(float(p[0]))
    if not xs:
        return 800.0
    return max(xs) - min(xs) or 800.0


def _detections_to_items(
    detections: list[tuple[Any, str, float]],
) -> list[tuple[list[list[float]], str, float]]:
    out: list[tuple[list[list[float]], str, float]] = []
    for bbox, text, conf in detections:
        t = (text or "").strip()
        if not t or conf < 0.12:
            continue
        # EasyOCR может вернуть numpy-массив
        bb = [[float(p[0]), float(p[1])] for p in bbox]
        out.append((bb, t, conf))
    return out


def cluster_into_rows(
    items: list[tuple[list[list[float]], str, float]],
) -> list[list[tuple[list[list[float]], str, float]]]:
    if not items:
        return []
    heights = [_bbox_height(b) for b, _, _ in items]
    avg_h = statistics.mean(heights) if heights else 12.0
    y_tol = max(avg_h * 0.65, 6.0)

    rows: list[list[tuple[list[list[float]], str, float]]] = []
    for bbox, text, conf in items:
        cy = _bbox_center_y(bbox)
        placed = False
        for row in rows:
            ref = statistics.mean(_bbox_center_y(b) for b, _, _ in row)
            if abs(cy - ref) <= y_tol:
                row.append((bbox, text, conf))
                placed = True
                break
        if not placed:
            rows.append([(bbox, text, conf)])

    rows.sort(key=lambda r: statistics.mean(_bbox_center_y(b) for b, _, _ in r))
    return rows


def _split_row_into_columns(
    row: list[tuple[list[list[float]], str, float]],
    page_w: float,
) -> list[str]:
    """Склеивает фрагменты в колонки по большим горизонтальным разрывам."""
    parts = sorted(
        ((_bbox_center_x(b), _bbox_left_x(b), _bbox_right_x(b), t) for b, t, _ in row),
        key=lambda x: x[1],
    )
    if not parts:
        return []
    centers = [p[0] for p in parts]
    if len(centers) == 1:
        return [parts[0][3].strip()]

    gaps = [centers[i + 1] - centers[i] for i in range(len(centers) - 1)]
    med = statistics.median(gaps) if gaps else 0.0
    # Между колонками зазор обычно в разы больше, чем между частями одной ячейки.
    # Старый порог med*1.35 сливал соседние колонки при типичных ~100–200 px.
    thr = max(med * 0.5, page_w * 0.012, 8.0)

    cols: list[list[str]] = []
    cur: list[str] = []
    for i, p in enumerate(parts):
        _, _, _, t = p
        if not cur:
            cur.append(t.strip())
            continue
        gap = centers[i] - centers[i - 1]
        if gap > thr:
            cols.append(cur)
            cur = [t.strip()]
        else:
            cur.append(t.strip())
    if cur:
        cols.append(cur)
    return [" ".join(c).strip() for c in cols]


_MONEY_TOKEN = re.compile(
    r"(?P<num>\d+(?:[.,]\d{1,2})?)\s*(?:₽|руб\.?)?",
    re.IGNORECASE,
)


def _parse_money_tokens(s: str) -> list[float]:
    out: list[float] = []
    for m in _MONEY_TOKEN.finditer(s):
        raw = m.group("num").replace(",", ".")
        try:
            v = float(raw)
        except ValueError:
            continue
        if 0 < v < 1e7:
            out.append(v)
    return out


def _last_money(s: str) -> float | None:
    nums = _parse_money_tokens(s)
    return nums[-1] if nums else None


def _row_is_nds_line(cells_joined: str) -> bool:
    s = cells_joined.lower()
    return "ндс" in s and "%" in cells_joined


def _row_is_header(cols: list[str]) -> bool:
    joined = " ".join(cols).lower()
    if "товар" not in joined:
        return False
    return "стоим" in joined or "кол" in joined or "цена" in joined


def _row_is_footer_stop(cols: list[str]) -> bool:
    j = " ".join(cols).lower()
    if cols:
        first = cols[0].strip().lower()
        if first in ("итого", "total", "всего") or first.startswith("итого"):
            return True
    if "итого" in j:
        return True
    if re.search(r"\btotal\b", j, re.IGNORECASE):
        return True
    if j.strip().startswith("всего") and _last_money(j):
        return True
    return False


_SKIP_SUBSTR_LINE = (
    "итого",
    "всего",
    "сдача",
    "наличными",
    "картой",
    "сбп",
    "qr",
    "фн ",
    "фд ",
    "фп ",
    "рн ккт",
    "инн",
    "кассир",
    "чек ",
    "сайт фнс",
    "оплата",
    "приход",
    "продажа",
    "кассовый чек",
    "ооо ",
    "ул.",
    "система налогообложения",
    "фиск",
    "код ккт",
    "офд",
    "www.",
    "1-ofd",
)


def _should_skip_non_table_line(line_lower: str) -> bool:
    s = line_lower.strip()
    if len(s) < 2:
        return True
    for sub in _SKIP_SUBSTR_LINE:
        if sub in s:
            return True
    if re.match(r"^\d{1,2}[./]\d{1,2}[./]\d{2,4}", s):
        return True
    if re.match(r"^\d{2}:\d{2}", s):
        return True
    return False


def _normalize_product_label(name: str) -> str:
    """
    Краткое имя для отображения (ожидание: «Липтон», «Молоко»).
    """
    raw = re.sub(r"\s+", " ", name).strip()
    low = raw.lower()
    if "липтон" in low:
        return "Липтон"
    if low.startswith("молоко"):
        return "Молоко"
    return raw


def _parse_quantity_from_cells(cols: list[str]) -> float | None:
    """Типичная сетка: Товар | Цена | Кол-во | Стоимость — количество в 3-й колонке."""
    if len(cols) >= 4:
        q = cols[2].strip().replace(",", ".")
        if re.fullmatch(r"\d{1,4}", q):
            return float(int(q))
        if re.fullmatch(r"\d+[.,]\d{1,3}", q):
            try:
                return float(q.replace(",", "."))
            except ValueError:
                pass
    if len(cols) == 3:
        c = cols[1].strip().replace(",", ".")
        if re.fullmatch(r"\d{1,4}", c):
            return float(int(c))
    return None


def parse_table_products(
    detections: list[tuple[Any, str, float]],
) -> list[ProductItem]:
    items = _detections_to_items(detections)
    if not items:
        return []
    page_w = _page_width(detections)
    rows = cluster_into_rows(items)

    products: list[ProductItem] = []
    seen_header = False

    for row in rows:
        cols = _split_row_into_columns(row, page_w)
        if not cols:
            continue
        joined = " ".join(cols)

        if _row_is_header(cols):
            seen_header = True
            continue

        if _row_is_nds_line(joined):
            continue

        if _row_is_footer_stop(cols):
            break

        if not seen_header:
            # без явной шапки «Товар» — пробуем только строки с несколькими колонками и суммой справа
            if len(cols) < 3:
                continue

        if len(cols) < 2:
            continue

        name_raw = cols[0].strip()
        low = name_raw.lower()
        if len(name_raw) < 2:
            continue
        if any(x in low for x in ("ндс", "итого", "сдача", "наличными")):
            continue
        if _should_skip_non_table_line(low):
            continue

        total_val = _last_money(cols[-1])
        if total_val is None:
            continue

        # строка только из чисел / без букв в названии
        if not re.search(r"[a-zа-яё]", name_raw, re.IGNORECASE):
            continue

        qty = _parse_quantity_from_cells(cols)
        if qty is None:
            nums = _parse_money_tokens(joined)
            if len(nums) >= 2:
                prev = nums[-2]
                if prev < 10000 and abs(prev - round(prev)) < 1e-6 and 1 <= prev <= 9999:
                    qty = float(prev)
            if qty is None:
                qty = 1.0

        label = _normalize_product_label(name_raw)
        products.append(
            ProductItem(
                name=label,
                quantity=round(qty, 4),
                total_price=round(total_val, 2),
            )
        )

    return products


def group_into_lines(detections: list[tuple[Any, str, float]]) -> list[str]:
    """Склеивает фрагменты EasyOCR в строки по вертикали."""
    items = _detections_to_items(detections)
    rows = cluster_into_rows(items)
    result: list[str] = []
    for row in rows:
        parts = sorted(
            ((_bbox_left_x(b), t) for b, t, _ in row),
            key=lambda x: x[0],
        )
        line_text = " ".join(p[1] for p in parts).strip()
        if line_text:
            result.append(line_text)
    return result


@dataclass
class _ParsedLine:
    name: str
    quantity: float
    total: float


def _clean_name(part: str) -> str:
    part = re.sub(r"\s+", " ", part).strip()
    part = re.sub(r"^[\d\s.,xх]+", "", part, flags=re.IGNORECASE)
    part = re.sub(r"[\d\s.,xх]+$", "", part, flags=re.IGNORECASE)
    return part.strip(" -—.")


def _parse_product_line(line: str) -> _ParsedLine | None:
    line = re.sub(r"\s+", " ", line).strip()
    nums = _parse_money_tokens(line)
    if not nums:
        return None

    m = re.search(
        r"(\d+(?:[.,]\d+)?)\s*[xх]\s*(\d+(?:[.,]\d{1,2})?)",
        line,
        re.IGNORECASE,
    )
    qty = 1.0
    total = nums[-1]

    if m:
        try:
            qty = float(m.group(1).replace(",", "."))
        except ValueError:
            qty = 1.0
        if len(nums) >= 2:
            total = nums[-1]
        else:
            try:
                unit = float(m.group(2).replace(",", "."))
                total = round(unit * qty, 2)
            except ValueError:
                pass
        name = _clean_name(line[: m.start()] + line[m.end() :])
    else:
        total = nums[-1]
        if len(nums) >= 2:
            prev = nums[-2]
            if prev < 1000 and (abs(prev - round(prev)) < 1e-6) and prev >= 1:
                qty = float(prev)
            elif len(nums) >= 3:
                qty = nums[-3]
        tail_pattern = re.compile(
            r"([\d.,\s]+[xх]\s*[\d.,]+|[\d.,]+\s*)+$",
            re.IGNORECASE,
        )
        name_part = tail_pattern.sub("", line).strip()
        if not name_part:
            parts = line.split()
            cut = len(parts)
            num_tail = 0
            for i in range(len(parts) - 1, -1, -1):
                if re.match(r"^[\d.,]+$", parts[i]) or re.match(r"^[xх]$", parts[i], re.I):
                    num_tail += 1
                    if num_tail >= 2:
                        cut = i
                        break
                else:
                    break
            name_part = " ".join(parts[:cut]) if cut > 0 else line
        name = _clean_name(name_part)

    if len(name) < 2:
        return None
    if qty <= 0:
        qty = 1.0
    name = _normalize_product_label(name)
    return _ParsedLine(name=name, quantity=round(qty, 4), total=round(total, 2))


def lines_to_products(lines: list[str]) -> list[ProductItem]:
    products: list[ProductItem] = []
    for line in lines:
        low = line.lower()
        if _should_skip_non_table_line(low):
            continue
        parsed = _parse_product_line(line)
        if parsed is None:
            continue
        products.append(
            ProductItem(
                name=parsed.name,
                quantity=parsed.quantity,
                total_price=parsed.total,
            )
        )
    return products


def parse_receipt_ocr(detections: list[tuple[Any, str, float]]) -> tuple[list[ProductItem], list[str]]:
    raw_lines = group_into_lines(detections)
    table = parse_table_products(detections)
    if table:
        return table, raw_lines
    return lines_to_products(raw_lines), raw_lines
