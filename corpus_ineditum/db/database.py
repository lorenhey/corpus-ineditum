from sqlmodel import SQLModel, create_engine, Session
import os

# Database file will be created in the current working directory or a specified path
DB_FILE = os.environ.get("CORPUS_INEDITUM_DB", "corpus_ineditum.db")
sqlite_url = f"sqlite:///{DB_FILE}"

engine = create_engine(sqlite_url, echo=False)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
