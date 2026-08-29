import os
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool
from alembic import context
from dotenv import load_dotenv

# Load env and models
load_dotenv(Path(__file__).parent.parent / '.env')

import sys
sys.path.append(str(Path(__file__).parent.parent))
from models import Base  # noqa: E402

config = context.config

# Use a SYNC driver (psycopg2) for Alembic; strip any +asyncpg.
sync_url = os.environ['DATABASE_URL'].replace('postgresql+asyncpg://', 'postgresql://')
config.set_main_option('sqlalchemy.url', sync_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=sync_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
