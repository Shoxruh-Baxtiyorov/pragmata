"""Строки бота. Неделя 4: вынести в YAML и добавить uz-локаль (дизайн L64)."""

from __future__ import annotations

EVENT_TITLES = {
    "zone_intrusion": "🚨 Вход в запретную зону",
    "loitering": "⏳ Долгое присутствие в зоне",
    "after_hours_presence": "🌙 Человек в нерабочее время",
    "person_entered": "👤 Человек появился",
    "person_exited": "🚪 Человек ушёл",
    "camera_offline": "📵 Камера недоступна",
    "camera_online": "✅ Камера снова в сети",
    "watchlist_match": "🔴 Человек из списка наблюдения",
    "weapon_detected": "🔫 Обнаружено оружие",
    "vehicle_seen": "🚗 Транспорт",
}

BTN_CLIP = "🎬 Клип"
BTN_FALSE = "⚠️ Ложное"
BTN_OK = "✅ Ок"

CLIP_NOT_READY = "Клип ещё готовится (~30 сек после события), нажмите позже."
CLIP_MISSING = "Клип для этого события недоступен."
FEEDBACK_FALSE_SAVED = "Помечено как ложное — учтём при настройке порогов."
FEEDBACK_OK_SAVED = "Подтверждено."
MARK_FALSE = "⚠️ помечено ложным"
MARK_OK = "✅ подтверждено"
NOT_ALLOWED = (
    "Этот чат не в списке получателей.\n"
    "chat_id: {chat_id}\nДобавьте его в TELEGRAM_CHAT_IDS в .env и перезапустите."
)
START_OK = "Бот активен, чат в списке получателей.\nchat_id: {chat_id}"
FIND_USAGE = (
    "Поиск по описанию внешности:\n/find man in black jacket\n"
    "(пока по-английски; агент переведёт сам, когда включим LLM)"
)
FIND_EMPTY = "Никого похожего за последние 48 часов не нашёл."
FIND_NEGATION = (
    "Нейросеть не понимает отрицания («no hair», «без куртки») — она их игнорирует "
    "и найдёт обратное.\nОпишите положительным признаком: bald man, man in t-shirt."
)
AGENT_OFF = (
    "Свободные вопросы отвечает LLM-агент — он выключен (нет LLM_API_KEY в .env).\n"
    "Доступно сейчас: /digest — сводка, /find <описание> — поиск человека."
)
AGENT_ERROR = "Агент споткнулся (см. логи). Попробуй ещё раз или /digest."
