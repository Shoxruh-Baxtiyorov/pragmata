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
    # Fernet-ключ для шифрования колонок (RTSP-креды камер). Вне APP_ENV=test
    # обязателен при первом обращении к шифрованию — см. soqchi/core/encryption.py.
    encryption_key: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


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


class CameraConfig(BaseModel):
    id: str
    name: str
    url: str
    process_fps: float = 5.0
    detect_conf: float = 0.35
    motion: MotionConfig = Field(default_factory=MotionConfig)
    zones: list[ZoneConfig] = Field(default_factory=list)


class GlobalRules(BaseModel):
    min_track_seconds: float = 0.7
    track_lost_ttl: float = 2.0


class SiteInfo(BaseModel):
    name: str
    timezone: str = "Asia/Tashkent"


class SiteConfig(BaseModel):
    site: SiteInfo
    rules: GlobalRules = Field(default_factory=GlobalRules)
    cameras: list[CameraConfig]


def load_site_config(path: str | Path) -> SiteConfig:
    raw = yaml.safe_load(Path(path).read_text(encoding="utf-8"))
    return SiteConfig.model_validate(raw)
