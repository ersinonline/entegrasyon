
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db

# Setup in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def setup_module(module):
    Base.metadata.create_all(bind=engine)

def teardown_module(module):
    Base.metadata.drop_all(bind=engine)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to Marketplace Integration API"}

def test_create_merchant_and_store():
    # 1. Create Merchant
    response = client.post(
        "/api/v1/merchants/",
        params={"name": "Test Merchant", "email": "test@merchant.com"}
    )
    assert response.status_code == 200
    merchant_id = response.json()["id"]

    # 2. Create Store
    store_payload = {
        "marketplace_type": "n11",
        "store_name": "My N11 Store",
        "api_key": "test_key",
        "api_secret": "test_secret"
    }
    response = client.post(
        f"/api/v1/stores/?merchant_id={merchant_id}",
        json=store_payload
    )
    assert response.status_code == 200
    data = response.json()
    assert data["store_name"] == "My N11 Store"
    store_id = data["id"]

    # 3. Test Sync (Mocked)
    response = client.post(f"/api/v1/stores/{store_id}/sync-orders")
    assert response.status_code == 200
    orders = response.json()
    assert len(orders) > 0
    assert orders[0]["marketplace_order_number"] == "N11-999001"
