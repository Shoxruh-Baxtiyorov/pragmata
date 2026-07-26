/**
 * Minimal i18n bootstrap — the console is Uzbek-only, but the copied DS
 * components (dialog, filter-bar, table-state, …) resolve their small label
 * set through react-i18next's `common` namespace, so we feed them one bundle.
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const common = {
  actions: 'Amallar',
  active_filters_count: '{{count}} ta faol filtr',
  breadcrumb: "Yo'l ko'rsatkichi",
  cancel: 'Bekor qilish',
  clear_filters: 'Filtrlarni tozalash',
  close: 'Yopish',
  combobox_no_results: 'Natija topilmadi',
  combobox_placeholder: 'Tanlang…',
  combobox_search_placeholder: 'Qidirish…',
  confirm: 'Tasdiqlash',
  error: 'Xatolik yuz berdi',
  loading: 'Yuklanmoqda…',
  no_data: "Ma'lumot yo'q",
  no_results: "Filtrlarga mos natija yo'q",
  remove: 'Olib tashlash',
  retry: 'Qayta urinish',
  style: 'Uslub',
  typed_confirmation_prompt: {
    prefix: 'Tasdiqlash uchun',
    suffix: 'deb yozing',
  },
}

i18n.use(initReactI18next).init({
  lng: 'uz',
  fallbackLng: 'uz',
  defaultNS: 'common',
  ns: ['common'],
  resources: { uz: { common } },
  interpolation: { escapeValue: false },
})

export default i18n
