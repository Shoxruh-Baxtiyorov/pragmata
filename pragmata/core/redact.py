"""Маскировка секретов в строках, попадающих в логи."""

from __future__ import annotations

import re

_URL_CREDS = re.compile(r"(\w+?://)([^/@:\s]+)(:[^/@\s]+)?@")


def redact_url(url: str) -> str:
    """rtsp://admin:secret@10.0.0.5/... → rtsp://admin:***@10.0.0.5/...

    Пароли камер не должны утекать в логи/трейсы — логируем только через это.
    """
    return _URL_CREDS.sub(
        lambda m: f"{m.group(1)}{m.group(2)}:***@" if m.group(3) else m.group(0), url
    )
