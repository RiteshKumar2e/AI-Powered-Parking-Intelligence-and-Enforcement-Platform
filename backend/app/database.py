from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.config import settings

Base = declarative_base()


def _patch_pysqlite_for_libsql():
    """
    SQLAlchemy's pysqlite dialect calls create_function() on every new
    connection to register a REGEXP helper (sqlite3 API). libsql_experimental
    doesn't implement this method, so we wrap on_connect to swallow the
    AttributeError instead of crashing at startup.
    """
    from sqlalchemy.dialects.sqlite import pysqlite as _pysqlite
    _orig = _pysqlite.SQLiteDialect_pysqlite.on_connect

    def _safe_on_connect(self):
        fn = _orig(self)
        if fn is None:
            return None

        def safe_fn(dbapi_connection):
            try:
                fn(dbapi_connection)
            except AttributeError:
                pass  # libsql doesn't have create_function — skip REGEXP setup

        return safe_fn

    _pysqlite.SQLiteDialect_pysqlite.on_connect = _safe_on_connect


def _build_engine():
    # ── Turso (libSQL) ────────────────────────────────────────────────────────
    if settings.TURSO_DATABASE_URL and settings.TURSO_AUTH_TOKEN:
        import libsql_experimental as libsql
        _patch_pysqlite_for_libsql()

        turso_url = settings.TURSO_DATABASE_URL
        turso_token = settings.TURSO_AUTH_TOKEN

        def _get_conn():
            return libsql.connect(database=turso_url, auth_token=turso_token)

        return create_engine(
            "sqlite+pysqlite:///:memory:",
            creator=_get_conn,
            poolclass=StaticPool,
            echo=settings.DATABASE_ECHO,
        )

    # ── Local SQLite ──────────────────────────────────────────────────────────
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

    # ── PostgreSQL / other ────────────────────────────────────────────────────
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
