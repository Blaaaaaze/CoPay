"""
Сервис распознавания чеков: загрузка изображения → локальный OCR (EasyOCR) → разбор позиций.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, UploadFile

from app.ocr_engine import run_ocr
from app.receipt_parser import parse_receipt_ocr
from app.schemas import ReceiptResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MAX_IMAGE_BYTES = 15 * 1024 * 1024
ALLOWED_CONTENT_TYPES = frozenset(
    {"image/jpeg", "image/png", "image/webp", "image/bmp", "image/tiff"},
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Предзагрузка моделей при старте (если не нужно — закомментируйте)
    from app.ocr_engine import get_reader

    get_reader()
    logger.info("EasyOCR готов к работе")
    yield


app = FastAPI(
    title="Receipt OCR",
    description="Распознавание чека локальными моделями (EasyOCR). Возвращает позиции: название, количество, сумма.",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/recognize", response_model=ReceiptResponse)
async def recognize(file: UploadFile = File(...)):
    """
    Принимает файл изображения чека (JPEG/PNG/WebP и др.).
    Первый запуск скачает веса моделей EasyOCR в локальный кэш.
    """
    ct = (file.content_type or "").split(";")[0].strip().lower()
    if ct and ct not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Неподдерживаемый тип: {file.content_type}. Используйте JPEG, PNG или WebP.",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Пустой файл")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Файл слишком большой (макс. 15 МБ)")

    try:
        detections = run_ocr(data)
    except Exception as e:
        logger.exception("OCR failed")
        raise HTTPException(status_code=500, detail=f"Ошибка распознавания: {e!s}") from e

    products, raw_lines = parse_receipt_ocr(detections)
    return ReceiptResponse(products=products, raw_text_lines=raw_lines)
