"""Локальный OCR на базе EasyOCR (предобученные модели детекции и распознавания)."""

from __future__ import annotations

import io
import logging
from typing import Any

import easyocr
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

_reader: easyocr.Reader | None = None


def get_reader(langs: tuple[str, ...] = ("ru", "en")) -> easyocr.Reader:
    global _reader
    if _reader is None:
        logger.info("Загрузка EasyOCR (при первом запуске скачиваются веса моделей)...")
        _reader = easyocr.Reader(list(langs), gpu=False, verbose=False)
    return _reader


def image_to_numpy(image_bytes: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return np.array(img)


def run_ocr(image_bytes: bytes, langs: tuple[str, ...] = ("ru", "en")) -> list[tuple[Any, str, float]]:
    """
    Возвращает список (bbox, text, confidence).
    """
    reader = get_reader(langs)
    arr = image_to_numpy(image_bytes)
    return reader.readtext(arr, detail=1, paragraph=False)
