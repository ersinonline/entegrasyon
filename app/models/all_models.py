from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON, DECIMAL
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Merchant(Base):
    __tablename__ = "merchants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    stores = relationship("Store", back_populates="merchant")

class Store(Base):
    __tablename__ = "stores"

    id = Column(Integer, primary_key=True, index=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"))
    marketplace_type = Column(String)  # n11, trendyol, hepsiburada, pazarama, idefix
    store_name = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    merchant = relationship("Merchant", back_populates="stores")
    credentials = relationship("StoreCredential", back_populates="store", uselist=False)
    product_mappings = relationship("ProductMapping", back_populates="store")

class StoreCredential(Base):
    __tablename__ = "store_credentials"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), unique=True)

    # Encrypted fields (storing as text/bytes encoded in base64 if needed, or just strings handled by app logic)
    # Ideally, use a type decorator for encryption. For this prototype, we'll store them and assume encryption in service layer.
    api_key = Column(String, nullable=True)
    api_secret = Column(String, nullable=True)
    username = Column(String, nullable=True)
    password = Column(String, nullable=True)
    supplier_id = Column(String, nullable=True)
    extra_data = Column(JSON, nullable=True)  # For any other specific fields

    store = relationship("Store", back_populates="credentials")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"))

    sku = Column(String, index=True, unique=True)
    title = Column(String)
    description = Column(Text, nullable=True)
    brand = Column(String, nullable=True)
    barcode = Column(String, index=True, nullable=True)

    # Inventory
    quantity = Column(Integer, default=0)
    list_price = Column(DECIMAL(10, 2))
    sale_price = Column(DECIMAL(10, 2))
    currency = Column(String, default="TRY")
    vat_rate = Column(Integer, default=18)

    images = Column(JSON, default=list) # List of image URLs
    attributes = Column(JSON, default=dict) # Key-value pairs

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    mappings = relationship("ProductMapping", back_populates="product")

class ProductMapping(Base):
    __tablename__ = "product_mappings"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"))
    product_id = Column(Integer, ForeignKey("products.id"))

    marketplace_sku = Column(String) # Their SKU / Barcode / StockCode
    marketplace_item_id = Column(String, nullable=True) # If they have a unique ID
    status = Column(String, default="PENDING") # SYNCED, ERROR, PENDING

    store = relationship("Store", back_populates="product_mappings")
    product = relationship("Product", back_populates="mappings")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"))

    marketplace_order_number = Column(String, index=True)
    package_number = Column(String, nullable=True)

    buyer_name = Column(String)
    buyer_email = Column(String, nullable=True)
    buyer_phone = Column(String, nullable=True)
    shipping_address = Column(JSON) # Structured address

    status = Column(String) # Normalized status: CREATED, PICKING, SHIPPED, CANCELLED, DELIVERED

    total_amount = Column(DECIMAL(10, 2))
    currency = Column(String, default="TRY")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    lines = relationship("OrderLine", back_populates="order")

class OrderLine(Base):
    __tablename__ = "order_lines"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))

    sku = Column(String) # Our SKU (if matched) or theirs
    product_name = Column(String)
    quantity = Column(Integer)
    price = Column(DECIMAL(10, 2))

    marketplace_line_id = Column(String, nullable=True)

    order = relationship("Order", back_populates="lines")

class IntegrationLog(Base):
    __tablename__ = "integration_logs"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)

    action = Column(String) # SYNC_PRODUCT, GET_ORDERS
    request_payload = Column(Text, nullable=True)
    response_payload = Column(Text, nullable=True)
    status_code = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
