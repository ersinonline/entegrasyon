from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

# --- Product Schemas ---

class ProductBase(BaseModel):
    sku: str
    title: str
    description: Optional[str] = None
    brand: Optional[str] = None
    barcode: Optional[str] = None
    quantity: int = 0
    list_price: Decimal
    sale_price: Decimal
    currency: str = "TRY"
    vat_rate: int = 18
    images: List[str] = []
    attributes: dict = {}

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: int
    merchant_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Inventory/Price Update Schema ---

class StockPriceUpdate(BaseModel):
    sku: str
    quantity: Optional[int] = None
    list_price: Optional[Decimal] = None
    sale_price: Optional[Decimal] = None

# --- Order Schemas ---

class OrderLineSchema(BaseModel):
    sku: str
    product_name: str
    quantity: int
    price: Decimal
    marketplace_line_id: Optional[str] = None

class OrderSchema(BaseModel):
    marketplace_order_number: str
    package_number: Optional[str] = None
    buyer_name: str
    buyer_email: Optional[str] = None
    buyer_phone: Optional[str] = None
    shipping_address: dict
    status: str
    total_amount: Decimal
    currency: str = "TRY"
    lines: List[OrderLineSchema]

# --- Store Schema ---

class StoreCreate(BaseModel):
    marketplace_type: str
    store_name: str
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    supplier_id: Optional[str] = None

class StoreResponse(BaseModel):
    id: int
    marketplace_type: str
    store_name: str
    is_active: bool

    class Config:
        from_attributes = True
