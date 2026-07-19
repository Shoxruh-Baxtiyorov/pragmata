"""Завести пользователя дашборда из CLI (бутстрап первого админа).

  uv run python scripts/create_user.py --username admin --password 'Secret123' --role admin
  uv run python scripts/create_user.py --username guard1 --password 'Post123!' --full-name 'Ali'

Безопасность: работает только против локальной БД (127.0.0.1/localhost); пароль
хранится argon2id; повторный username → ошибка.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from sqlalchemy.engine import make_url

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))  # пакет не устанавливается (tool.uv.package=false)

from pragmata.config import get_settings  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--username", required=True)
    ap.add_argument("--password", required=True)
    ap.add_argument("--role", default="user", choices=["user", "admin"])
    ap.add_argument("--full-name", default=None)
    ap.add_argument("--email", default=None)
    args = ap.parse_args()

    settings = get_settings()
    host = make_url(settings.database_url).host
    if host not in ("127.0.0.1", "localhost"):
        print(f"отказ: DATABASE_URL смотрит не на локальную БД (host={host})", file=sys.stderr)
        return 2
    if len(args.password) < 8:
        print("отказ: пароль минимум 8 символов", file=sys.stderr)
        return 2

    from pragmata.api.schemas import UserCreate
    from pragmata.services import user_service

    try:
        uid = user_service.create_user(
            UserCreate(
                username=args.username,
                password=args.password,
                role=args.role,
                full_name=args.full_name,
                email=args.email,
            )
        )
    except Exception as e:  # noqa: BLE001 — CLI: печатаем причину, не трейс
        print(f"не удалось: {e}", file=sys.stderr)
        return 1
    print(f"создан пользователь '{args.username.lower()}' (role={args.role}) id={uid}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
