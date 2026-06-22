from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.config import settings

Base = declarative_base()


class _LibSQLWrapper:
    """
    Wraps a libsql_experimental connection to add stubs for SQLAlchemy's
    pysqlite dialect, which calls create_function() at connect time for
    REGEXP support. libsql doesn't implement this API.
    """
    __slots__ = ("_conn",)

    def __init__(self, conn):
        object.__setattr__(self, "_conn", conn)

    # --- SQLAlchemy pysqlite stubs ---
    def create_function(self, *args, **kwargs):
        pass

    def create_aggregate(self, *args, **kwargs):
        pass

    # --- Delegation ---
    def __getattr__(self, name):
        return getattr(object.__getattribute__(self, "_conn"), name)

    def __setattr__(self, name, value):
        if name == "_conn":
            object.__setattr__(self, name, value)
        else:
            setattr(object.__getattribute__(self, "_conn"), name, value)


def _build_engine():
    # Turso (libSQL) takes priority when both env vars are set
    if settings.TURSO_DATABASE_URL and settings.TURSO_AUTH_TOKEN:
        import libsql_experimental as libsql

        turso_url = settings.TURSO_DATABASE_URL
        turso_token = settings.TURSO_AUTH_TOKEN

        def _get_conn():
            raw = libsql.connect(database=turso_url, auth_token=turso_token)
            return _LibSQLWrapper(raw)

        return create_engine(
            "sqlite+pysqlite:///:memory:",
            creator=_get_conn,
            poolclass=StaticPool,
            echo=settings.DATABASE_ECHO,
        )

    if settings.DATABASE_URL.startswith("sqlite"):
        eng = create_engine(
            settings.DATABASE_URL,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            echo=settings.DATABASE_ECHO,
        )

        @event.listens_for(eng, "connect")
        def set_sqlite_pragma(dbapi_conn, connection_record):
            cursor = dbapi_conn.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        return eng

    return create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        echo=settings.DATABASE_ECHO,
    )


engine = _build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    Base.metadata.create_all(bind=engine)
