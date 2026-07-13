# Soqchi AI — Vizyon va kelajak rejalari

> `DESIGN.uz.md` MVP **nima qilishini** aytadi. Bu hujjat — **nega** va **keyin nima bo'lishini**.
> Holat: 2026-07-13. Ufq: 24+ oy.

---

## 1. Vizyon

O'zbekistonda millionlab kamera bor, lekin ular faqat **yozadi** — hech kim ko'rmaydi. Insident bo'lganda odamlar soatlab peremotka qiladi; qorovul 40 ekranga qarab o'tiradi va deyarli hammasini o'tkazib yuboradi.

Bizning vizyon: **har bir kamera aqlli qorovulga aylanadi.** Besh yil ichida Markaziy Osiyoda «kamerangdan so'ra» odatiy ishga aylanadi: direktor Telegramda «bugun nima bo'ldi?» deb yozadi va 20 soniyada javob oladi — fotosi, klipi, vaqti bilan.

Soqchi AI shu qatlamning standarti bo'ladi: **mavjud kameralar ustidagi AI-tahlilchi** — kamera brendidan qat'i nazar, ma'lumot binodan chiqmagan holda.

Kategoriya: biz «video analytics» sotmaymiz — O'zbekistonda **Physical Security Copilot** kategoriyasini birinchi bo'lib egallaymiz.

## 2. Missiya

Har qanday tashkilotga — maktabdan zavodgacha — **yangi uskuna sotib olmasdan** o'z kameralaridan aqlli xavfsizlik olish imkonini berish: o'zi kuzatadi, o'zi ogohlantiradi, savolga javob beradi, dalilni soniyalarda topib beradi.

---

## 3. Mahsulot evolyutsiyasi

### v0.1 — MVP (2026 avgust, early bird)
`DESIGN.uz.md` da to'liq: bitta edge-box, YOLO+tracking, rule engine, Telegram-bot, agent (SQL-first tools), kechki digest, Investigation Mode, L0-yuzlar, FP-tugma.

### v1.0 — «Pilot» (2026 sentyabr–noyabr: final + birinchi obyektlar)
Maqsad: **3–5 real obyektda barqaror ishlash.**
- L1 anonim klasterlash default yoqiq; kross-kamera timeline barqaror
- PDF-akt eksporti to'liq (tergov hisobotlari, uz/ru shablonlar)
- Case-lite: insidentni «ish»ga yig'ish (eventlar + kliplar + izohlar)
- FP-tuning avtomatik sikli sayqallangan (taklif → bir tugmada apply)
- O'rnatish bir buyruqda (installer-skript), dashboard uz/ru i18n
- Sotuv materiallari: ROI-kalkulyator («qorovul oyligi = 30–50 kamera podpiskasi»)

### v1.5 — «Commercial» (2027 Q1)
Maqsad: **pulli mijozlar va kanal.**
- Control plane v1: fleet-monitoring, OTA-yangilanishlar, litsenziya-server
- Billing (kamera soniga oylik), bir mijozda ko'p obyekt (multi-site)
- L2: nomlangan identity (xodimlar ro'yxati, consent-jarayon bilan), watchlist
- Xodimlar davomat-hisobotlari (kelish/ketish vaqtlari)
- **Chat orqali qoida yaratish:** «qoida: 22:00dan keyin omborga kirsa — alert» → agent configni o'zi yozadi va tasdiqlatib oladi
- Integrator-portal v0: partnyor dasturi (marja %, sertifikatlash, demo-stend)
- Haftalik trend-digestlar; kengaytirilgan rollar/ruxsatlar

### v2.0 — «Platform» (2027 H2)
- Kichik mijozlar uchun **multi-tenant cloud** (edge-box shart emas)
- **Telegram mini-app** dashboard (mobil ilovadan oldin — arzon, tez, hamma o'sha yerda)
- **Knowledge graph:** eventlar orasidagi bog'lanishlar («shu odam ketma-ket 3 kecha kelgan», «doim shu mashina bilan birga») — MVPdan graph-ready sxema ustiga view sifatida
- **Audio-eventlar:** oyna sinishi, qichqiriq, signalizatsiya ovozi
- **ANPR** (avto raqamlari) + transport/parking moduli
- Retail-analitika moduli (ochered, kirim oqimi, heatmap) — xavfsizlikdan biznes-analitikaga upsell
- Tashqi API + webhooklar (uchinchi tizimlarga integratsiya)
- **Pultli qo'riqlash kompaniyalari integratsiyasi** — ularning monitoring-markazlariga Soqchi oqimi (bitta operator 10x obyekt kuzatadi)
- **To'liq offline rejim:** lokal VLM/LLM box ichida — davlat/bank uchun internetga umuman chiqmasdan

### v3.0 — «Region» (2028)
- Markaziy Osiyo: KZ, KG, TJ (ruscha tayyor; qozoq/qirg'iz lokalizatsiyasi)
- **«Soqchi Box»** — o'zimizning tayyor edge-hardware liniyamiz (marja + o'rnatish soddaligi)
- Lokal kontekstga fine-tune qilingan VLM
- **Anomaliya-AI:** har obyektning «normal kuni» o'rganiladi, og'ishlar qoidasiz aniqlanadi
- **Proaktiv agent-patrul:** agent o'zi shubhali paternlarni qidirib, haftalik xavfsizlik-audit hisobotini beradi
- Detection-«skill» marketpleysi (vertikal paketlar do'koni)

---

## 4. Vertikal paketlar (preset qoidalar + digest shabloni + KPI)

| Vertikal | Og'riq | Paket tarkibi |
|---|---|---|
| Retail-tarmoqlar | o'g'irlik, ochered, intizom | kassa-zona nazorati, ochered ≥ N, ochilish vaqti |
| Ta'lim | bola xavfsizligi, begonalar | kirish-chiqish, notanish odam, taqiqlangan zonalar, davomat |
| Qurilish | TB, tungi o'g'irlik | kaska/jilet (PPE), tungi perimetr, texnika zonalari |
| Ombor/logistika | yo'qotishlar, TB | dock-nazorat, ruxsatsiz kirish, PPE |
| Turar-joy (ЖК/TChSJ) | begonalar, parking | notanishlar, tungi harakat, parking |
| Ofis/bank | after-hours, tailgating | ish vaqtidan keyin harakat, «ikki kishi bitta karta» |
| HORECA | ochered, sig'im | zal to'lganligi, ochered, ochilish nazorati |

Har paket = tayyor qoidalar to'plami + o'z digest-shabloni + o'z KPI-paneli. Sotuvda «sizning sohangiz uchun tayyor» — bu integratorga sotishni osonlashtiradi.

---

## 5. Texnologik roadmap (AI chuqurligi bo'yicha)

1. **Perception:** yangi detektorlar, **body re-ID** (yuz ko'rinmasa — kiyim/qomat bo'yicha), pose-estimation (yiqilish/mushtlashish — endi sifatli qilib, MVPdagi kabi rad etilmaydi), termal kameralar, audio-kanal.
2. **Reasoning:** knowledge graph, kross-event korrelyatsiya, obyekt xulq-baseline'i (anomaliyalar qoidasiz), sabab-zanjirlari («eshik ochiq qolgani UCHUN begona kirdi»).
3. **Avtonomiya:** chat orqali qoida yaratish, FP-feedbackdan avto-tuning, rejali audit-hisobotlar, proaktiv patrul.
4. **Suverenitet:** to'liq lokal stack (VLM/LLM box ichida) — davlat sektorining kirish sharti; o'zbek kontekstiga fine-tune.
5. **Data flywheel:** har bir «false» bosilishi va tasdiqlangan alert — faqat bizda bor tuning-dataset. Qancha ko'p obyekt — shuncha aqlli default-poroglar → yangi mijozga «qutidan chiqqanda» kam FP. Bu raqib ko'chira olmaydigan aktiv.

---

## 6. Biznes-reja

**Kanallar (ketma-ketlik bilan):**
1. To'g'ridan-to'g'ri pilotlar (Begzod domla kolleji + 2–3 obyekt) — case study uchun
2. **Integrator-o'rnatuvchilar — asosiy kanal:** ularda minglab o'rnatilgan kamera va mijoz bilan doimiy aloqa bor; recurring'dan %, sertifikatlash, demo-stend
3. **Pultli qo'riqlash kompaniyalari:** ularning monitoring-markazlari uchun ko'paytirgich — bitta operator 10 barobar ko'p obyektni sifatli kuzatadi
4. Davlat tenderlari — sertifikatlash va to'liq offline rejimdan keyin (2027+)

**Narx evolyutsiyasi:** kameraga oylik podpiska (kichiklar 30–50 ming so'mdan, o'rta segment yuqoriroq) → enterprise litsenziya + yillik support → hardware-bundle marjasi (Soqchi Box) → vertikal paket qo'shimchalari → API-tariflar.

**Jamoa:** hozir 3 kishi (konkurs sharti — shu haftada yopiladi). Keyin: +1 CV-injener (konkursdan keyin), +1 sotuv/BD (2027 H1), +support (birinchi ~20 mijozdan keyin).

**Moliya bosqichlari:** bootstrap (~$0–100 MVP) → konkurs sovrini (trek bo'yicha $40–100k — KPI bilan ikki transhli investitsiya) → **IT Park rezidentligi** (soliq imtiyozlari) → lokal fondlar/akseleratorlar → metrikalar yaxshi bo'lsa seed (2027 oxiri).

**Bozor gipotezalari** (pitchga raqam qo'yishdan OLDIN tekshiriladi): O'zbekistonda xususiy segmentda yuz minglab kamera; birgina Toshkentda adreslanadigan o'n minglab obyekt. Safe City davlat segmenti alohida va juda katta — lekin bu 2027+ maqsadi, MVP emas.

---

## 7. Muvaffaqiyat metrikalari (KPI)

- **Boshqaruvdagi kameralar soni** — asosiy o'sish metrikasi
- MRR va churn
- False positive ulushi **< 10%** (obyekt kesimida, feedbackdan hisoblanadi)
- Alert → «ko'rildi» vaqti; agent javobi < 5 s
- Digest ochilish darajasi (mahsulot foydali ekanining belgisi)
- Pilot → pulli konversiya

Marralar: **2026 oxiri** — 3–5 pilot, 30–50 kamera · **2027 oxiri** — 20+ mijoz, 500+ kamera · **2028** — 5000+ kamera, region.

---

## 8. O'zgarmas prinsiplar

1. **Privacy-first:** video va biometriya obyektdan chiqmaydi; default — anonim.
2. **Edge-first:** og'ir hisob mijozda; bulut — boshqaruv va matn-eventlar.
3. **Camera-agnostic:** hech qachon «faqat bizning kamera bilan ishlaydi» demaymiz.
4. **Natija tili:** mijozga «4 soat → 20 soniya», AI chuqurligi — juri va investorga.
5. **Jim buzilish yo'q:** kamera o'lsa — bilamiz va aytamiz; o'z tizimimiz haqida ham shunday.
6. **Boring tech:** infra oddiy (Postgres/Redis/compose); murakkablik faqat AI-qatlamda.

---

## 9. Uzoq muddatli risklar → himoya (moat)

| Risk | Himoya |
|---|---|
| Hikvision/Dahua o'z AIsini kameraga qo'shib beradi | Biz brendlar **ustida** ishlaymiz (aralash parkda ham), + agent UX + o'zbek/rus til + lokal support — ular buni hech qachon bermaydi |
| Xorijiy raqib (Verkada-sinf) kiradi | Ular hardware+AQSh-bulut sotadi; bizda kanal (integratorlar), on-prem ishonch, narx |
| LLM narxlari/limitlari | SQL-first arxitektura (LLM minimal ishlaydi), lokal modellar rejasi (v2.0 offline) |
| Biometriya regulyatsiyasi qattiqlashadi | Anonim-default dizayn, TTL, «ma'lumotlar pasporti», L2 faqat consent bilan — biz regulyatsiyaga tayyormiz, raqiblar emas |
| Data-egallash: mijoz «hammasi menda qolsin» deydi | Aynan shunday ishlaymiz (edge-first) — bu risk emas, bizning sotuv argumentimiz |

---

## 10. 24 oylik xronologiya

- **2026 Q3:** MVP → ariza (early bird 15.08 / final 30.09)
- **2026 Q4:** finalistlar (05.11), marosim (20.11) · 3–5 pilot · v1.0
- **2027 Q1:** v1.5 — billing, birinchi pulli mijozlar, IT Park rezidentligi
- **2027 Q2:** integrator-dastur ishga tushadi, 100+ kamera
- **2027 H2:** v2.0 platform, pultli qo'riqlash integratsiyasi, 500+ kamera, seed-suhbatlar
- **2028:** v3.0 — region (KZ/KG), Soqchi Box, anomaliya-AI, 5000+ kamera

> Eslatma: v1.0 dan keyingi hamma sanalar — maqsad-mo'ljal, dogma emas. Har chorak oxirida reja fakt bilan solishtirilib yangilanadi.
