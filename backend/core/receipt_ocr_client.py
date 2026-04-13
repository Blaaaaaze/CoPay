from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)


def get_ocr_base_url() -> str | None:
    u = (os.environ.get("RECEIPT_OCR_BASE_URL") or "").strip().rstrip("/")
    return u or None


def map_api_response_to_copay(data: dict[str, Any]) -> dict[str, Any]:
    products = data.get("products") or []
    items: list[dict[str, Any]] = []
    line_sum = 0.0
    for p in products:
        if not isinstance(p, dict):
            continue
        name = str(p.get("name", "")).strip()
        if not name:
            continue
        try:
            qty = float(p.get("quantity") if p.get("quantity") is not None else 1.0)
        except (TypeError, ValueError):
            qty = 1.0
        if qty <= 0:
            qty = 1.0
        try:
            total_price = float(p.get("total_price") if p.get("total_price") is not None else 0.0)
        except (TypeError, ValueError):
            total_price = 0.0
        line_sum += total_price
        unit = round(total_price / qty, 2) if qty else round(total_price, 2)
        qty_out: int | float = int(qty) if qty == int(qty) else qty
        items.append({"name": name[:400], "qty": qty_out, "price": unit})

    raw_lines = data.get("raw_text_lines") or []
    preview = None
    if isinstance(raw_lines, list) and raw_lines:
        joined = " ".join(str(x) for x in raw_lines).strip()
        if joined:
            preview = joined[:397] + "…" if len(joined) > 400 else joined
        else:
            preview = None

    total_out = round(line_sum, 2) if line_sum > 0 else None

    return {
        "items": items,
        "total": total_out,
        "note": "Распознано внешним сервисом OCR. Сверьте суммы с чеком.",
        "ocrPreview": preview,
        "source": "ocr_api",
    }


def recognize_via_ocr_api(file_bytes: bytes, filename: str = "receipt.jpg") -> dict[str, Any]:
    base = get_ocr_base_url()
    if not base:
        raise RuntimeError("RECEIPT_OCR_BASE_URL не задан")

    import httpx

    url = f"{base}/recognize"
    safe_name = filename.replace("\\", "/").split("/")[-1] or "receipt.jpg"

    try:
        with httpx.Client(timeout=120.0) as client:
            r = client.post(url, files={"file": (safe_name, file_bytes)})
    except httpx.RequestError as e:
        logger.exception("OCR API request failed")
        raise RuntimeError(f"Не удалось связаться с сервисом OCR ({url}): {e}") from e

    if r.status_code >= 400:
        detail = r.text[:500] if r.text else r.reason_phrase
        raise RuntimeError(f"Сервис OCR вернул {r.status_code}: {detail}")

    try:
        data = r.json()
    except ValueError as e:
        raise ValueError("Сервис OCR вернул не JSON") from e
    if not isinstance(data, dict):
        raise ValueError("Сервис OCR вернул не объект JSON")

    return map_api_response_to_copay(data)
