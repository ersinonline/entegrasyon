from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import datetime
from app.schemas.common import ProductCreate, StockPriceUpdate, OrderSchema

class BaseConnector(ABC):
    """
    Abstract Base Class for all marketplace connectors.
    Every new marketplace integration must inherit from this class.
    """

    def __init__(self, store_id: int, credentials: dict):
        self.store_id = store_id
        self.credentials = credentials

    @abstractmethod
    def validate_credentials(self) -> bool:
        """Checks if the provided credentials are valid by making a test API call."""
        pass

    @abstractmethod
    def get_products(self, page: int = 1, size: int = 50) -> List[dict]:
        """Fetches products from the marketplace."""
        pass

    @abstractmethod
    def create_product(self, product: ProductCreate) -> dict:
        """Creates a product on the marketplace."""
        pass

    @abstractmethod
    def update_stock_price(self, updates: List[StockPriceUpdate]) -> dict:
        """Updates stock and price for a list of products."""
        pass

    @abstractmethod
    def get_orders(self, start_date: datetime, end_date: datetime) -> List[OrderSchema]:
        """Fetches orders from the marketplace within a date range."""
        pass

    @abstractmethod
    def update_order_status(self, order_id: str, status: str, tracking_info: Optional[dict] = None) -> bool:
        """Updates the status of an order (e.g., to SHIPPED)."""
        pass
