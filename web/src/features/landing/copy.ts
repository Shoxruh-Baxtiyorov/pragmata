/* ─────────────────────────────────────────────────────────────────────────
 * Тексты лендинга. Отдельно от src/shared/i18n — там короткие строки
 * интерфейса, а здесь маркетинговые; смешивать их в одном словаре значит
 * утопить ключи приложения. Паритет тот же: ru — канонический словарь,
 * uz/en типизированы как typeof ru.
 *
 * Язык по умолчанию — uz (правило платформы), берётся из i18n.language.
 * Правила текста:
 *   — обычные слова, без внутренних терминов («треки», «VLM», «CLIP»);
 *   — одна мысль на строку: лид секции — одно предложение, текст плитки —
 *     не длиннее строки-двух. Длинная проза на витрине не читается, её
 *     пролистывают.
 * ───────────────────────────────────────────────────────────────────────── */

export const CONTACT_EMAIL = 'hello@pragmata.ai'

const ru = {
  nav: {
    how: 'Как это работает',
    capabilities: 'Возможности',
    product: 'Панель',
    industries: 'Объекты',
    privacy: 'Данные',
  },
  headerCta: 'Посмотреть в работе',
  brand: { name: 'PRAGMATA' },

  hero: {
    /* Формула позиционирования из docs/DESIGN.uz.md — не выдуманная метрика,
       а то, как продукт описан в собственном дизайн-документе проекта. */
    formula: '4 часа перемотки → ответ за 20 секунд',
    titleA: 'Ваши камеры записывают.',
    titleEm: 'Pragmata сообщает.',
    lede: 'Смотрит ваши камеры, находит важное и присылает доказательство в Telegram.',
    ctaPrimary: 'Как это работает',
  },

  /* Карточка тревоги поверх снимка панели. Пример, а не запись с реального
     объекта — об этом прямо говорит note под снимком. */
  sample: {
    time: '22:41:08',
    label: 'Вход в зону',
    detail: 'Северный док · видео сохранено',
  },

  diagram: {
    siteLabel: 'НА ОБЪЕКТЕ',
    cameras: 'Ваши камеры',
    camerasMeta: 'RTSP · уже стоят',
    device: 'Устройство Pragmata',
    deviceMeta: 'собирает поток',
    serverTitle: 'Сервер Pragmata',
    serverMeta: 'обработка · клипы, кадры, распознавание',
    outTitle: 'Telegram',
    outMeta: 'тревога вашей команде',
  },

  proof: {
    lead: 'ДЛЯ КАМЕР, КОТОРЫЕ У ВАС ЕСТЬ',
    items: ['Ваши камеры остаются', 'Устройство на объекте', 'Тревога в Telegram', 'Видео к каждой'],
  },

  shift: {
    kicker: 'ПЕРЕМЕНА',
    titleA: 'От пассивного архива',
    titleEm: 'к активному караулу.',
    text: 'Камеры записывают всё и не говорят ничего. Pragmata говорит, когда правило нарушено.',
    link: 'Возможности',
    before: {
      label: 'ДО / CCTV',
      tag: 'ПАССИВНО',
      title: 'Что-то произошло.',
      text: 'Часы перемотки вручную.',
      meta: 'ПОСЛЕ СОБЫТИЯ',
    },
    after: {
      label: 'ПОСЛЕ / PRAGMATA',
      tag: 'АКТИВНО',
      title: 'Вот доказательство.',
      text: 'Тревога, контекст и видео.',
      meta: 'СРАЗУ / АВТОМАТИЧЕСКИ',
    },
  },

  capabilities: {
    kicker: 'ПОМОЩНИК',
    titleA: 'Меньше смотреть.',
    titleEm: 'Больше знать.',
    lede: 'Повторяющуюся работу забирает система.',
    askSample: 'Кто заходил на склад вчера вечером?',
    askReply: 'Ответ с кадром и видео',
    items: [
      {
        title: 'Видит людей в движении',
        text: 'Находит людей на живых камерах и ведёт по кадру.',
      },
      { title: 'Правила сообщают о себе', text: '' },
      { title: 'Доказательство нарезано', text: '' },
      { title: 'Спросите, что случилось', text: '' },
      {
        title: 'Поиск по описанию',
        text: 'Опишите, кого ищете, — система пройдёт по записям.',
      },
      {
        title: 'Запись становится контекстом',
        text: 'Описание сцены, автономера, тепловая карта, сводка за день.',
      },
    ],
  },

  product: {
    kicker: 'ПАНЕЛЬ',
    titleA: 'Весь объект —',
    titleEm: 'на одном экране.',
    lede: 'Тревоги, камеры и вопросы к системе — в одном месте.',
    shots: [
      { title: 'Обзор объекта', text: 'Что произошло за сутки.' },
      { title: 'Тревоги и доказательства', text: 'К каждой — кадр и видео.' },
    ],
  },

  industries: {
    kicker: 'ГДЕ РАБОТАЕТ',
    titleA: 'Сделано для',
    titleEm: 'настоящей смены.',
    lede: 'Для тех, кто отвечает за объект после закрытия дверей.',
    items: [
      {
        label: '01 / СКЛАДЫ И ПРОИЗВОДСТВА',
        title: 'Узнавать не после смены.',
        text: 'Вход в док, ночное присутствие, отключение камеры.',
      },
      {
        label: '02 / ТОРГОВЫЕ СЕТИ',
        title: 'Каждый магазин под ответом.',
        text: 'Все объекты в одном списке, за каждой тревогой — доказательство.',
      },
      {
        label: '03 / ШКОЛЫ И ЛОГИСТИКА',
        title: 'Тихие места видно.',
        text: 'Коридоры, ворота и дворы — на тех камерах, что уже стоят.',
      },
    ],
  },

  privacy: {
    kicker: 'ДАННЫЕ',
    titleA: 'Куда уходит',
    titleEm: 'ваша запись.',
    text: 'Устройство на объекте собирает поток, обработка и хранение — на сервере Pragmata. Значит, клипы и кадры покидают объект. Мы это не прячем, а показываем.',
  },

  workflow: {
    kicker: 'ОДИН КОНТУР / ЧЕТЫРЕ ШАГА',
    steps: [
      { title: 'Заметить', text: 'Человек, движение, состояние камеры.' },
      { title: 'Понять', text: 'Правило, сцена, вопрос обычными словами.' },
      { title: 'Сообщить', text: 'Нужная тревога — в Telegram.' },
      { title: 'Доказать', text: 'Кадр или видео с контекстом.' },
    ],
  },

  finalCta: {
    kicker: 'СЛЕДУЮЩАЯ СМЕНА',
    titleA: 'Дайте камерам',
    titleEm: 'голос.',
    text: 'Расскажите, что ваш объект перестанет пропускать.',
    button: 'Запросить демо',
  },

  footer: {
    tagline: 'AI-безопасность для камер, которые у вас есть.',
    contact: 'Связаться',
    login: 'Войти в панель',
    copyright: '© 2026 PRAGMATA AI',
  },

  modal: {
    titleA: 'Найдём',
    titleEm: 'пропущенные моменты.',
    text: 'Где сегодняшние камеры заставляют вас догадываться?',
    siteLabel: 'Ваш объект',
    siteOptions: ['Склад', 'Производство', 'Торговая сеть', 'Школа', 'Логистика'],
    camLabel: 'Сколько камер',
    camOptions: ['1–10', '11–50', '51–100', 'Больше 100'],
    submit: 'Начать разговор',
    subject: 'Pragmata AI — разговор об объекте',
  },

  a11y: {
    home: 'Pragmata AI — на главную',
    nav: 'Основная навигация',
    menu: 'Меню',
    feed: 'Пример тревоги',
  },
}

const uz: typeof ru = {
  nav: {
    how: 'Qanday ishlaydi',
    capabilities: 'Imkoniyatlar',
    product: 'Panel',
    industries: 'Kimlar uchun',
    privacy: 'Ma‘lumot',
  },
  headerCta: 'Ishda ko‘rish',
  brand: { name: 'PRAGMATA' },

  hero: {
    formula: '4 soat yozuv varaqlash → 20 soniyada javob',
    titleA: 'Kameralaringiz yozadi.',
    titleEm: 'Pragmata xabar beradi.',
    lede: 'Kameralaringizni kuzatadi, muhimini topadi va dalilni Telegramga yuboradi.',
    ctaPrimary: 'Qanday ishlaydi',
  },

  sample: {
    time: '22:41:08',
    label: 'Hududga kirish',
    detail: 'Shimoliy dok · video saqlandi',
  },

  diagram: {
    siteLabel: 'SIZDA',
    cameras: 'Kameralaringiz',
    camerasMeta: 'RTSP · allaqachon turibdi',
    device: 'Pragmata qurilmasi',
    deviceMeta: 'oqimni yig‘adi',
    serverTitle: 'Pragmata serveri',
    serverMeta: 'ishlov · klip, kadr, tanib olish',
    outTitle: 'Telegram',
    outMeta: 'jamoangizga xabar',
  },

  proof: {
    lead: 'SIZDA BOR KAMERALAR UCHUN',
    items: ['Kameralaringiz qoladi', 'Sizda kichik qurilma', 'Telegramga ogohlantirish', 'Har biriga video'],
  },

  shift: {
    kicker: 'O‘ZGARISH',
    titleA: 'Passiv arxivdan',
    titleEm: 'faol qorovulga.',
    text: 'Kameralar hammasini yozadi va hech narsa aytmaydi. Pragmata qoida buzilganda aytadi.',
    link: 'Imkoniyatlar',
    before: {
      label: 'OLDIN / CCTV',
      tag: 'PASSIV',
      title: 'Nimadir bo‘ldi.',
      text: 'Soatlab yozuv varaqlash.',
      meta: 'VOQEADAN KEYIN',
    },
    after: {
      label: 'KEYIN / PRAGMATA',
      tag: 'FAOL',
      title: 'Dalil shu yerda.',
      text: 'Ogohlantirish, kontekst va video.',
      meta: 'O‘SHA ZAHOTI / AVTOMATIK',
    },
  },

  capabilities: {
    kicker: 'YORDAMCHI',
    titleA: 'Kamroq qarash.',
    titleEm: 'Ko‘proq bilish.',
    lede: 'Takrorlanuvchi ishni tizim o‘z zimmasiga oladi.',
    askSample: 'Kecha kechqurun omborga kim kirdi?',
    askReply: 'Kadr va video bilan javob',
    items: [
      {
        title: 'Harakatdagi odamlarni ko‘radi',
        text: 'Jonli kameralarda odamlarni topadi va kadr bo‘ylab kuzatadi.',
      },
      { title: 'Qoidalar o‘zi xabar beradi', text: '' },
      { title: 'Dalil allaqachon kesilgan', text: '' },
      { title: 'Nima bo‘lganini so‘rang', text: '' },
      {
        title: 'Tavsif bo‘yicha qidiruv',
        text: 'Kimni izlayotganingizni ta‘riflang — tizim yozuvlardan topadi.',
      },
      {
        title: 'Yozuv kontekstga aylanadi',
        text: 'Sahna tavsifi, avto raqam, issiqlik xaritasi, kunlik xulosa.',
      },
    ],
  },

  product: {
    kicker: 'PANEL',
    titleA: 'Hamma kamera —',
    titleEm: 'bitta ekranda.',
    lede: 'Ogohlantirishlar, kameralar va savollar — bir joyda.',
    shots: [
      { title: 'Umumiy ko‘rinish', text: 'Bir sutkada nima bo‘ldi.' },
      { title: 'Ogohlantirish va dalil', text: 'Har biriga kadr va video.' },
    ],
  },

  industries: {
    kicker: 'QAYERDA ISHLAYDI',
    titleA: 'Haqiqiy smena',
    titleEm: 'uchun qilingan.',
    lede: 'Eshiklar yopilgandan keyin javobgar bo‘lib qoladiganlar uchun.',
    items: [
      {
        label: '01 / OMBOR VA ISHLAB CHIQARISH',
        title: 'Smenadan keyin bilib qolmang.',
        text: 'Dokka kirish, tungi harakat, kamera uzilishi.',
      },
      {
        label: '02 / SAVDO TARMOQLARI',
        title: 'Har bir do‘kon javob beradi.',
        text: 'Barcha do‘kon bitta ro‘yxatda, har ogohlantirish ortida dalil.',
      },
      {
        label: '03 / MAKTAB VA LOGISTIKA',
        title: 'Jim joylar ko‘rinib turadi.',
        text: 'Yo‘lak, darvoza va hovlilar — turgan kameralar bilan.',
      },
    ],
  },

  privacy: {
    kicker: 'MA‘LUMOT',
    titleA: 'Yozuvingiz',
    titleEm: 'qayerga boradi.',
    text: 'Sizdagi qurilma oqimni yig‘adi, ishlov va saqlash Pragmata serverida bo‘ladi. Ya‘ni kliplar va kadrlar sizdan chiqib bizga keladi. Buni yashirmaymiz — ko‘rsatamiz.',
  },

  workflow: {
    kicker: 'BITTA HALQA / TO‘RT QADAM',
    steps: [
      { title: 'Sezish', text: 'Odam, harakat, kamera holati.' },
      { title: 'Tushunish', text: 'Qoida, sahna, oddiy so‘zlardagi savol.' },
      { title: 'Xabar berish', text: 'Kerakli ogohlantirish — Telegramga.' },
      { title: 'Isbotlash', text: 'Kadr yoki video, kontekst bilan.' },
    ],
  },

  finalCta: {
    kicker: 'KEYINGI SMENA',
    titleA: 'Kameralaringizga',
    titleEm: 'ovoz bering.',
    text: 'Nimani boy bermaslik kerakligini aytib bering.',
    button: 'Demo so‘rash',
  },

  footer: {
    tagline: 'Sizda bor kameralar uchun AI xavfsizlik.',
    contact: 'Bog‘lanish',
    login: 'Panelga kirish',
    copyright: '© 2026 PRAGMATA AI',
  },

  modal: {
    titleA: 'Boy berilgan',
    titleEm: 'lahzalarni topamiz.',
    text: 'Hozirgi kameralaringiz sizni qayerda taxmin qilishga majbur qiladi?',
    siteLabel: 'Qayerda ishlatasiz',
    siteOptions: ['Ombor', 'Ishlab chiqarish', 'Savdo tarmog‘i', 'Maktab', 'Logistika'],
    camLabel: 'Kamera soni',
    camOptions: ['1–10', '11–50', '51–100', '100 dan ko‘p'],
    submit: 'Suhbatni boshlash',
    subject: 'Pragmata AI — suhbat',
  },

  a11y: {
    home: 'Pragmata AI — boshiga',
    nav: 'Asosiy navigatsiya',
    menu: 'Menyu',
    feed: 'Ogohlantirish namunasi',
  },
}

const en: typeof ru = {
  nav: {
    how: 'How it works',
    capabilities: 'Capabilities',
    product: 'Dashboard',
    industries: 'Sites',
    privacy: 'Your data',
  },
  headerCta: 'See it in action',
  brand: { name: 'PRAGMATA' },

  hero: {
    formula: '4 hours of scrubbing → an answer in 20 seconds',
    titleA: 'Your cameras record.',
    titleEm: 'Pragmata reports.',
    lede: 'Watches your cameras, finds what matters, sends the evidence to Telegram.',
    ctaPrimary: 'How it works',
  },

  sample: {
    time: '22:41:08',
    label: 'Zone entry',
    detail: 'North loading bay · clip saved',
  },

  diagram: {
    siteLabel: 'AT YOUR SITE',
    cameras: 'Your cameras',
    camerasMeta: 'RTSP · already installed',
    device: 'Pragmata device',
    deviceMeta: 'collects the stream',
    serverTitle: 'Pragmata server',
    serverMeta: 'processing · clips, frames, recognition',
    outTitle: 'Telegram',
    outMeta: 'the alert, to your team',
  },

  proof: {
    lead: 'FOR THE CAMERAS YOU ALREADY OWN',
    items: ['Your cameras stay', 'A device on site', 'Alerts to Telegram', 'A clip with each'],
  },

  shift: {
    kicker: 'THE SHIFT',
    titleA: 'From passive archive',
    titleEm: 'to active guard.',
    text: 'Cameras record everything and report nothing. Pragmata speaks when a rule breaks.',
    link: 'Capabilities',
    before: {
      label: 'BEFORE / CCTV',
      tag: 'PASSIVE',
      title: 'Something happened.',
      text: 'Hours of scrubbing, by hand.',
      meta: 'AFTER THE FACT',
    },
    after: {
      label: 'AFTER / PRAGMATA',
      tag: 'ACTIVE',
      title: 'Here is the evidence.',
      text: 'The alert, the context, the clip.',
      meta: 'IN THE MOMENT / AUTOMATIC',
    },
  },

  capabilities: {
    kicker: 'THE COPILOT',
    titleA: 'Less watching.',
    titleEm: 'More knowing.',
    lede: 'The system takes the repetitive work.',
    askSample: 'Who entered the warehouse last night?',
    askReply: 'Answered with a frame and a clip',
    items: [
      {
        title: 'Sees people in motion',
        text: 'Finds people on live cameras and follows them across the frame.',
      },
      { title: 'Rules report themselves', text: '' },
      { title: 'Evidence already clipped', text: '' },
      { title: 'Ask what happened', text: '' },
      {
        title: 'Search by description',
        text: 'Describe who you are looking for — the system walks the records.',
      },
      {
        title: 'Footage becomes context',
        text: 'Scene descriptions, plates, a heat map, a daily summary.',
      },
    ],
  },

  product: {
    kicker: 'THE DASHBOARD',
    titleA: 'The whole site —',
    titleEm: 'on one screen.',
    lede: 'Alerts, cameras and questions — in one place.',
    shots: [
      { title: 'Site overview', text: 'What happened in a day.' },
      { title: 'Alerts and evidence', text: 'A frame and a clip on each.' },
    ],
  },

  industries: {
    kicker: 'WHERE IT WORKS',
    titleA: 'Built for the',
    titleEm: 'real shift.',
    lede: 'For the people responsible once the doors close.',
    items: [
      {
        label: '01 / WAREHOUSES & FACTORIES',
        title: 'Stop finding out later.',
        text: 'Loading bay entry, night-time movement, camera downtime.',
      },
      {
        label: '02 / RETAIL CHAINS',
        title: 'Every store accountable.',
        text: 'Every site in one list, evidence behind every alert.',
      },
      {
        label: '03 / SCHOOLS & LOGISTICS',
        title: 'Quiet places stay visible.',
        text: 'Corridors, gates and yards — on the cameras already there.',
      },
    ],
  },

  privacy: {
    kicker: 'YOUR DATA',
    titleA: 'Where your footage',
    titleEm: 'actually goes.',
    text: 'A device at your site collects the stream; processing and storage happen on the Pragmata server. So clips and frames do leave your site. We show that rather than hide it.',
  },

  workflow: {
    kicker: 'ONE LOOP / FOUR MOVES',
    steps: [
      { title: 'Detect', text: 'A person, a movement, a camera state.' },
      { title: 'Understand', text: 'A rule, a scene, a question in plain words.' },
      { title: 'Notify', text: 'The right alert, pushed to Telegram.' },
      { title: 'Prove', text: 'A frame or a clip with the context.' },
    ],
  },

  finalCta: {
    kicker: 'THE NEXT SHIFT',
    titleA: 'Give your cameras',
    titleEm: 'a voice.',
    text: 'Tell us what your site needs to stop missing.',
    button: 'Request a demo',
  },

  footer: {
    tagline: 'AI security for the cameras you already have.',
    contact: 'Contact',
    login: 'Sign in',
    copyright: '© 2026 PRAGMATA AI',
  },

  modal: {
    titleA: 'Let’s find the',
    titleEm: 'missed moments.',
    text: 'Where do your cameras leave you guessing today?',
    siteLabel: 'Your site',
    siteOptions: ['Warehouse', 'Factory', 'Retail chain', 'School', 'Logistics'],
    camLabel: 'Existing cameras',
    camOptions: ['1–10', '11–50', '51–100', '100+'],
    submit: 'Open a conversation',
    subject: 'Pragmata AI site conversation',
  },

  a11y: {
    home: 'Pragmata AI home',
    nav: 'Primary navigation',
    menu: 'Menu',
    feed: 'Sample alert',
  },
}

const DECKS = { ru, uz, en }

export type LandingCopy = typeof ru

// i18n.language может быть 'uz-UZ' или чем-то незнакомым — берём первые две буквы
export function landingCopy(lang: string | undefined): LandingCopy {
  const code = (lang ?? 'uz').slice(0, 2)
  return code in DECKS ? DECKS[code as keyof typeof DECKS] : uz
}
