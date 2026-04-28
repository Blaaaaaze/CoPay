from pydantic import BaseModel, Field


class ProductItem(BaseModel):
    name: str = Field(..., description="Название позиции")
    quantity: float = Field(..., description="Количество (или объём в условных единицах)")
    total_price: float = Field(..., description="Общая стоимость позиции")


class ReceiptResponse(BaseModel):
    products: list[ProductItem]
    raw_text_lines: list[str] = Field(
        default_factory=list,
        description="Распознанные строки",
    )
