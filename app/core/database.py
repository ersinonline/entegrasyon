from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

import os

# Using SQLite for simplicity in this prototype.
# In production, use PostgreSQL: 'postgresql://user:password@localhost/dbname'
# On Vercel/Serverless, the root directory is read-only. We must use /tmp or a real DB.
# We default to /tmp/marketplace.db if no env var is set.
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:////tmp/marketplace.db")

connect_args = {}
if "sqlite" in SQLALCHEMY_DATABASE_URL:
    connect_args = {"check_same_thread": False}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
