from fastapi import FastAPI
from app.routers import marketplace
from app.core.database import engine, Base

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Pazaryeri Entegrasyon API")

app.include_router(marketplace.router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "Welcome to Marketplace Integration API"}
