from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.all_models import Store, StoreCredential, Merchant, Order, OrderLine
from app.schemas.common import StoreCreate, StoreResponse, OrderSchema
from app.connectors.n11 import N11Connector
from app.core.security import encrypt_value, decrypt_value

router = APIRouter()

@router.post("/merchants/", response_model=dict)
def create_merchant(name: str, email: str, db: Session = Depends(get_db)):
    db_merchant = Merchant(name=name, email=email)
    db.add(db_merchant)
    db.commit()
    db.refresh(db_merchant)
    return {"id": db_merchant.id, "name": db_merchant.name}

@router.post("/stores/", response_model=StoreResponse)
def create_store(store: StoreCreate, merchant_id: int, db: Session = Depends(get_db)):
    # 1. Save Store
    db_store = Store(
        merchant_id=merchant_id,
        marketplace_type=store.marketplace_type,
        store_name=store.store_name
    )
    db.add(db_store)
    db.commit()
    db.refresh(db_store)

    # 2. Save Credentials (Encrypted)
    db_creds = StoreCredential(
        store_id=db_store.id,
        api_key=encrypt_value(store.api_key),
        api_secret=encrypt_value(store.api_secret),
        username=encrypt_value(store.username),
        password=encrypt_value(store.password),
        supplier_id=encrypt_value(store.supplier_id)
    )
    db.add(db_creds)
    db.commit()

    return db_store

@router.post("/stores/{store_id}/sync-orders", response_model=List[OrderSchema])
def sync_orders(store_id: int, db: Session = Depends(get_db)):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    creds = store.credentials
    if not creds:
        raise HTTPException(status_code=400, detail="Store credentials not found")

    # Prepare credential dict (Decrypted)
    cred_dict = {
        "api_key": decrypt_value(creds.api_key),
        "api_secret": decrypt_value(creds.api_secret),
        "username": decrypt_value(creds.username),
        "password": decrypt_value(creds.password),
        "supplier_id": decrypt_value(creds.supplier_id)
    }

    # Factory logic (simple for now)
    connector = None
    if store.marketplace_type.lower() == "n11":
        connector = N11Connector(store_id=store.id, credentials=cred_dict)
    else:
        raise HTTPException(status_code=400, detail="Connector not implemented")

    # Mock date range
    from datetime import datetime, timedelta
    fetched_orders = connector.get_orders(datetime.now() - timedelta(days=1), datetime.now())

    # Save orders to DB
    saved_orders = []
    for order_data in fetched_orders:
        # Check if order already exists
        existing_order = db.query(Order).filter(
            Order.marketplace_order_number == order_data.marketplace_order_number,
            Order.store_id == store_id
        ).first()

        if existing_order:
            # Update status if changed
            if existing_order.status != order_data.status:
                existing_order.status = order_data.status
                # We could log this change here

            # Update other fields if necessary
            existing_order.updated_at = datetime.utcnow()

            saved_orders.append(order_data)
            continue

        new_order = Order(
            store_id=store_id,
            marketplace_order_number=order_data.marketplace_order_number,
            package_number=order_data.package_number,
            buyer_name=order_data.buyer_name,
            buyer_email=order_data.buyer_email,
            buyer_phone=order_data.buyer_phone,
            shipping_address=order_data.shipping_address,
            status=order_data.status,
            total_amount=order_data.total_amount,
            currency=order_data.currency
        )
        db.add(new_order)
        db.flush() # Get ID

        for line in order_data.lines:
            new_line = OrderLine(
                order_id=new_order.id,
                sku=line.sku,
                product_name=line.product_name,
                quantity=line.quantity,
                price=line.price,
                marketplace_line_id=line.marketplace_line_id
            )
            db.add(new_line)

        saved_orders.append(order_data)

    db.commit()

    return saved_orders
