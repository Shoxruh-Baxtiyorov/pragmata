import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const LANG_KEY = 'soqchi_lang'

// ru — канонический словарь; uz/en типизированы как typeof ru → паритет ключей на компиляции
const ru = {
  'nav.overview': 'Обзор',
  'nav.assistant': 'Ассистент',
  'nav.live': 'Камеры',
  'nav.events': 'События',
  'nav.stats': 'Статистика',
  'nav.search': 'Поиск',
  'nav.system': 'Система',
  'login.title': 'Soqchi AI',
  'login.password': 'Пароль администратора',
  'login.submit': 'Войти',
  'login.error': 'Неверный пароль',
  'common.logout': 'Выйти',
  'common.loading': 'Загрузка…',
  'common.empty': 'Пока пусто',
  'common.stub': 'Раздел в разработке',
  'overview.today': 'Последние 24 часа',
  'overview.error': 'Не удалось загрузить данные — проверьте, запущен ли сервер',
  'overview.status.allOk': 'Все камеры работают',
  'overview.status.offline': 'Камер не в сети: {{count}}',
  'overview.tile.people': 'Люди',
  'overview.tile.alerts': 'Тревоги',
  'overview.tile.falseAlarms': 'Ложные тревоги',
  'overview.tile.cameras': 'Камеры в сети',
  'overview.chart.title': 'Активность по часам',
  'overview.chart.empty': 'Пока нет активности',
  'overview.chart.tooltip': '{{hour}} — событий: {{events}}, тревог: {{alerts}}',
  'overview.recent.title': 'Последние тревоги',
  'overview.recent.viewAll': 'Смотреть все',
  'overview.recent.empty': 'Пока нет тревог',
}

const uz: typeof ru = {
  'nav.overview': 'Umumiy',
  'nav.assistant': 'Yordamchi',
  'nav.live': 'Kameralar',
  'nav.events': 'Hodisalar',
  'nav.stats': 'Statistika',
  'nav.search': 'Qidiruv',
  'nav.system': 'Tizim',
  'login.title': 'Soqchi AI',
  'login.password': 'Administrator paroli',
  'login.submit': 'Kirish',
  'login.error': "Parol noto'g'ri",
  'common.logout': 'Chiqish',
  'common.loading': 'Yuklanmoqda…',
  'common.empty': 'Hozircha bo‘sh',
  'common.stub': 'Bo‘lim ishlab chiqilmoqda',
  'overview.today': 'Oxirgi 24 soat',
  'overview.error': "Ma'lumotlar yuklanmadi — server ishlayotganini tekshiring",
  'overview.status.allOk': 'Barcha kameralar ishlayapti',
  'overview.status.offline': '{{count}} ta kamera ishlamayapti',
  'overview.tile.people': 'Odamlar',
  'overview.tile.alerts': 'Ogohlantirishlar',
  'overview.tile.falseAlarms': 'Notoʻgʻri ogohlantirishlar',
  'overview.tile.cameras': 'Ishlayotgan kameralar',
  'overview.chart.title': 'Soatlik faollik',
  'overview.chart.empty': 'Hozircha faollik yoʻq',
  'overview.chart.tooltip': "{{hour}} — {{events}} ta hodisa, {{alerts}} ta ogohlantirish",
  'overview.recent.title': 'Soʻnggi ogohlantirishlar',
  'overview.recent.viewAll': 'Barchasini koʻrish',
  'overview.recent.empty': 'Hozircha ogohlantirishlar yoʻq',
}

const en: typeof ru = {
  'nav.overview': 'Overview',
  'nav.assistant': 'Assistant',
  'nav.live': 'Cameras',
  'nav.events': 'Events',
  'nav.stats': 'Statistics',
  'nav.search': 'Search',
  'nav.system': 'System',
  'login.title': 'Soqchi AI',
  'login.password': 'Admin password',
  'login.submit': 'Sign in',
  'login.error': 'Wrong password',
  'common.logout': 'Sign out',
  'common.loading': 'Loading…',
  'common.empty': 'Nothing here yet',
  'common.stub': 'Coming soon',
  'overview.today': 'Last 24 hours',
  'overview.error': "Couldn't load data — check the server is running",
  'overview.status.allOk': 'All cameras working',
  'overview.status.offline': '{{count}} cameras offline',
  'overview.tile.people': 'People',
  'overview.tile.alerts': 'Alerts',
  'overview.tile.falseAlarms': 'Wrong alarms',
  'overview.tile.cameras': 'Cameras working',
  'overview.chart.title': 'Activity by hour',
  'overview.chart.empty': 'No activity yet',
  'overview.chart.tooltip': '{{hour}} — {{events}} events, {{alerts}} alerts',
  'overview.recent.title': 'Latest alerts',
  'overview.recent.viewAll': 'See all',
  'overview.recent.empty': 'No alerts yet',
}

void i18n.use(initReactI18next).init({
  resources: { ru: { translation: ru }, uz: { translation: uz }, en: { translation: en } },
  lng: localStorage.getItem(LANG_KEY) ?? 'uz',
  fallbackLng: 'uz',
  interpolation: { escapeValue: false },
})

export function setLang(lang: 'ru' | 'uz' | 'en'): void {
  localStorage.setItem(LANG_KEY, lang)
  void i18n.changeLanguage(lang)
}

export default i18n
