# KRL Data API

API buat data KRL Commuter Line Jabodetabek. Orang daftar, login, bikin API key,
terus narik data stasiun, lin, jadwal, rute, sama tarif lewat HTTP. Tiap key
punya kuota harian dan semua pemakaiannya kecatat.

> Datanya bikinan sendiri buat keperluan kuliah — mendekati kondisi asli, tapi
> **bukan data resmi KAI Commuter**. Jangan dipakai buat ngejar kereta beneran ya.

## Yang bikin ini bukan CRUD biasa

Tiga bagian yang paling banyak makan waktu:

- **`POST /v1/route`** nyari rute tercepat pakai Dijkstra di atas graf jaringan.
  Simpulnya bukan stasiun doang, tapi pasangan *(stasiun, lin)* — jadi waktu
  pindah lin ikut kehitung. Efeknya: rute yang lebih jauh bisa menang kalau
  ternyata lebih cepat, persis kayak di dunia nyata.
- **Tarif dihitung dari jarak total perjalanan**, bukan dijumlah per lin. Itu
  cara KRL nagih: sekali tap masuk, sekali tap keluar. Aturannya dibaca dari
  tabel `fare_rules`, bukan angka yang ditanam di kode, jadi kalau tarifnya naik
  tinggal update satu baris SQL. Lin yang tarifnya sendiri kayak KA Bandara
  ditagih terpisah.
- **Jadwal disimpan sebagai pola operasi**, bukan puluhan ribu baris jam
  keberangkatan. Jamnya dibangkitkan pas ada permintaan masuk. Hemat banget di
  basis data, dan nambah lin baru cuma perlu beberapa baris pola.

## Autentikasi: butuh dua-duanya

Ada dua kredensial dan tugasnya beda:

| | Token JWT | API key |
|---|---|---|
| Dapetnya dari | `/auth/register` atau `/auth/login` | `POST /keys` (harus login dulu) |
| Dikirim lewat | `Authorization: Bearer <token>` | `X-API-Key: krl_live_...` |
| Gunanya | mbuktiin kamu siapa | nentuin kuota siapa yang kepakai |
| Umurnya | `JWT_EXPIRES` di `.env`, default 3600 detik | sampai dicabut |
| Kena kuota | nggak | iya |

Aturan mainnya:

- **`/v1/*` (semua endpoint data) minta dua-duanya sekaligus.** Kurang satu,
  ditolak 401. Dan API key-nya harus punya akun yang lagi login — pakai key
  orang lain dijawab 403.
- **`/keys/*` dan `/auth/me` cukup token.** Ini penting: kalau `/keys` ikut minta
  API key, user baru nggak akan pernah bisa bikin key pertamanya. Ayam sama
  telur.
- **Yang kebuka tanpa kredensial cuma** `/auth/register`, `/auth/login`,
  `/health`, sama halaman web (`/`, `/docs`, `/login`, `/register`).

Penjelasan lengkapnya, termasuk tiap endpoint sama contoh balasannya, ada di
halaman `/docs` pas aplikasinya jalan.

## Ngintip isi datanya dari dashboard

Di bawah dashboard ada penjelajah lin: enam chip warna-warni, klik satu, keluar
ringkasan lin + diagram urutan stasiunnya + blok JSON-nya.

JSON itu dicetak dari objek yang sama persis dengan yang dibalas `GET /v1/lines`,
jadi kamu bisa nyocokin hasil Postman sama tampilan dashboard baris per baris —
nggak usah main tebak-tebakan angka.

Kenapa datanya dirender dari server dan bukan di-fetch? Soalnya dashboard nggak
punya API key buat dikirim. Nilai utuh key cuma muncul sekali pas dibuat, sisanya
tinggal hash di basis data. Jadi ya, aturan keamanan di satu tempat maksa cara
bikin UI di tempat lain.

## Jalanin di laptop sendiri

```bash
npm install
cp .env.example .env      # isi DATABASE_URL sama JWT_SECRET
npm run db:start          # nyalain Postgres lokal (dibikinin otomatis)
npm run migrate           # bikin tabel + isi 287 baris data awal
npm test                  # 76 pengujian
npm run dev               # http://localhost:3000
```

Habis itu, tiap mau jalanin lagi cukup:

```bash
npm run db:start && npm run dev
```

`npm run db:start` nyiapin Postgres sendiri di `~/.local/share/krl-pg` porta
55432. Kepisah dari service `postgresql@18` bawaan sistem, jadi nggak tabrakan,
dan tetap hidup walau laptop di-restart. Cek keadaannya pakai `npm run db:status`.

`DATABASE_URL` bisa diarahin ke Postgres lokal atau ke Supabase. Kalau Supabase,
pakai **connection string transaction pooler (porta 6543)**, bukan direct
connection.

> **Awas.** Jangan arahin `DATABASE_URL` ke Supabase terus jalanin `npm test`.
> `schema.sql` diawali `DROP TABLE`, jadi pengujiannya bakal ngosongin basis data
> produksimu.

### Kenapa RLS nyala tapi nggak ada policy-nya

`schema.sql` nyalain Row Level Security di kesembilan tabel **tanpa satu pun
policy**. Ini disengaja, bukan lupa.

Supabase nyajiin tiap tabel di skema `public` lewat PostgREST, dan anon key-nya
sifatnya publik. Tanpa RLS, siapa pun yang megang anon key bisa baca tabel
`users` sama `api_keys` langsung dari internet — lewat semua pemeriksaan API key
dan kuota yang capek-capek dibikin di aplikasi ini.

Begitu RLS nyala tanpa policy, peran `anon` sama `authenticated` nggak dapat baris
satu pun. Aplikasinya sendiri tetap normal karena nyambung sebagai pemilik tabel,
dan pemilik tabel emang dilewatin RLS. Di Postgres lokal yang nggak punya
PostgREST, baris-baris itu nggak ngefek apa-apa.

## Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Import sebagai project baru di Vercel.
3. Isi environment variable: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES`,
   `NODE_ENV=production`, `APP_URL`.
4. Jalanin `npm run migrate` sekali dengan `DATABASE_URL` yang nunjuk ke Supabase.

`vercel.json` udah ada `includeFiles: "src/views/**"`. Baris itu wajib —
tanpa itu templat EJS nggak keikut ke bundel fungsi, dan dashboard bakal 500 di
produksi padahal di laptop aman-aman aja. Sempat kejadian, makanya ditulis.

## Perintah

| Perintah | Gunanya |
|----------|---------|
| `npm run db:start` | nyalain Postgres lokal |
| `npm run db:stop` | matiin Postgres lokal |
| `npm run db:status` | cek Postgres lokal lagi hidup apa nggak |
| `npm run dev` | jalanin server di porta 3000 |
| `npm run migrate` | bangun ulang skema + isi data awal |
| `npm test` | semua pengujian (76 kasus) |
| `npm run test:unit` | pengujian unit doang, nggak perlu basis data |
| `npm run docs` | render ulang diagram `.mmd` jadi PNG |

## Isi foldernya

```
api/index.js        titik masuk Vercel
src/config/         env, koneksi Postgres, zona waktu kuota
src/controllers/    handler HTTP per sumber daya
src/models/         akses data (SQL per domain)
src/routes/         pemetaan path -> controller
src/views/          templat EJS
src/services/       fungsi murni: graf, Dijkstra, tarif, jadwal
src/middleware/     JWT, API key, kuota, pencatat, penangan galat
src/docs/           isi halaman dokumentasi
db/schema.sql       9 tabel
db/seed.sql         287 baris data awal
docs/               laporan sama diagram
```

Polanya MVC: `models/` lapisan data, `views/` templat, `controllers/` yang
nanganin permintaan, `routes/` cuma metain path ke controller.

Satu hal yang sengaja dijaga: berkas di `src/services/` **nggak nyentuh basis
data sama sekali**. Dikasih data biasa, balikin hasil. Gara-gara itu bagian yang
paling rumit (Dijkstra, hitungan tarif, pembangkit jadwal) justru paling gampang
diuji — nggak perlu nyalain Postgres buat ngetes rute.

## Baca lebih lanjut

- Laporan lengkap + ERD, use case diagram, activity diagram:
  [`docs/laporan.md`](docs/laporan.md)
- Dokumentasi API buat yang mau makai: halaman `/docs` pas aplikasinya jalan
