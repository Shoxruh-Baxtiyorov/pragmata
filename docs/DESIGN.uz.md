# «Pragmata AI» (ishchi nom) — MVP dizayn-hujjati · President AI Award 2026

> Holat: reja 2026-07-13 da kelishilgan. Muddatlar: early bird 15.08, final 30.09.
> Jamoa: Shoxruh + Otabek + uchinchi ishtirokchi (TBD — usiz ariza qabul qilinmaydi).
> Pilot-nomzod №1: yangi direktori Xalilov Begzod bo'lgan kollej (tanish domla — tasdiqlash kerak).

**Bir qatorda:** allaqachon o'rnatilgan kameralar ustida ishlaydigan AI-xavfsizlik tahlilchisi — o'zi kuzatadi, o'zi Telegramga doklad qiladi, o'zbek/rus tilida savollarga javob beradi va odamni tavsif bo'yicha soniyalarda topib beradi.

**Pozitsiyalash:** «video analytics» EMAS (u bozor to'la: Verkada/Rhombus/Hikvision/Axis), balki **AI Security Copilot**: «biz kameralarni emas, qaror qabul qilishni avtomatlashtiramiz». Mijoz uchun formula: «4 soat peremotka → 20 soniya». Jury uchun: o'zimizning CV-pipeline ustiga qurilgan agent-arxitektura.

---

## 1. Arxitektura

```
                ┌──────────────────────── EDGE-BOX (mijozda, on-prem) ───────────────────────────┐
Kameralar RTSP ─┐│                                                                                │
mp4 (dev) ──────┼▶ VideoSource ▶ Motion Gate ▶ YOLO ▶ ByteTrack ▶ Rule Engine ─▶ eventlar        │
telefon ────────┘│      │                              │  │           │            │              │
                 │      ▼                              │  ▼           ▼            ▼              │
                 │  Ring Buffer (H.264)         yuz-croplar  CLIP-emb.  VLM     Postgres          │
                 │      │                          │ (L0/L1)    │ (selektiv)   + pgvector         │
                 │      ▼                          ▼            ▼       │           │             │
                 │   kliplar ─────────────────▶  MinIO  ◀──────┘        └─────────▶│             │
                 │                                                                  │             │
                 │            AGENT (LLM + typed tools: SQL / vector / media) ◀────┘             │
                 └───────────────┬─────────────────────────────┬──────────────────────────────────┘
                                 ▼                             ▼
                          Telegram-bot                   Web-dashboard
                  (alertlar · chat · digest · FP)  (zonalar · lenta · investigation)
```

To'qqiz qatlam, mayda detallari bilan:

1. **VideoSource (interfeys).** RTSP (transport TCP — UDP kadr yo'qotadi) / mp4-loop (dev) / telefondan MJPEG (IP Webcam) / USB. Auto-reconnect backoff bilan 1→2→4…→60 s, health-status (oxirgi kadr yoshi, fps). Dekodlash native, detektsiyaga ~5 fps beriladi. Vaqt: server qabul vaqti bilan shtamplaymiz (kamera soatiga ishonmaymiz), bazada hammasi UTC, ko'rsatish Asia/Tashkent, boxda NTP shart.
2. **Motion Gate.** YOLOdan oldin arzon harakat detektori (grayscale 320px, MOG2/absdiff): N soniya harakat yo'q — detektsiya umuman ishlamaydi (kechasi deyarli hamma resursni tejaydi). Sezuvchanlik har kameraga alohida.
3. **Ring Buffer + kliplar.** ffmpeg `-c copy` (transkodsiz!) 2 soniyalik segmentlar yozadi, har kameraga 5–10 daqiqalik halqa (1080p/2 Mbit da ~75–150 MB — arzimas). Event klipi = [T−10 s, T+20 s] segmentlarni yelimlash → mp4. Hech qanday qayta kodlash yo'q — CPU bo'sh.
4. **Perception.** YOLO11n/s (MVPda faqat person), hamma kameralar kadrlari bitta GPU-o'tishga batch qilinadi; ByteTrack — kamera ichida barqaror track_id; <0.7 s treklar filtri (anti-fliker). Trek best-frame'i = keskinlik (Laplas) × bbox maydoni. Yuzlar: **L0** — person-bbox ichida SCRFD-detektsiya, sifat skoring (blur/burchak/o'lcham ≥48px), eng yaxshi crop eventga foto-dalil sifatida biriktiriladi (bu tanib olish EMAS — privacy-xavf ~0). **L1 (stretch)** — ArcFace-embedding, onlayn klasterlash (cos ≥ ~0.55) → anonim «Odam #17», tungi re-cluster; crop/embeddinglarga TTL. Trek boshiga bitta CLIP ViT-B/32 embedding → pgvector — Investigation Mode yoqilg'isi. Quvvat: Victus RTX 5–8 kamerani 5 fps da bemalol tortadi; dizayn-maqsad — desktop 3060 da 16 kamera.
5. **Rule Engine (deterministik, event fabrikasi).** Kirish: treklar + zonalar (har kameraga poligonlar, bbox bottom-center bo'yicha) + kalendar. Hamma joyda anti-spam: hysteresis (bitta emas, ketma-ket N kadrdan keyin event), cooldown (bitta trekka 5 daqiqada bitta zone-event), epizodlarni merge (<15 s uzilish = bitta event). Severity: info / warning / alert → marshrutlash matritsasi (darhol / digestga / faqat bazaga).
6. **VLM-qatlam (selektiv).** Trigger: faqat severity ≥ warning yoki configdagi turlar. Kirish: 3–5 asosiy kadr. Chiqish structured (function calling): tavsif ru/uz, teglar, aniqlashtirilgan severity va **fp_hint** — «bu soya/mushuk/blik» → odamni uyg'otishdan OLDIN avto-downgrade (VLM false-filtri — arzon ikkinchi fikr). Obyektga soatlik chaqiruv limiti, oshgani navbatga. Provayder OpenRouter orqali: devda free-modellar, prodga env-switch, fallback-zanjir.
7. **Storage.** Postgres 16 + pgvector (eventlar, treklar, personalar, zonalar, kameralar, feedback, embeddinglar); MinIO (kadr/crop/kliplar, TTL 30 kun — sozlanadi); Redis (VLM-job navbatlari, live-dashboard uchun pub/sub). Eventlar kichik satrlar — yil+ saqlaymiz; disk guard: kameraga GB limiti, eskilarni o'chirish, 90% da alert.
8. **Agent.** Typed tools orqali SQL-first (text-to-SQL EMAS — o'ylab topilgan kolonkalar va inyeksiyalar yo'q): `search_events(vaqt, kamera, zona, tur, severity, person_id)`, `semantic_search_events(matn)` (pgvector — «g'alati narsa bo'ldimi?» kabi noaniq so'rovlar uchun), `find_person_by_description(matn, interval)` (CLIP — Investigation), `person_timeline(person_id, sana)`, `get_clip/get_frame(event_id)`, `camera_status()`, `stats(davr, kesim)`. Agent read-only (baza viewlari ustida), uz/ru tushunadi, oxirgi N replika kontekstini ushlaydi («klipni ko'rsat» follow-up ishlaydi). Javob = matn + media-albom.
9. **Delivery + Ops.** Telegram-bot (aiogram 3) — asosiy UI; web-dashboard (React+Vite) — ikkinchi darajali. Bitta GPU-boxda docker-compose: core (ingest+perception+rules) / api (FastAPI) / bot / worker (VLM/digest/retention) / postgres / redis / minio / mediamtx (dev) / dashboard. CPU-only rejim ham bor (kamroq kamera — GPUsiz demo ham tirik). Jury'ga ko'rsatish — Cloudflare-tunnel orqali. Backup: tungi pg_dump + configlar (kliplarni backup qilmaymiz). Secretlar envda, RTSP-parollar bazada shifrlanadi (Fernet). Litsenziya (muddatli imzolangan fayl) va OTA-yangilanishlar — konkursdan keyin.

**Stack** (hammasi bizga tanish): Python 3.12 + uv, FastAPI, SQLAlchemy + Alembic, aiogram 3, ultralytics + supervision, insightface, open_clip, ffmpeg, Postgres + pgvector, Redis, MinIO, React + Vite + Tailwind, docker-compose. Yangi faqat supervision/open_clip — APIlari trivial.

---

## 2. Ma'lumotlar sxemasi (yadro)

- `sites` — obyekt: nom, timezone, ish kalendari (soatlar + bayramlar), digest sozlamalari.
- `cameras` — site_id, nom, url (shifrlangan), sozlamalar (fps, conf, motion), status, uptime.
- `zones` — camera_id, poligon (normallashgan koordinatalar), tur (restricted/counting/interest), qoida parametrlari.
- `tracks` — camera_id, t_start/t_end, trayektoriya xulosasi, best_crop, face_crop, clip_path, CLIP/face embeddinglar.
- `persons` (L1) — anonim klaster: centroid, «Odam #N» yorlig'i (qayta nomlanadi), first/last_seen, ko'rinishlar soni.
- `events` — tur, severity, kamera/zona, vaqtlar, track_ids[], person_ids[], kadr/crop/klip yo'llari, tavsif (VLM), embedding, meta jsonb.
- `feedback` — event_id, verdikt (false/tasdiqlangan), kim, qachon.
- `chats` — telegram chat_id, rol (owner/security/viewer), site_id.
- `digest_log`, `audit_log` (kim qaysi klipni ko'rgan).

---

## 3. Bitta eventning hayoti

19:43, ombor 18:00 da yopilgan.

1. 4-kameradan kadr; motion gate harakatni ko'rib o'tkazadi.
2. YOLO: person 0.87 → ByteTrack track #317 beradi.
3. Bbox bottom-center «Ombor-kirish» poligonida ketma-ket 12 kadr (hysteresis 10) → Rule Engine `zone_intrusion` + parallel `after_hours_presence` tug'diradi; merge → severity=alert bitta event; trekka cooldown qo'yildi.
4. Ring bufferdan transkodsiz klip [19:42:50 → 19:43:30]; best-frame tanlandi; SCRFD yuz topdi → crop saqlandi (L0).
5. Media MinIOga, event Postgresga, cropning CLIP-embeddingi pgvectorga.
6. severity=alert → VLM 4 kadrga qaraydi: «qora kurtkali erkak darvozadan kirdi, quti ko'tarib», fp_hint: yo'q → severity tasdiqlandi, tavsif eventga yozildi.
7. Bot owner va qorovulga kartochka yuboradi: foto + «19:43 · 4-kamera · Yopiq vaqtda zonaga kirish» + [🎬 Klip] [📍 Timeline] [⚠️ False] [✅ Ok].
8. Direktor [Klip]ni bosadi, ko'radi, yozadi: «bu odam bugun yana qayerda bo'lgan?» → agent → `person_timeline` → kameralar bo'ylab foto-albom.
9. 20:00 da event kun statistikasi bilan kechki digestga tushadi.
10. Qorovul bo'lib chiqdimi — direktor [⚠️ False] bosadi → feedbackka yoziladi → tungi job qoidaga tuzatish taklif qiladi («qorovul har kuni 19:40 da yuradi — jadval bo'yicha istisno qo'shaymi?»).

---

## 4. To'liq funksional — har bir mayda detali bilan

### A. Kameralar va ulanish
1. Kamerani RTSP URL orqali qo'shish + «tekshirish» tugmasi (saqlashdan oldin snapshot-preview).
2. Manbalar: RTSP / mp4-fayl / telefondan MJPEG / USB — bitta interfeys.
3. Eksponensial backoff bilan auto-reconnect; `camera_offline`/`camera_online` eventlari (mijozlarning real og'rig'i: kamera o'lib qoladi, bir oydan keyin bilishadi).
4. Health-monitor: fps, oxirgi kadr yoshi, uptime% — botda `/status`.
5. Har kameraga alohida: detektsiya fps, confidence porogi, motion sezuvchanligi, yoqilgan qoidalar.
6. Bitta boxda multi-kamera: demo 3–5, dizayn 16 gacha.

### B. Detektsiya, tracking, yuzlar
7. Odam detektsiyasi (YOLO11), poroglar har kameraga.
8. Barqaror track_id + <0.7 s treklar filtri (anti-fliker).
9. Trek boshiga best-frame: keskinlik × o'lcham (kartochka va VLM uchun).
10. **L0-yuzlar:** detektsiya + eng yaxshi yuz cropi event foto-dalili sifatida. Tanib olish emas — privacy-xavf ~0.
11. **L1 (stretch):** anonim klasterlash → kameralar va kunlar osha «Odam #17»; qo'lda nomlash («Sanjar-qorovul») — har obyektga opsional.
12. Person-croplarning CLIP-embeddinglari (trekka bitta) — Investigation Mode bazasi.
13. Har kameraga zona-poligonlar; turlari: taqiqlangan / hisoblash / qiziqish.

### C. Qoidalar va eventlar
14. `zone_intrusion` — taqiqlangan zonaga kirish (hysteresis N kadr, trekka cooldown).
15. `loitering` — zona/kamerada ≥ T daqiqa qolish.
16. `after_hours_presence` — ish vaqtidan tashqari odam (obyekt kalendari + bayramlar).
17. `person_entered/exited` + har kameraga kunlik tashrif hisoblagichi.
18. `crowding` — zonada ≥ N odam (trivial hisoblagich, lekin sotadi).
19. `camera_offline/online`.
20. `unknown_person` (faqat L1 bilan) — avval ko'rilmagan klaster.
21. Severity info/warning/alert + marshrutlash matritsasi (darhol / digest / faqat log).
22. Epizodlarni merge: zonadagi bitta odam = bitta event, 50 ta alert emas.
23. Cooldown: har qoida × kamera × trek.
24. Har event o'zi bilan: foto, yuz-crop (bo'lsa), klip, vaqtlar, kamera/zona, trek/persona havolalari.

### D. Kliplar va saqlash
25. H.264-copy halqa buferi (transkodsiz), klip = [T−10 s, T+20 s].
26. MinIO + TTL: klip/croplar 30 kun (config), eventlar bazada yil+.
27. Disk guard: kameraga limit, eskilarini o'chirish, 90% da alert.
28. Retention-siyosat sozlamalarda ochiq ko'rinadi (privacy-pitch uchun muhim).

### E. VLM-qatlam
29. Flaglangan eventlarning selektiv tavsiflari (3–5 kadr → strukturali JSON: tavsif ru/uz, teglar, severity, fp_hint).
30. **VLM false-filtri:** «soya/hayvon/blik» → odamni bezovta qilishdan OLDIN avto-downgrade.
31. Chaqiruvlarga budjet-limit (obyektga soat/kun), oshgani navbatga.
32. OpenRouter: devda free, prodda env-switch, fallback-zanjir.

### F. Agent (chat)
33. uz/ru erkin savollar; demoda ishlashi SHART bo'lgan so'rovlar:
    - «Kim 18:00dan keyin kirdi?» → search_events
    - «Bugun nechta odam keldi?» → stats
    - «3-kamera 14:00–15:00 nima ko'rdi?» → tanlash + xulosa
    - «Shu odamning hamma harakatini ko'rsat» (fotoga reply qilib) → person_timeline
    - «Qora kurtka, oq ryukzak, 15:00–16:00 — top» → CLIP-qidiruv
    - «Kecha g'alati narsa bo'ldimi?» → severity≥warning bo'yicha semantic search
34. Javob = matn + foto/klip albom; dialog konteksti (follow-up ishlaydi).
35. Agent read-only; admin-amallar faqat whitelist chat_id buyruqlari bilan.

### G. Bildirishnomalar va digest
36. Alert-kartochka: foto + nima/qayer/qachon + [🎬 Klip] [📍 Timeline] [⚠️ False] [✅ Ok].
37. **Kechki digest** (vaqti config, def. 20:00): kunning LLM-xulosasi, top-insidentlar (yuz + vaqt + klip), statistika (tashriflar, pik soatlar, kameralar kesimida), notanishlar (L1), kamera health, false hisoblagichi.
38. `/mute 1h|today` — warninglarga tinchlik; alert har doim o'tadi.
39. Qabul qiluvchi rollari: owner (hammasi) / security (alertlar) / viewer (digest).
40. Haftalik trend-digest (stretch).

### H. Sifat va feedback
41. «⚠️ False» tugmasi → feedback yozuvi.
42. Tungi job: qoida/kamera kesimida FP-hisobot + porog takliflari («cam3 zone_intrusion: 40% FP — hysteresisni 15 ga ko'taraymi?») — bir tugmada apply.
43. FP-kadrlar tuning uchun regressiya to'plami bo'lib yig'iladi.
44. Digestda sifat metrikalari: yuborilgan / tasdiqlangan / false.
45. **CIda golden-set:** 10 ta belgilangan klip → pipeline'ni offline o'tkazish → kutilgan eventlarni assert qilish. (Jury GitHubni o'qiydi — bu injenerlarni vibe-koderlardan ajratadi.)

### I. Investigation Mode (demoning mixi)
46. So'rov: tashqi ko'rinish tavsifi matnda + interval + kameralar → top-K nomzod (croplar bo'yicha CLIP-qidiruv).
47. Nomzodlar galereyasi → klik → odamning hamma ko'rinishlari, timeline, kliplar.
48. Topilmalarni «tergov»ga yig'ish → **PDF-akt eksporti** (weasyprint — Iqbola tajribasi; uz/ru shablonlar): obyekt tituli, skrinshotli xronologiya, kameralar, vaqtlar — rahbariyat/militsiya uchun tayyor akt. (Faqat 4-haftada bo'shliq qolsa.)

### J. Web-dashboard (yengil)
49. Live-devor: kameralarning oxirgi kadrlari, WebSocket orqali 1–2 s yangilanish (video-strim EMAS — WebRTC vaqtni bekorga yeydi, kadrlar yetadi).
50. Filtrli event-lenta (tur/kamera/severity/sana) + klip-pleyer.
51. Odam/trek timeline'i kameralar bo'ylab («Odam #24: 09:14 kam.2 → 09:17 kam.5 → 09:40 chiqdi»).
52. Zona-muharrir: snapshot ustida canvas-poligonlar, qoida parametrlari zonaga, restartsiz hot-reload.
53. Ish soatlari kalendari + bayramlar.
54. Statistika: kun/soat kesimida tashrif, event turlari.
55. Sozlamalar: kameralar, retention, alert-marshrutlash. Auth: bitta admin, JWT.

### K. Privacy va xavfsizlik (pitch-kritik)
56. Hammasi on-prem: video va yuzlar obyektdan chiqmaydi; tashqariga faqat matn-eventlar (u ham opsional).
57. Biometriyaga TTL va avto-o'chirish; ismlar o'rniga anonim IDlar (L1); nomlangan identity — faqat konkursdan keyin (L2), consent-jarayon bilan.
58. Audit log: kim qaysi klipni ko'rgan.
59. Secretlar envda; RTSP-parollar bazada shifrlangan.
60. Bir sahifalik «ma'lumotlar pasporti» (nimani, qayerda, qancha saqlaymiz) — direktor/yurist uchun.

### L. Ops
61. Bitta GPU-boxda `docker-compose up`; CPU-fallback rejim.
62. Self-monitoring: workerlar tirikligi, GPU xotira, disk; health-endpoint.
63. Tungi pg_dump + configlar (kliplar backup qilinmaydi).
64. Bot i18n: uz/ru satrlar YAMLdan, hardcode emas.
65. Demo-data seed-skripti (jonli eventlarni kutmasdan deck/video uchun material olish).

### M. Konkurs materiallari (bu ham funksional)
66. Toza public GitHub: README uz/ru/en, arxitektura diagrammasi, demo-GIFlar, LICENSE, .env.example, git tarixida hech qanday secret yo'q.
67. 3 daqiqalik video-pitch (ssenariy quyida).
68. 10–12 slaydlik pitch deck × 3 til + logo.
69. Sahnalashtirilgan demo-sahnalar (uy/kollej): yopilgandan keyin kirish, «yo'qolgan telefon» (Investigation uchun), oddiy kun (digest uchun).

---

## 5. Haftalik reja (early bird 15.08 gacha)

| Hafta | Nima | Hafta natijasi |
|---|---|---|
| **1** (14–20.07) | A, B, repo skeleti + CI, MediaMTX-stend | mp4→«RTSP»→detektsiya→bazada croplar bilan eventlar |
| **2** (21–27.07) | C, D, FP-tugma | Foto/klip/tugmali jonli Telegram-alertlar |
| **3** (28.07–3.08) | E, F, G, Investigation-qidiruv | Agent javob beradi, kechqurun digest keladi, tavsif bo'yicha qidiruv ishlaydi |
| **4** (4–10.08) | J, golden-set, PDF (bo'shliq bo'lsa), s'yomkalar, M | Dashboard + video + deck + toza GitHub |
| **11–15.08** | bufer + topshirish | Ariza yuborildi |

**Cut-line** (ortda qolsak shu tartibda kesamiz): PDF-eksport → L1-klasterlash → dashboardni minimumgacha (lenta+zonalar) → haftalik trendlar. **Hech qachon kesilmaydi:** agent, digest, Investigation-qidiruv, FP-tugma — bular jury-fichalar. Fallback — 30.09 final, to'liqroq versiya bilan.

**Rollar:** Shoxruh — perception/rules/kliplar/infra (insightface'ni allaqachon biladi); Otabek — API/agent/bot/digest; dashboard — 4-haftaga kim bo'shroq bo'lsa; uchinchi ishtirokchi — texnar bo'lsa: dashboard + testlar, bo'lmasa: video/deck/tarjimalar/logo + demo-ssenariylarni sinash.

---

## 6. Risklar → yopish

- **Real videoda false positive** (№1 risk) → hysteresis + cooldown + VLM-filtr + FP-tugma halqasi + tungi tuning + golden-set.
- **Beqaror RTSP** → reconnect/backoff, health-eventlar, devda MediaMTX.
- **GPU shifti** → motion gate, 5 fps stride, batching, yolo11n; pitchda halol kamera raqamlari.
- **VLM budjeti** → selektivlik + limitlar + devda free-modellar.
- **Muddatlar** → yuqoridagi cut-line; early bird agressiv, final bemalol.
- **Ariza** → uchinchi ishtirokchi SHU HAFTADA hal bo'ladi; 3 tildagi materiallar 4-haftaga qo'yilgan, «oxiriga» emas.
- **Biometriya yuridik** → L0/L1 anonim, TTL, «ma'lumotlar pasporti»; nomlangan tanib olish faqat konkursdan keyin.

## 7. Video-pitch ssenariysi (3:00)

- 0:00–0:20 — Muammo: «300 kamera, hech kim qaramaydi; insidentdan keyin — 4 soat peremotka».
- 0:20–1:00 — Sahna: kech, ombor yopiq, odam kiradi → Telegramga darhol foto va klipli kartochka tushadi.
- 1:00–1:40 — Chat: «Kim kirdi 18:00dan keyin?» → fotoli javob; «Shu odamning timeline'i» → kameralar bo'ylab marshrut.
- 1:40–2:20 — Investigation: «telefon yo'qoldi» → tashqi ko'rinish tavsifi → nomzodlar → klip → (PDF-akt).
- 2:20–2:50 — Kechki digest + «false» tugmasi (tizim o'rganadi) + on-prem/privacy slaydi.
- 2:50–3:00 — Jamoa, trek, ask.

## 8. Konkursgacha ataylab QILMAYMIZ

Mushtlashish/chekish/qurol detektsiyasi; transport va raqamlar (ANPR); nomlangan identity va watchlist; multi-tenant SaaS va billing; mobil ilova; cloud control plane/OTA; graf-dvijok (sxema graph-ready, graf keyin view sifatida); dashboardda live-strimlar; o'z modellarimizni o'qitish (faqat poroglar va qoidalar).

## 9. Nom

Ishchi nom — **«Pragmata AI»** (soqchi = qorovul/posbon): qisqa, lokal, soqchi.uz/ai domeni katta ehtimol bo'sh. Muqobillar: Nazorat Copilot, Kuzatuv AI. Qaror sizlarniki; dastlabki commitlar uchun repo nomi neytral bo'lishi mumkin.

## 10. Keyingi qadamlar

1. Bugun: Otabekdan «go» + rollarni bo'lish.
2. Shu haftada: uchinchi ishtirokchi + Begzod domlaga kollejdagi pilot haqida yozish.
3. Dushanba 14.07: repozitoriy, compose-skelet, MediaMTX-stend — 1-hafta boshlandi.
