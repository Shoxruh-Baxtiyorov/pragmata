"""VLM-описания флагнутых событий: карточка говорит, ЧТО происходит.

Селективно (только alert), с почасовым бюджетом, в отдельном потоке — свап
модели в Ollama и инференс занимают секунды и не должны трогать камеры.
Модель отвечает строгим JSON: описание по-русски, теги и fp-подозрение
(«тень/блик/животное») — дешёвое второе мнение до того, как человек поехал
проверять объект.
"""

from __future__ import annotations

import base64
import contextlib
import json
import logging
import queue
import threading
import time
from collections import deque
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

import cv2

if TYPE_CHECKING:
    import uuid
    from collections.abc import Callable

    import numpy as np

    from pragmata.config import CameraConfig

log = logging.getLogger("pragmata.vlm")

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

    def check_weapon(self, frames: list[np.ndarray]) -> tuple[bool, str]:
        """Есть ли на кадрах оружие? → (found, тип). Vision-модель, офлайн."""
        content: list[dict[str, Any]] = [{"type": "text", "text": WEAPON_PROMPT}]
        content += [
            {"type": "image_url", "image_url": {"url": _to_data_uri(f)}} for f in frames[:2]
        ]
        resp = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": content}],  # type: ignore[list-item, misc]
            temperature=0.0,
        )
        verdict = extract_json(resp.choices[0].message.content or "")
        if verdict is None:
            return False, ""
        return bool(verdict.get("weapon", False)), str(verdict.get("type", ""))[:40]

    def check(self, frames: list[np.ndarray], spec: VisionCheck) -> tuple[bool, str]:
        """Обобщённая vision-проверка по реестру: (найдено, деталь). Офлайн VLM."""
        content: list[dict[str, Any]] = [{"type": "text", "text": spec.prompt}]
        content += [
            {"type": "image_url", "image_url": {"url": _to_data_uri(f)}} for f in frames[:2]
        ]
        resp = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": content}],  # type: ignore[list-item, misc]
            temperature=0.0,
        )
        v = extract_json(resp.choices[0].message.content or "")
        if v is None:
            return False, ""
        return bool(v.get(spec.key, False)), str(v.get(spec.detail_key, ""))[:60]


WEAPON_PROMPT = """Внимательно осмотри кадры с камеры. Есть ли у людей ОРУЖИЕ в руках:
пистолет, ружьё, нож, топор, бита? Обычные предметы (телефон, сумка, зонт) — НЕ оружие.
Ответь ТОЛЬКО JSON без пояснений:
{"weapon": true|false, "type": "пистолет|нож|..."}
weapon=true ТОЛЬКО если оружие явно видно. Сомневаешься — false."""

HYGIENE_PROMPT = """Кадры с кухни/пищевого производства. Нарушает ли персонал гигиену:
работает БЕЗ перчаток или БЕЗ шапочки/головного убора? Ответь ТОЛЬКО JSON:
{"violation": true|false, "detail": "нет перчаток|нет шапочки|..."}
violation=true только если нарушение явно видно. Сомневаешься — false."""

FIRE_PROMPT = """Кадры с камеры. Виден ли ОГОНЬ или ДЫМ (возгорание, задымление)?
Ответь ТОЛЬКО JSON: {"detected": true|false, "detail": "огонь|дым|..."}
detected=true только если явно видно пламя/дым. Сомневаешься — false."""

PPE_PROMPT = """Кадры со стройки/производства. Нарушает ли человек требования СИЗ:
БЕЗ каски или БЕЗ сигнального жилета в рабочей зоне? Ответь ТОЛЬКО JSON:
{"violation": true|false, "detail": "нет каски|нет жилета|..."}
violation=true только если явно видно. Сомневаешься — false."""

PKG_PROMPT = """Кадры со склада. Видны ли ПОВРЕЖДЁННЫЕ коробки/паллеты/упаковка
(вмятины, разрывы, рассыпанное содержимое)? Ответь ТОЛЬКО JSON:
{"damaged": true|false, "detail": "мятая коробка|разрыв|..."}
damaged=true только если повреждение явно видно. Сомневаешься — false."""


@dataclass(frozen=True)
class VisionCheck:
    prompt: str
    key: str  # булев ключ в JSON-вердикте
    detail_key: str  # текстовый ключ
    event: str  # тип RuleEvent при срабатывании


# реестр VLM-проверок: ключ модуля → спецификация промпта/события
VISION_CHECKS: dict[str, VisionCheck] = {
    "weapon": VisionCheck(WEAPON_PROMPT, "weapon", "type", "weapon_detected"),
    "hygiene": VisionCheck(HYGIENE_PROMPT, "violation", "detail", "hygiene_violation"),
    "fire_smoke": VisionCheck(FIRE_PROMPT, "detected", "detail", "fire_smoke"),
    "ppe": VisionCheck(PPE_PROMPT, "violation", "detail", "ppe_violation"),
    "package_damage": VisionCheck(PKG_PROMPT, "damaged", "detail", "package_damage"),
}


def enabled_vision_checks(cam: CameraConfig, weapon_global: bool = False) -> set[str]:
    """Какие VLM-проверки включены на камере (её analytics + analytics её зон)."""
    keys: set[str] = set()
    for k in VISION_CHECKS:
        cfg = cam.analytics.get(k)
        if isinstance(cfg, dict) and cfg.get("enabled"):
            keys.add(k)
        for z in cam.zones:
            zc = z.analytics.get(k)
            if isinstance(zc, dict) and zc.get("enabled"):
                keys.add(k)
    if weapon_global:  # обратная совместимость с глобальным флагом
        keys.add("weapon")
    return keys


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


class WeaponWorker(threading.Thread):
    """Проверяет кадры входящих людей на оружие; нашёл → колбэк emit_alert."""

    def __init__(
        self,
        describer: VlmDescriber,
        budget: HourBudget,
        emit_alert: Callable[[str, list[np.ndarray], str], None],
        stop_event: threading.Event,
    ):
        super().__init__(name="weapon-worker", daemon=True)
        self.describer = describer
        self.budget = budget
        self.emit_alert = emit_alert
        self.stop_event = stop_event
        self._q: queue.Queue[tuple[str, list[np.ndarray]]] = queue.Queue(maxsize=32)

    def enqueue(self, camera_id: str, frames: list[np.ndarray]) -> None:
        if not self.budget.allow():
            return
        with contextlib.suppress(queue.Full):
            self._q.put_nowait((camera_id, frames))

    def run(self) -> None:
        while not self.stop_event.is_set():
            try:
                camera_id, frames = self._q.get(timeout=1)
            except queue.Empty:
                continue
            try:
                found, kind = self.describer.check_weapon(frames)
            except Exception:  # noqa: BLE001 — сбой VLM не должен ничего ронять
                log.exception("weapon check failed cam=%s", camera_id)
                continue
            if found:
                log.warning("weapon detected cam=%s type=%s", camera_id, kind)
                self.emit_alert(camera_id, frames, kind)


class VisionWorker(threading.Thread):
    """Обобщённый VLM-воркер: очередь (camera_id, check_key, frames) → проверка по
    реестру VISION_CHECKS → колбэк при срабатывании. Один поток на все проверки
    (оружие/гигиена/огонь/СИЗ/повреждение), общий почасовой бюджет."""

    def __init__(
        self,
        describer: VlmDescriber,
        budget: HourBudget,
        emit_alert: Callable[[str, str, str, list[np.ndarray]], None],
        stop_event: threading.Event,
    ):
        super().__init__(name="vision-worker", daemon=True)
        self.describer = describer
        self.budget = budget
        self.emit_alert = emit_alert  # (camera_id, event_type, detail, frames)
        self.stop_event = stop_event
        self._q: queue.Queue[tuple[str, str, list[np.ndarray]]] = queue.Queue(maxsize=64)

    def enqueue(self, camera_id: str, check_key: str, frames: list[np.ndarray]) -> None:
        if check_key not in VISION_CHECKS or not self.budget.allow():
            return
        with contextlib.suppress(queue.Full):
            self._q.put_nowait((camera_id, check_key, frames))

    def run(self) -> None:
        while not self.stop_event.is_set():
            try:
                camera_id, check_key, frames = self._q.get(timeout=1)
            except queue.Empty:
                continue
            spec = VISION_CHECKS.get(check_key)
            if spec is None:
                continue
            try:
                found, detail = self.describer.check(frames, spec)
            except Exception:  # noqa: BLE001 — сбой VLM не должен ничего ронять
                log.exception("vision check %s failed cam=%s", check_key, camera_id)
                continue
            if found:
                log.warning("vision %s cam=%s: %s", check_key, camera_id, detail)
                self.emit_alert(camera_id, spec.event, detail, frames)
