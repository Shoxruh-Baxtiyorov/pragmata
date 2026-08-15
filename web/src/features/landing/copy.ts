/* ─────────────────────────────────────────────────────────────────────────
 * Тексты лендинга. Отдельно от src/shared/i18n — там короткие строки
 * интерфейса, а здесь длинная маркетинговая проза; смешивать их в одном
 * словаре значит утопить ключи приложения. Гарантия паритета та же:
 * ru — канонический словарь, uz/en типизированы как typeof ru.
 *
 * Язык по умолчанию — uz (правило платформы), берётся из i18n.language.
 * Правило текста: обычные слова, без внутренних терминов («треки», «VLM»,
 * «CLIP», «false positive» и т.п.).
 * ───────────────────────────────────────────────────────────────────────── */

export const CONTACT_EMAIL = 'hello@pragmata.ai'

const ru = {
  nav: {
    how: 'Как это работает',
    capabilities: 'Возможности',
    product: 'Панель',
    industries: 'Для вашего объекта',
    privacy: 'Приватность',
  },
  headerCta: 'Посмотреть в работе',
  brand: { name: 'PRAGMATA', descriptor: 'ON-PREMISE AI ДЛЯ БЕЗОПАСНОСТИ' },

  hero: {
    eyebrow: 'AI-ПОМОЩНИК ПО БЕЗОПАСНОСТИ НА ВАШЕМ СЕРВЕРЕ',
    titleA: 'Ваши камеры записывают.',
    titleEm: 'Pragmata сообщает.',
    lede: 'Охранник, который не отвлекается: смотрит ваши камеры, находит важное и присылает доказательство вашей команде.',
    ctaPrimary: 'Как это работает',
    ctaSecondary: 'Посмотреть систему',
    trust: ['Работает с вашими камерами', 'Работает на вашем сервере', 'Работает без интернета'],
    bottomLeft: 'Для складов, производств, торговых сетей, школ и логистики',
    bottomRight: 'Листайте дальше',
  },

  panel: {
    cam: 'КАМЕРА 04 / СЕВЕРНЫЙ ДОК',
    time: '22:41:08',
    target: 'ЧЕЛОВЕК / 97.4%',
    loop: 'ЛОКАЛЬНЫЙ КОНТУР',
    tracking: 'ВЕДЁТСЯ НАБЛЮДЕНИЕ',
    trackingMeta: 'НЕПРЕРЫВНО',
    caption: '01 / АКТИВНЫЙ КАРАУЛ',
    captionRight: 'ТРЕВОГА С КОНТЕКСТОМ',
  },

  feed: {
    head: 'ТРЕВОГИ СЕЙЧАС',
    count: '03 / 03',
    footer: 'Telegram-уведомления включены',
    items: [
      { time: '22:41:08', label: 'Вход в зону', detail: 'Северный док' },
      { time: '22:43:17', label: 'Вне рабочих часов', detail: 'Склад 04' },
      { time: '22:47:02', label: 'Камера не отвечает', detail: 'Ворота 02' },
    ],
  },

  proof: {
    lead: 'ДЛЯ КАМЕР, КОТОРЫЕ У ВАС УЖЕ ЕСТЬ',
    items: [
      'Без нового оборудования',
      'На вашем сервере',
      'Ничего не уходит с объекта',
      'Контур остаётся закрытым',
    ],
  },

  shift: {
    kicker: 'ПЕРЕМЕНА',
    titleA: 'От пассивного архива',
    titleEm: 'к активному караулу.',
    text: 'Большинство камер делают свою работу молча: записывают всё и не сообщают ничего. Pragmata смотрит поток, понимает сцену и говорит команде, когда правило нарушено.',
    link: 'Перейти к возможностям',
    before: {
      label: 'ДО / CCTV',
      tag: 'ПАССИВНО',
      title: 'Что-то произошло.',
      text: 'Смотреть часы записи. Восстанавливать момент. Надеяться, что камера его видела.',
      meta: 'ПОСЛЕ СОБЫТИЯ / ВРУЧНУЮ',
    },
    after: {
      label: 'ПОСЛЕ / PRAGMATA',
      tag: 'АКТИВНО',
      title: 'Вот доказательство.',
      text: 'Тревога, контекст и видео — пока они ещё нужны.',
      meta: 'СРАЗУ / АВТОМАТИЧЕСКИ',
    },
  },

  capabilities: {
    kicker: 'ПОМОЩНИК',
    titleA: 'Меньше смотреть.',
    titleEm: 'Больше знать.',
    lede: 'Pragmata снимает повторяющуюся работу с вашей сети камер, чтобы внимание команды уходило туда, где оно действительно нужно.',
    items: [
      {
        title: 'Видит людей в движении',
        text: 'Находит людей на ваших живых камерах и ведёт их по кадру, поэтому поток становится сигналом, а не пассивной записью.',
        tags: ['Живые камеры', 'Поиск людей', 'Непрерывное наблюдение'],
      },
      {
        title: 'Правила сообщают о себе сами',
        text: 'Понятные правила: вход в зону, долгое нахождение, присутствие вне рабочих часов, вход и выход, камера не отвечает. Система не ждёт, пока кто-то заметит.',
        tags: ['Вход в зону', 'Долгое нахождение', 'Вне рабочих часов'],
      },
      {
        title: 'Доказательство уже нарезано',
        text: 'К каждой тревоге автоматически сохраняется короткое видео и кадр. Не нужно листать запись и угадывать, какой момент был важным.',
        tags: ['Видео автоматически', 'Кадр и запись', 'История тревог'],
      },
      {
        title: 'Спросите, что случилось',
        text: 'Спрашивайте на узбекском или русском: «Кто заходил на склад вчера вечером?» Ответ приходит вместе с кадром или видео.',
        tags: ['Узбекский и русский', 'Обычные слова', 'С доказательством'],
      },
      {
        title: 'Найти человека по описанию',
        text: 'Опишите, кого ищете, и система пройдёт по сохранённым проходам. Помогает, когда описание помните лучше, чем время.',
        tags: ['По внешнему виду', 'По записям', 'Быстрый поиск'],
      },
      {
        title: 'Превращает запись в контекст',
        text: 'Описание сцены, автомобильные номера, тепловая карта и сводка за день делают тихие часы понятными без ещё одной системы, за которой надо следить.',
        tags: ['Описание сцены', 'Автономера', 'Сводка за день'],
      },
    ],
  },

  product: {
    kicker: 'ПАНЕЛЬ',
    titleA: 'Весь объект —',
    titleEm: 'на одном экране.',
    lede: 'Тревоги, живые камеры и вопросы к системе — в одном месте, на вашем сервере.',
    shots: [
      { title: 'Обзор объекта', text: 'Что произошло за сутки, по камерам и по правилам.' },
      { title: 'Тревоги и доказательства', text: 'Список событий, кадр и видео рядом с каждым.' },
    ],
  },

  industries: {
    kicker: 'ГДЕ РАБОТАЕТ',
    titleA: 'Сделано для',
    titleEm: 'настоящей смены.',
    lede: 'Для тех, кто отвечает за объект, когда двери закрылись, свет погас, а запись стала чужой проблемой.',
    items: [
      {
        label: '01 / СКЛАДЫ И ПРОИЗВОДСТВА',
        title: 'Узнавать не после смены.',
        text: 'Ловите вход в док, присутствие вне рабочих часов и отключение камеры, пока контекст ещё свежий.',
      },
      {
        label: '02 / ТОРГОВЫЕ СЕТИ',
        title: 'Каждый магазин под ответом.',
        text: 'Видно, что требует внимания на всех объектах: входы, выходы, долгое нахождение, необычные часы и доказательство за каждой тревогой.',
      },
      {
        label: '03 / ШКОЛЫ И ЛОГИСТИКА',
        title: 'Тихие места остаются видимыми.',
        text: 'Понятный присмотр за коридорами, воротами, дворами и маршрутами — теми камерами, которые уже стоят.',
      },
    ],
    link: 'Посмотреть сценарий',
    slip: 'ВИДЕО СОХРАНЕНО',
  },

  privacy: {
    kicker: 'ВОЗРАЖЕНИЕ',
    titleA: '«Данные уходят',
    titleEm: 'с моего объекта?»',
    no: 'НЕТ.',
    text: 'Pragmata работает на вашем сервере, с вашими камерами, полностью без интернета. Запись остаётся внутри вашей работы.',
    points: ['Без обработки в облаке', 'Без нового оборудования', 'Без зависимости от интернета'],
    panelHead: 'ЛОКАЛЬНАЯ СИСТЕМА / ОНЛАЙН',
    panelStrong: 'Ваш сервер',
    panelSmall: 'Обработка остаётся здесь',
  },

  workflow: {
    kicker: 'ОДИН КОНТУР / ЧЕТЫРЕ ШАГА',
    titleA: 'Когда на объекте тихо,',
    titleEm: 'Pragmata не молчит.',
    lede: 'Простой рабочий контур для тех моментов, которые обычно теряются между камерой и утренним отчётом.',
    steps: [
      { title: 'Заметить', text: 'Человек, движение, состояние камеры.' },
      { title: 'Понять', text: 'Правило, сцена, вопрос обычными словами.' },
      { title: 'Сообщить', text: 'Нужная тревога — в Telegram.' },
      { title: 'Доказать', text: 'Кадр или видео вместе с контекстом.' },
    ],
  },

  finalCta: {
    kicker: 'СЛЕДУЮЩАЯ СМЕНА',
    titleA: 'Дайте камерам',
    titleEm: 'голос.',
    text: 'Расскажите, что ваш объект перестанет пропускать. Мы покажем, куда Pragmata встаёт в уже имеющиеся камеры и процессы.',
    button: 'Поговорить с командой Pragmata',
    asideStrong: 'Караул, который не отвлекается.',
    metaLeft: 'ДЛЯ ЛОКАЛЬНОГО КОНТРОЛЯ',
    metaRight: 'UZ / RU / EN',
  },

  footer: {
    tagline: 'AI-безопасность для камер, которые у вас уже есть.',
    contact: 'Связаться',
    login: 'Войти в панель',
    copyright: '© 2026 PRAGMATA AI',
  },

  modal: {
    kicker: 'НАЧНЁМ С ВАШЕГО ОБЪЕКТА',
    titleA: 'Найдём',
    titleEm: 'пропущенные моменты.',
    text: 'Расскажите, где сегодняшние камеры заставляют вас догадываться. Команда Pragmata вернётся с понятным следующим шагом.',
    siteLabel: 'Ваш объект',
    siteOptions: ['Склад', 'Производство', 'Торговая сеть', 'Школа', 'Логистика'],
    camLabel: 'Сколько камер',
    camOptions: ['1–10 камер', '11–50 камер', '51–100 камер', 'Больше 100'],
    submit: 'Начать разговор',
    subject: 'Pragmata AI — разговор об объекте',
    fineprint: 'Облачный аккаунт не нужен. Новое оборудование не предлагаем.',
    close: 'Закрыть',
  },

  a11y: {
    home: 'Pragmata AI — на главную',
    nav: 'Основная навигация',
    menu: 'Меню',
    feed: 'Пример списка тревог',
  },
}

const uz: typeof ru = {
  nav: {
    how: 'Qanday ishlaydi',
    capabilities: 'Imkoniyatlar',
    product: 'Panel',
    industries: 'Obyektingiz uchun',
    privacy: 'Maxfiylik',
  },
  headerCta: 'Ishda ko‘rish',
  brand: { name: 'PRAGMATA', descriptor: 'O‘Z SERVERINGIZDA AI XAVFSIZLIK' },

  hero: {
    eyebrow: 'O‘Z SERVERINGIZDA ISHLAYDIGAN AI XAVFSIZLIK YORDAMCHISI',
    titleA: 'Kameralaringiz yozadi.',
    titleEm: 'Pragmata xabar beradi.',
    lede: 'Chalg‘imaydigan qorovul: kameralaringizni kuzatadi, muhimini topadi va dalilni jamoangizga yuboradi.',
    ctaPrimary: 'Qanday ishlaydi',
    ctaSecondary: 'Tizimni ko‘rish',
    trust: [
      'Mavjud kameralar bilan ishlaydi',
      'O‘z serveringizda ishlaydi',
      'Internetsiz ishlaydi',
    ],
    bottomLeft: 'Omborlar, ishlab chiqarish, savdo tarmoqlari, maktablar va logistika uchun',
    bottomRight: 'Pastga o‘tish',
  },

  panel: {
    cam: 'KAMERA 04 / SHIMOLIY DOK',
    time: '22:41:08',
    target: 'ODAM / 97.4%',
    loop: 'MAHALLIY HALQA',
    tracking: 'KUZATUV KETMOQDA',
    trackingMeta: 'UZLUKSIZ',
    caption: '01 / FAOL QOROVUL',
    captionRight: 'KONTEKSTLI TREVOGA',
  },

  feed: {
    head: 'HOZIRGI TREVOGALAR',
    count: '03 / 03',
    footer: 'Telegram xabarnomasi yoniq',
    items: [
      { time: '22:41:08', label: 'Hududga kirish', detail: 'Shimoliy dok' },
      { time: '22:43:17', label: 'Ish vaqtidan tashqari', detail: 'Ombor 04' },
      { time: '22:47:02', label: 'Kamera javob bermaydi', detail: 'Darvoza 02' },
    ],
  },

  proof: {
    lead: 'SIZDA ALLAQACHON BOR KAMERALAR UCHUN',
    items: [
      'Yangi qurilma shart emas',
      'O‘z serveringizda',
      'Ma‘lumot obyektdan chiqmaydi',
      'Halqa yopiq qoladi',
    ],
  },

  shift: {
    kicker: 'O‘ZGARISH',
    titleA: 'Passiv arxivdan',
    titleEm: 'faol qorovulga.',
    text: 'Ko‘p kameralar o‘z ishini jimgina qiladi: hammasini yozadi, hech narsa aytmaydi. Pragmata oqimni kuzatadi, sahnani tushunadi va qoida buzilganda jamoangizga aytadi.',
    link: 'Imkoniyatlarga o‘tish',
    before: {
      label: 'OLDIN / CCTV',
      tag: 'PASSIV',
      title: 'Nimadir bo‘ldi.',
      text: 'Soatlab yozuvni ko‘rish. Lahzani tiklash. Kamera ko‘rgan bo‘lsin deb umid qilish.',
      meta: 'VOQEADAN KEYIN / QO‘LDA',
    },
    after: {
      label: 'KEYIN / PRAGMATA',
      tag: 'FAOL',
      title: 'Dalil shu yerda.',
      text: 'Trevoga, kontekst va video — hali kerak bo‘lganda.',
      meta: 'O‘SHA ZAHOTI / AVTOMATIK',
    },
  },

  capabilities: {
    kicker: 'YORDAMCHI',
    titleA: 'Kamroq qarash.',
    titleEm: 'Ko‘proq bilish.',
    lede: 'Pragmata kameralar tarmog‘idagi takrorlanuvchi ishni o‘ziga oladi, jamoangizning e‘tibori esa haqiqatan kerak joyga qoladi.',
    items: [
      {
        title: 'Harakatdagi odamlarni ko‘radi',
        text: 'Jonli kameralaringizda odamlarni topadi va kadr bo‘ylab kuzatib boradi — oqim passiv yozuv emas, signalga aylanadi.',
        tags: ['Jonli kameralar', 'Odam topish', 'Uzluksiz kuzatuv'],
      },
      {
        title: 'Qoidalar o‘zi xabar beradi',
        text: 'Tushunarli qoidalar: hududga kirish, uzoq turish, ish vaqtidan tashqari bo‘lish, kirish va chiqish, kamera javob bermasligi. Tizim kimdir sezishini kutmaydi.',
        tags: ['Hududga kirish', 'Uzoq turish', 'Ish vaqtidan tashqari'],
      },
      {
        title: 'Dalil allaqachon kesilgan',
        text: 'Har bir trevogaga qisqa video va kadr avtomatik saqlanadi. Yozuvni varaqlab, qaysi lahza muhim ekanini taxmin qilish shart emas.',
        tags: ['Video avtomatik', 'Kadr va yozuv', 'Trevogalar tarixi'],
      },
      {
        title: 'Nima bo‘lganini so‘rang',
        text: 'O‘zbek yoki rus tilida so‘rang: «Kecha kechqurun omborga kim kirdi?» Javob kadr yoki video bilan keladi.',
        tags: ['O‘zbek va rus', 'Oddiy so‘zlar', 'Dalil bilan'],
      },
      {
        title: 'Tavsif bo‘yicha odam topish',
        text: 'Kimni izlayotganingizni ta‘riflab bering — tizim saqlangan o‘tishlar bo‘ylab qidiradi. Vaqtdan ko‘ra tavsif yodda bo‘lganda qo‘l keladi.',
        tags: ['Ko‘rinish bo‘yicha', 'Yozuvlar bo‘ylab', 'Tez qidiruv'],
      },
      {
        title: 'Yozuvni kontekstga aylantiradi',
        text: 'Sahna tavsifi, avtomobil raqamlari, issiqlik xaritasi va kunlik xulosa jim soatlarni tushunarli qiladi — yana bir kuzatib turadigan tizimsiz.',
        tags: ['Sahna tavsifi', 'Avto raqam', 'Kunlik xulosa'],
      },
    ],
  },

  product: {
    kicker: 'PANEL',
    titleA: 'Butun obyekt —',
    titleEm: 'bitta ekranda.',
    lede: 'Trevogalar, jonli kameralar va tizimga savollar — bitta joyda, o‘z serveringizda.',
    shots: [
      {
        title: 'Obyekt ko‘rinishi',
        text: 'Bir sutkada nima bo‘ldi — kameralar va qoidalar bo‘yicha.',
      },
      {
        title: 'Trevogalar va dalillar',
        text: 'Voqealar ro‘yxati, har biriga kadr va video yonida.',
      },
    ],
  },

  industries: {
    kicker: 'QAYERDA ISHLAYDI',
    titleA: 'Haqiqiy smena',
    titleEm: 'uchun qilingan.',
    lede: 'Eshiklar yopilib, chiroq o‘chib, yozuv boshqaning muammosiga aylanganda obyekt uchun javob beradiganlar uchun.',
    items: [
      {
        label: '01 / OMBOR VA ISHLAB CHIQARISH',
        title: 'Smenadan keyin bilib qolmang.',
        text: 'Dokka kirish, ish vaqtidan tashqari harakat va kamera uzilishini kontekst hali yangi bo‘lganda ushlang.',
      },
      {
        label: '02 / SAVDO TARMOQLARI',
        title: 'Har bir do‘kon javob beradi.',
        text: 'Barcha obyektlarda nima e‘tibor talab qilishi ko‘rinadi: kirish, chiqish, uzoq turish, g‘ayrioddiy vaqt va har bir trevoga ortidagi dalil.',
      },
      {
        label: '03 / MAKTAB VA LOGISTIKA',
        title: 'Jim joylar ko‘rinib turadi.',
        text: 'Yo‘laklar, darvozalar, hovlilar va yo‘nalishlar uchun tushunarli nazorat — allaqachon turgan kameralar bilan.',
      },
    ],
    link: 'Holatni ko‘rish',
    slip: 'VIDEO SAQLANDI',
  },

  privacy: {
    kicker: 'E‘TIROZ',
    titleA: '«Ma‘lumot obyektdan',
    titleEm: 'chiqib ketadimi?»',
    no: 'YO‘Q.',
    text: 'Pragmata sizning serveringizda, sizning kameralaringiz bilan, butunlay internetsiz ishlaydi. Yozuv ishingiz ichida qoladi.',
    points: ['Bulutda ishlov yo‘q', 'Yangi qurilma yo‘q', 'Internetga bog‘liqlik yo‘q'],
    panelHead: 'MAHALLIY TIZIM / ONLAYN',
    panelStrong: 'Sizning serveringiz',
    panelSmall: 'Ishlov shu yerda qoladi',
  },

  workflow: {
    kicker: 'BITTA HALQA / TO‘RT QADAM',
    titleA: 'Obyekt jimib qolganda,',
    titleEm: 'Pragmata jim turmaydi.',
    lede: 'Kamera va ertalabki hisobot orasida odatda yo‘qoladigan lahzalar uchun oddiy ish halqasi.',
    steps: [
      { title: 'Sezish', text: 'Odam, harakat, kamera holati.' },
      { title: 'Tushunish', text: 'Qoida, sahna, oddiy so‘zlardagi savol.' },
      { title: 'Xabar berish', text: 'Kerakli trevoga — Telegramga.' },
      { title: 'Isbotlash', text: 'Kadr yoki video, kontekst bilan.' },
    ],
  },

  finalCta: {
    kicker: 'KEYINGI SMENA',
    titleA: 'Kameralaringizga',
    titleEm: 'ovoz bering.',
    text: 'Obyektingiz nimani boy bermasligi kerakligini aytib bering. Pragmata mavjud kameralar va jarayonlaringizga qanday tushishini ko‘rsatamiz.',
    button: 'Pragmata jamoasi bilan gaplashish',
    asideStrong: 'Chalg‘imaydigan qorovul.',
    metaLeft: 'MAHALLIY NAZORAT UCHUN',
    metaRight: 'UZ / RU / EN',
  },

  footer: {
    tagline: 'Sizda allaqachon bor kameralar uchun AI xavfsizlik.',
    contact: 'Bog‘lanish',
    login: 'Panelga kirish',
    copyright: '© 2026 PRAGMATA AI',
  },

  modal: {
    kicker: 'OBYEKTINGIZDAN BOSHLAYMIZ',
    titleA: 'Boy berilgan',
    titleEm: 'lahzalarni topamiz.',
    text: 'Hozirgi kameralaringiz sizni qayerda taxmin qilishga majbur qilayotganini aytib bering. Pragmata jamoasi tushunarli keyingi qadam bilan qaytadi.',
    siteLabel: 'Obyektingiz',
    siteOptions: ['Ombor', 'Ishlab chiqarish', 'Savdo tarmog‘i', 'Maktab', 'Logistika'],
    camLabel: 'Kamera soni',
    camOptions: ['1–10 kamera', '11–50 kamera', '51–100 kamera', '100 dan ko‘p'],
    submit: 'Suhbatni boshlash',
    subject: 'Pragmata AI — obyekt haqida suhbat',
    fineprint: 'Bulut hisobi shart emas. Yangi qurilma taklif qilmaymiz.',
    close: 'Yopish',
  },

  a11y: {
    home: 'Pragmata AI — boshiga',
    nav: 'Asosiy navigatsiya',
    menu: 'Menyu',
    feed: 'Trevogalar ro‘yxati namunasi',
  },
}

const en: typeof ru = {
  nav: {
    how: 'How it works',
    capabilities: 'Capabilities',
    product: 'Dashboard',
    industries: 'For your site',
    privacy: 'Privacy',
  },
  headerCta: 'See it in action',
  brand: { name: 'PRAGMATA', descriptor: 'ON-PREMISE AI SECURITY' },

  hero: {
    eyebrow: 'ON-PREMISE AI SECURITY COPILOT',
    titleA: 'Your cameras record.',
    titleEm: 'Pragmata reports.',
    lede: 'The guard that never looks away — watching your existing cameras, finding what matters, and sending the evidence to your team.',
    ctaPrimary: 'See how it works',
    ctaSecondary: 'Explore the system',
    trust: ['Works with existing cameras', 'Runs on your server', 'Runs fully offline'],
    bottomLeft: 'For warehouses, factories, retail chains, schools and logistics',
    bottomRight: 'Scroll to inspect',
  },

  panel: {
    cam: 'CAM 04 / NORTH BAY',
    time: '22:41:08',
    target: 'PERSON / 97.4%',
    loop: 'LOCAL LOOP',
    tracking: 'TRACKING ACTIVE',
    trackingMeta: 'CONTINUOUS',
    caption: '01 / THE ACTIVE GUARD',
    captionRight: 'ALERTS WITH CONTEXT',
  },

  feed: {
    head: 'LIVE ALERTS',
    count: '03 / 03',
    footer: 'Telegram push active',
    items: [
      { time: '22:41:08', label: 'Zone entry', detail: 'North loading bay' },
      { time: '22:43:17', label: 'After hours', detail: 'Warehouse 04' },
      { time: '22:47:02', label: 'Camera not responding', detail: 'Gate 02' },
    ],
  },

  proof: {
    lead: 'BUILT FOR THE CAMERAS YOU ALREADY OWN',
    items: [
      'No new hardware',
      'On your server',
      'Nothing leaves the site',
      'The loop stays closed',
    ],
  },

  shift: {
    kicker: 'THE SHIFT',
    titleA: 'From passive archive',
    titleEm: 'to active guard.',
    text: 'Most cameras do their job quietly — recording everything and reporting nothing. Pragmata watches the stream, understands the scene, and tells your team when the rule is broken.',
    link: 'Meet the capabilities',
    before: {
      label: 'BEFORE / CCTV',
      tag: 'PASSIVE',
      title: 'Something happened.',
      text: 'Watch hours of footage. Reconstruct the moment. Hope the camera saw it.',
      meta: 'AFTER THE FACT / MANUAL',
    },
    after: {
      label: 'AFTER / PRAGMATA',
      tag: 'ACTIVE',
      title: 'Here is the evidence.',
      text: 'The alert, the context, and the clip — while they are still useful.',
      meta: 'IN THE MOMENT / AUTOMATIC',
    },
  },

  capabilities: {
    kicker: 'THE COPILOT',
    titleA: 'Less watching.',
    titleEm: 'More knowing.',
    lede: 'Pragmata takes the repetitive work out of your camera network so your team can spend attention where it actually matters.',
    items: [
      {
        title: 'Sees people in motion',
        text: 'Finds people on your live cameras and follows them across the frame, so a feed becomes a signal instead of a passive recording.',
        tags: ['Live cameras', 'People finding', 'Continuous tracking'],
      },
      {
        title: 'Rules that report themselves',
        text: 'Plain rules: zone entry, lingering, presence outside working hours, entry and exit, camera not responding. The system does not wait for someone to notice.',
        tags: ['Zone entry', 'Lingering', 'After hours'],
      },
      {
        title: 'Evidence, already clipped',
        text: 'Every alert automatically keeps a short clip and a still frame. No scrubbing, no guessing which moment mattered.',
        tags: ['Automatic clip', 'Frame and clip', 'Alert history'],
      },
      {
        title: 'Ask what happened',
        text: 'Ask in Uzbek or Russian: “Who entered the warehouse last night?” The answer arrives with a frame or a clip.',
        tags: ['Uzbek and Russian', 'Plain words', 'Backed by evidence'],
      },
      {
        title: 'Find a person by description',
        text: 'Describe who you are looking for and the system walks the saved passes. Useful when you remember the description better than the time.',
        tags: ['By appearance', 'Across records', 'Fast search'],
      },
      {
        title: 'Turns footage into context',
        text: 'Scene descriptions, licence plates, a heat map, and a daily summary make the quiet hours legible without another system to babysit.',
        tags: ['Scene description', 'Licence plates', 'Daily summary'],
      },
    ],
  },

  product: {
    kicker: 'THE DASHBOARD',
    titleA: 'The whole site —',
    titleEm: 'on one screen.',
    lede: 'Alerts, live cameras, and questions to the system — in one place, on your server.',
    shots: [
      { title: 'Site overview', text: 'What happened in a day, by camera and by rule.' },
      {
        title: 'Alerts and evidence',
        text: 'The event list, with a frame and a clip beside each one.',
      },
    ],
  },

  industries: {
    kicker: 'WHERE IT WORKS',
    titleA: 'Built for the',
    titleEm: 'real shift.',
    lede: 'For the people responsible when the doors close, the lights go out, and the footage becomes someone else’s problem.',
    items: [
      {
        label: '01 / WAREHOUSES & FACTORIES',
        title: 'Stop finding out after the shift.',
        text: 'Catch loading bay entry, after-hours presence, and camera downtime while the context is still fresh.',
      },
      {
        label: '02 / RETAIL CHAINS',
        title: 'Every store accountable.',
        text: 'See what needs attention across sites: entries, exits, lingering, unusual hours, and the evidence behind each alert.',
      },
      {
        label: '03 / SCHOOLS & LOGISTICS',
        title: 'The quiet places stay visible.',
        text: 'Practical watch over corridors, gates, yards, and routes — with the cameras already in place.',
      },
    ],
    link: 'See the use case',
    slip: 'CLIP SAVED',
  },

  privacy: {
    kicker: 'THE OBJECTION',
    titleA: '“Does data leave',
    titleEm: 'my site?”',
    no: 'NO.',
    text: 'Pragmata runs on your server, with your existing cameras, fully offline. Your footage stays inside your operation.',
    points: ['No cloud processing', 'No new hardware', 'No dependence on the internet'],
    panelHead: 'LOCAL SYSTEM / ONLINE',
    panelStrong: 'Your server',
    panelSmall: 'Processing stays here',
  },

  workflow: {
    kicker: 'ONE LOOP / FOUR MOVES',
    titleA: 'When the site goes quiet,',
    titleEm: 'Pragmata does not.',
    lede: 'A simple operating loop for the moments that usually disappear between a camera feed and a morning report.',
    steps: [
      { title: 'Detect', text: 'A person, a movement, a camera state.' },
      { title: 'Understand', text: 'A rule, a scene, a question in plain words.' },
      { title: 'Notify', text: 'The right alert, pushed to Telegram.' },
      { title: 'Prove', text: 'A frame or a clip with the context attached.' },
    ],
  },

  finalCta: {
    kicker: 'THE NEXT SHIFT',
    titleA: 'Give your cameras',
    titleEm: 'a voice.',
    text: 'Tell us what your site needs to stop missing. We will show you where Pragmata fits into the cameras and workflows you already have.',
    button: 'Talk to the Pragmata team',
    asideStrong: 'The guard that never looks away.',
    metaLeft: 'BUILT FOR LOCAL CONTROL',
    metaRight: 'UZ / RU / EN',
  },

  footer: {
    tagline: 'AI security for the cameras you already have.',
    contact: 'Contact',
    login: 'Sign in',
    copyright: '© 2026 PRAGMATA AI',
  },

  modal: {
    kicker: 'START WITH YOUR SITE',
    titleA: 'Let’s find the',
    titleEm: 'missed moments.',
    text: 'Tell us where your current cameras leave you guessing. A member of the Pragmata team will follow up with a practical next step.',
    siteLabel: 'Your site',
    siteOptions: ['Warehouse', 'Factory', 'Retail chain', 'School', 'Logistics'],
    camLabel: 'Existing cameras',
    camOptions: ['1–10 cameras', '11–50 cameras', '51–100 cameras', '100+ cameras'],
    submit: 'Open a conversation',
    subject: 'Pragmata AI site conversation',
    fineprint: 'No cloud account required. No new hardware pitch.',
    close: 'Close',
  },

  a11y: {
    home: 'Pragmata AI home',
    nav: 'Primary navigation',
    menu: 'Menu',
    feed: 'Sample alert feed',
  },
}

const DECKS = { ru, uz, en }

export type LandingCopy = typeof ru

// i18n.language может быть 'uz-UZ' или чем-то незнакомым — берём первые две буквы
export function landingCopy(lang: string | undefined): LandingCopy {
  const code = (lang ?? 'uz').slice(0, 2)
  return code in DECKS ? DECKS[code as keyof typeof DECKS] : uz
}
