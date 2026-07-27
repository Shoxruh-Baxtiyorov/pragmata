from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import yaml
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Окружение процесса (.env). Конфиг объекта — отдельно, в YAML."""

    app_env: str = "development"  # development | test | production
    database_url: str = "postgresql+psycopg://soqchi:soqchi@127.0.0.1:5433/soqchi"
    media_dir: Path = Path("./data/media")
    models_dir: Path = Path("./models")
    # yolo11n = скорость; yolo11s = recall в группах людей (для демо на GPU/сильном CPU)
    yolo_model: str = "yolo11n.pt"
    # Fernet-ключ для шифрования колонок (RTSP-креды камер). Вне APP_ENV=test
    # обязателен при первом обращении к шифрованию — см. pragmata/core/encryption.py.
    encryption_key: str = ""
    # --- Dashboard API (pragmata.api) ---
    # Пустой secret = API-логин отвечает 503 (fail-closed, как encryption)
    secret_key: str = (
        ""  # JWT HS256; сгенерировать: python -c "import secrets;print(secrets.token_urlsafe(48))"
    )
    site_config: Path = Path("config/dev.yaml")  # откуда API берёт имена камер/зоны
    api_cors_origins: str = (
        "http://localhost:5175,http://127.0.0.1:5175,http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:5176,http://127.0.0.1:5176"  # 5176 = отдельный фронт бэкофиса
    )
    # regex origin'ов для CORS сверх списка: по умолчанию любой поддомен *.vercel.app
    # (прод + preview-деплои фронта). Пусто = regex выключен.
    api_cors_origin_regex: str = r"https://([a-z0-9-]+\.)*vercel\.app"
    api_enable_find: bool = False  # /find грузит CLIP вторым процессом — включать осознанно
    # Telegram: пустой токен = бот выключен. Алерты уходят ТОЛЬКО в chat_id из
    # allowlist (secure default: неизвестный чат не получает ничего).
    telegram_bot_token: str = ""
    telegram_chat_ids: str = ""  # "123456,-100987654"
    # LLM-агент: любой OpenAI-совместимый endpoint. Пустой ключ = агент выключен,
    # /digest и /find работают без него. Пресеты:
    #   Ollama (локально, бесплатно):  LLM_BASE_URL=http://127.0.0.1:11434/v1
    #                                  LLM_API_KEY=ollama  LLM_MODEL=qwen2.5:3b
    #   OpenRouter (облако):           LLM_BASE_URL=https://openrouter.ai/api/v1
    #                                  LLM_API_KEY=sk-...  LLM_MODEL=google/gemini-2.0-flash-001
    llm_base_url: str = "https://openrouter.ai/api/v1"
    llm_api_key: str = ""
    llm_model: str = "google/gemini-2.0-flash-001"
    # VLM-описания/детекция оружия. По умолчанию тот же endpoint, что LLM, но
    # можно РАЗДЕЛИТЬ: VLM бьёт на каждого входящего (высокая частота) — держать
    # его на облачном free-лимите нельзя, квота сгорит. Поэтому агент можно
    # увести в облако (LLM_*), а VLM оставить локально (VLM_BASE_URL/VLM_API_KEY).
    # Пустые vlm_base_url/vlm_api_key = падают обратно на llm_*.
    vlm_base_url: str = ""
    vlm_api_key: str = ""
    vlm_model: str = "qwen2.5vl:3b"
    vlm_max_per_hour: int = 60
    # распознавание лица для watchlist (insightface, CPU-офлайн, качается один раз
    # в models/insightface; нет пакета/модели → тихо off). buffalo_l (ResNet50
    # ArcFace, w600k_r50) заметно точнее мобильной buffalo_s — лучше разделяет
    # «тот же/другой», меньше и промахов, и ложных совпадений; цена ~326МБ и более
    # тяжёлый инференс на CPU, но для watchlist (не каждый кадр) это ок.
    face_recognition: bool = True
    face_model: str = "buffalo_l"
    face_det_size: int = 640  # вход детектора лиц; больше = ловит мелкие/дальние лица
    # гейт качества: лица с уверенностью детекции ниже порога не эмбеддим — мутный/
    # профильный/крошечный кроп даёт шумный вектор и провоцирует ложные совпадения
    face_min_score: float = 0.5
    # порог косинуса лицо↔лицо; в env → можно подкрутить на демо без передеплоя
    face_match_threshold: float = 0.42
    # детекция оружия: VLM проверяет кадр каждого входящего человека (свой бюджет)
    weapon_detection: bool = False
    weapon_max_per_hour: int = 120
    # детекция транспорта (ANPR): YOLO-классы car/truck/bus/motorcycle + OCR номера
    vehicle_detection: bool = False
    vehicle_conf: float = 0.3  # порог уверенности для транспорта (обычно ниже людей)
    # Investigation Mode: контраст-порог «похож сильнее, чем просто человек».
    # Калибровка 2026-07-14: реальные совпадения ≥ +0.033 (dress/hat/shirt),
    # негации и «почти похожие» ≤ +0.030 → порог между ними. Выше = точнее, ниже = полнее.
    find_min_margin: float = 0.032
    # Бэкофис (по логике Iqbola): доступ к /backoffice/* — не просто роль admin, а
    # отдельный allowlist имён. Пустой список = бэкофис закрыт для всех (secure
    # default). Имена через запятую, регистр не важен: "admin,security_head".
    backoffice_users: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def allowed_chat_ids(self) -> set[int]:
        return {int(x) for x in self.telegram_chat_ids.split(",") if x.strip()}

    @property
    def backoffice_usernames(self) -> set[str]:
        return {x.strip().lower() for x in self.backoffice_users.split(",") if x.strip()}

    @property
    def vlm_endpoint(self) -> tuple[str, str]:
        """(base_url, api_key) для VLM: свой, иначе тот же, что у LLM."""
        return (self.vlm_base_url or self.llm_base_url, self.vlm_api_key or self.llm_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()


class MotionConfig(BaseModel):
    enabled: bool = True
    min_area_pct: float = 0.4
    cooldown_s: float = 3.0


class ZoneIntrusionRule(BaseModel):
    hysteresis_frames: int = 8
    cooldown_s: float = 300.0


class LoiteringRule(BaseModel):
    dwell_s: float = 60.0
    cooldown_s: float = 300.0


class ZoneRules(BaseModel):
    zone_intrusion: ZoneIntrusionRule | None = None
    loitering: LoiteringRule | None = None


class ZoneConfig(BaseModel):
    name: str
    type: str = "restricted"
    polygon: list[tuple[float, float]]  # нормализованные [x, y], 0..1
    rules: ZoneRules = Field(default_factory=ZoneRules)


class ClipConfig(BaseModel):
    enabled: bool = False
    ring_minutes: int = 10  # глубина кольцевого буфера на диске
    pre_s: float = 10.0  # сколько секунд ДО события попадает в клип
    post_s: float = 20.0  # и сколько ПОСЛЕ


class WorkingHours(BaseModel):
    """Рабочий календарь объекта — вне этих окон срабатывает after_hours_presence."""

    days: list[str] = ["mon", "tue", "wed", "thu", "fri", "sat"]
    open: str = "08:00"
    close: str = "18:00"


class CameraConfig(BaseModel):
    id: str
    name: str
    url: str
    process_fps: float = 5.0
    detect_conf: float = 0.35
    # 640 — базлайн; 960 заметно поднимает recall мелких/перекрытых людей (толпа, даль)
    detect_imgsz: int = 640
    motion: MotionConfig = Field(default_factory=MotionConfig)
    zones: list[ZoneConfig] = Field(default_factory=list)
    clips: ClipConfig = Field(default_factory=ClipConfig)


class GlobalRules(BaseModel):
    min_track_seconds: float = 0.7
    track_lost_ttl: float = 2.0


class SiteInfo(BaseModel):
    name: str
    timezone: str = "Asia/Tashkent"
    working_hours: WorkingHours | None = None  # None = правило after_hours выключено
    digest_time: str = "20:00"  # время вечернего дайджеста (в timezone объекта)


class SiteConfig(BaseModel):
    site: SiteInfo
    rules: GlobalRules = Field(default_factory=GlobalRules)
    cameras: list[CameraConfig]


def load_site_config(path: str | Path) -> SiteConfig:
    raw = yaml.safe_load(Path(path).read_text(encoding="utf-8"))
    return SiteConfig.model_validate(raw)
