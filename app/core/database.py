from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# Using SQLite for simplicity in this prototype.
# In production, use PostgreSQL: 'postgresql://user:password@localhost/dbname'
SQLALCHEMY_DATABASE_URL = "sqlite:///./marketplace.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
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
