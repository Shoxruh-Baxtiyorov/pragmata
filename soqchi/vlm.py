"""VLM-описания флагнутых событий: карточка говорит, ЧТО происходит.

Селективно (только alert), с почасовым бюджетом, в отдельном потоке — свап
модели в Ollama и инференс занимают секунды и не должны трогать камеры.
Модель отвечает строгим JSON: описание по-русски, теги и fp-подозрение
(«тень/блик/животное») — дешёвое второе мнение до того, как человек поехал
проверять объект.
"""

from __future__ import annotations

import base64
import json
import logging
import queue
import threading
import time
from collections import deque
from typing import TYPE_CHECKING, Any

import cv2

if TYPE_CHECKING:
    import uuid
    from collections.abc import Callable

    import numpy as np

log = logging.getLogger("soqchi.vlm")

PROMPT = """Ты анализируешь кадры с камеры видеонаблюдения.
Событие: {event}. Камера: «{camera}». Зона: {zone}.
Опиши одним предложением по-русски, что происходит на кадрах: сколько людей,
что делают, заметные приметы (одежда, предметы). Не выдумывай то, чего не видно.
Ответь ТОЛЬКО валидным JSON без пояснений и без markdown:
{{"description": "...", "tags": ["..."], "false_positive": false}}
false_positive=true — если на кадрах НЕТ людей (тень, блик, животное, пустая сцена)."""


def extract_json(text: str) -> dict[str, Any] | None:
    """Первый сбалансированный {...} из ответа модели (модели любят обёртки)."""
    start = text.find("{")
    while start != -1:
        depth = 0
        for i in range(start, len(text)):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    try:
                        obj = json.loads(text[start : i + 1])
                    except json.JSONDecodeError:
                        break
                    return obj if isinstance(obj, dict) else None
        start = text.find("{", start + 1)
    return None


class HourBudget:
    """Не больше N вызовов за скользящий час (бюджет из DESIGN §1.6)."""

    def __init__(self, max_per_hour: int):
        self.max = max_per_hour
        self._times: deque[float] = deque()
        self._lock = threading.Lock()

    def allow(self, now: float | None = None) -> bool:
        now = time.time() if now is None else now
        with self._lock:
            while self._times and now - self._times[0] > 3600:
                self._times.popleft()
            if len(self._times) >= self.max:
                return False
            self._times.append(now)
            return True


def _to_data_uri(image: np.ndarray, width: int = 640) -> str:
    h, w = image.shape[:2]
    if w > width:
        image = cv2.resize(image, (width, max(int(h * width / w), 1)))
    ok, buf = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 80])
    if not ok:
        raise ValueError("jpeg encode failed")
    return "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode()


class VlmDescriber:
    """Один вызов = 1-2 кадра события → структурный вердикт."""

    def __init__(self, base_url: str, api_key: str, model: str):
        from openai import OpenAI

        self.client = OpenAI(base_url=base_url, api_key=api_key, timeout=120)
        self.model = model

    def describe(
        self, event_title: str, camera_name: str, zone: str | None, frames: list[np.ndarray]
    ) -> dict[str, Any] | None:
        content: list[dict[str, Any]] = [
            {
                "type": "text",
                "text": PROMPT.format(event=event_title, camera=camera_name, zone=zone or "—"),
            }
        ]
        content += [
            {"type": "image_url", "image_url": {"url": _to_data_uri(f)}} for f in frames[:2]
        ]
        resp = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": content}],  # type: ignore[list-item, misc]
            temperature=0.1,
        )
        raw = resp.choices[0].message.content or ""
        verdict = extract_json(raw)
        if verdict is None or not isinstance(verdict.get("description"), str):
            log.warning("vlm: не смог распарсить ответ: %.200s", raw)
            return None
        return {
            "description": verdict["description"].strip()[:1900],
            "tags": [str(t) for t in verdict.get("tags", []) if isinstance(t, str)][:8],
            "false_positive": bool(verdict.get("false_positive", False)),
        }


class VlmWorker(threading.Thread):
    """Очередь описаний: alert → (кадры) → описание → БД + дописать caption в TG."""

    def __init__(
        self,
        describer: VlmDescriber,
        budget: HourBudget,
        persist: Callable[[uuid.UUID, str, dict[str, Any]], None],
        notify: Callable[[uuid.UUID, str, bool], None] | None,
        stop_event: threading.Event,
    ):
        super().__init__(name="vlm-worker", daemon=True)
        self.describer = describer
        self.budget = budget
        self.persist = persist
        self.notify = notify
        self.stop_event = stop_event
        self._q: queue.Queue[tuple[uuid.UUID, str, str, str | None, list[np.ndarray]]] = (
            queue.Queue(maxsize=32)
        )

    def enqueue(
        self,
        event_id: uuid.UUID,
        event_title: str,
        camera_name: str,
        zone: str | None,
        frames: list[np.ndarray],
    ) -> None:
        if not self.budget.allow():
            log.info("vlm: почасовой бюджет исчерпан, событие %s пропущено", event_id)
            return
        try:
            self._q.put_nowait((event_id, event_title, camera_name, zone, frames))
        except queue.Full:
            log.warning("vlm: очередь полна, событие %s пропущено", event_id)

    def run(self) -> None:
        while not self.stop_event.is_set():
            try:
                event_id, title, camera, zone, frames = self._q.get(timeout=1)
            except queue.Empty:
                continue
            try:
                verdict = self.describer.describe(title, camera, zone, frames)
            except Exception:  # noqa: BLE001 — сбой VLM не должен ничего ронять
                log.exception("vlm describe failed event=%s", event_id)
                continue
            if verdict is None:
                continue
            self.persist(event_id, verdict["description"], verdict)
            if self.notify is not None:
                self.notify(event_id, verdict["description"], verdict["false_positive"])
            log.info("vlm: %s → %.120s", event_id, verdict["description"])
