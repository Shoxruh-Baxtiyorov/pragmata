"""Golden-set: полный пайплайн (видео → YOLO → трекинг → правила) на эталонном клипе.

Ловит регрессии всей цепочки, которые юнит-тесты не видят (потеря детекций,
сломанный hysteresis, рассыпавшийся трекинг). Диапазоны вместо точных чисел —
CPU-инференс на разных машинах даёт ±1-2 трека.

Запуск: uv run pytest -m golden  (в обычном прогоне пропускается — медленный)
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from collections import Counter
from pathlib import Path

import pytest

ROOT = Path(__file__).parent.parent
SAMPLE = ROOT / "data/samples/people.mp4"

pytestmark = pytest.mark.golden


@pytest.mark.skipif(not SAMPLE.exists(), reason="нет эталонного видео (scripts/dev_stand.sh)")
def test_full_pipeline_on_golden_clip(tmp_path: Path) -> None:
    env = os.environ | {
        "APP_ENV": "test",
        "MEDIA_DIR": str(tmp_path / "media"),
        "TELEGRAM_BOT_TOKEN": "",
        "LLM_API_KEY": "",
    }
    res = subprocess.run(
        [
            sys.executable,
            "-m",
            "soqchi.main",
            "--config",
            "config/golden.yaml",
            "--sink",
            "jsonl",
            "--offline",
            "--no-bot",
            "--duration",
            "600",
        ],
        cwd=ROOT,
        env=env,
        capture_output=True,
        text=True,
        timeout=900,
    )
    assert res.returncode == 0, res.stderr[-2000:]

    events = Counter()
    jsonl = tmp_path / "events.jsonl"
    assert jsonl.exists(), "пайплайн не записал events.jsonl"
    for line in jsonl.read_text(encoding="utf-8").splitlines():
        rec = json.loads(line)
        if rec.get("kind") == "event":
            events[rec["type"]] += 1

    # базлайн 8/8/3 — допускаем дрейф ±2 (разные CPU/версии torch)
    assert 6 <= events["person_entered"] <= 12, events
    assert 6 <= events["person_exited"] <= 12, events
    assert 1 <= events["zone_intrusion"] <= 6, events
    assert events["person_entered"] == events["person_exited"], "потерянные exited"
