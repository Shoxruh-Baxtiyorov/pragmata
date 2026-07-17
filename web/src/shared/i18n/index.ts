import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const ru = {
  app: { title: 'Soqchi AI', subtitle: 'AI-нозорат камералар' },
  nav: { live: 'Камеры', events: 'События', stats: 'Статистика', search: 'Поиск', logout: 'Выход' },
  login: { title: 'Вход', password: 'Пароль', submit: 'Войти', error: 'Неверный пароль' },
  live: { offline: 'офлайн', online: 'в сети', empty: 'Камеры не настроены', zones: 'зон' },
  events: {
    title: 'События',
    empty: 'Событий пока нет',
    period: 'Период',
    camera: 'Камера',
    type: 'Тип',
    severity: 'Важность',
    all: 'Все',
    more: 'Показать ещё',
    people: 'Людей в зоне',
    false: 'Ложное',
    ok: 'Ок',
    marked: 'учтено',
    h1: '1 час',
    h24: '24 часа',
    h168: '7 дней',
  },
  stats: { title: 'Статистика', visitors: 'Посетителей', alerts: 'Тревог', byType: 'По типам', byCamera: 'По камерам', digest: 'Дайджест' },
  search: {
    title: 'Поиск человека',
    placeholder: 'Опишите человека (напр. man in white shirt)',
    submit: 'Найти',
    empty: 'Никого похожего не найдено',
    disabled: 'Поиск включается на сервере (API_ENABLE_FIND)',
    similarity: 'сходство',
  },
  common: { loading: 'Загрузка…', noConnection: 'Нет связи с сервером', retry: 'Повторить' },
}

const uz: typeof ru = {
  app: { title: 'Soqchi AI', subtitle: 'Kameralar AI-nazorati' },
  nav: { live: 'Kameralar', events: 'Hodisalar', stats: 'Statistika', search: 'Qidiruv', logout: 'Chiqish' },
  login: { title: 'Kirish', password: 'Parol', submit: 'Kirish', error: "Parol noto'g'ri" },
  live: { offline: 'oflayn', online: 'onlayn', empty: 'Kameralar sozlanmagan', zones: 'zona' },
  events: {
    title: 'Hodisalar',
    empty: "Hozircha hodisa yo'q",
    period: 'Davr',
    camera: 'Kamera',
    type: 'Turi',
    severity: 'Muhimligi',
    all: 'Hammasi',
    more: "Ko'proq",
    people: 'Zonadagi odamlar',
    false: "Noto'g'ri",
    ok: 'Ok',
    marked: 'hisobga olindi',
    h1: '1 soat',
    h24: '24 soat',
    h168: '7 kun',
  },
  stats: { title: 'Statistika', visitors: 'Tashrif', alerts: 'Tashvishlar', byType: 'Turlar', byCamera: 'Kameralar', digest: 'Digest' },
  search: {
    title: 'Odam qidirish',
    placeholder: 'Odamni tasvirlang (masalan man in white shirt)',
    submit: 'Qidirish',
    empty: 'Hech kim topilmadi',
    disabled: 'Qidiruv serverda yoqiladi (API_ENABLE_FIND)',
    similarity: "o'xshashlik",
  },
  common: { loading: 'Yuklanmoqda…', noConnection: 'Server bilan aloqa yo\'q', retry: 'Qayta' },
}

void i18n.use(initReactI18next).init({
  resources: { ru: { translation: ru }, uz: { translation: uz } },
  lng: localStorage.getItem('soqchi_lang') ?? 'ru',
  fallbackLng: 'ru',
  interpolation: { escapeValue: false },
})

export function setLang(lng: 'ru' | 'uz') {
  localStorage.setItem('soqchi_lang', lng)
  void i18n.changeLanguage(lng)
}

export default i18n
