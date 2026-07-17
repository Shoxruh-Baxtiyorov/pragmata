"""Экспорт OpenAPI-контракта в openapi.json (паттерн iqbola make api-schema).

  uv run python scripts/generate_openapi.py           # записать
  uv run python scripts/generate_openapi.py --check    # CI: упасть, если устарел

Фронт генерит типы из этого файла — рассинхрон ловим в CI, а не в рантайме.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

os.environ.setdefault("APP_ENV", "test")  # не требуем боевых секретов для схемы

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))  # пакет не устанавливается (tool.uv.package=false)
OUT = ROOT / "openapi.json"


def current_schema() -> str:
    from soqchi.api.app import app

    return json.dumps(app.openapi(), indent=2, ensure_ascii=False, sort_keys=True) + "\n"


def main() -> int:
    schema = current_schema()
    if "--check" in sys.argv:
        if not OUT.exists() or OUT.read_text(encoding="utf-8") != schema:
            print("openapi.json устарел — запусти: uv run python scripts/generate_openapi.py")
            return 1
        print("openapi.json актуален")
        return 0
    OUT.write_text(schema, encoding="utf-8")
    print(f"записано: {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
