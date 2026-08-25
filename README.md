# KRL Data API

SaaS penyedia data jaringan KRL Commuter Line Jabodetabek. Pihak lain mendaftar,
membuat API key, lalu mengambil data stasiun, lin, jadwal, rute, dan tarif
lewat HTTP dengan kuota harian yang tercatat.

> **Data pada layanan ini adalah data referensi terkurasi untuk keperluan
> akademik**, bukan data operasional resmi KAI Commuter. Jangan dipakai untuk
> perencanaan perjalanan sungguhan.

## Yang membuatnya bukan sekadar CRUD

- **`POST /v1/route`** mencari rute tercepat dengan Dijkstra di atas graf
  jaringan. Simpulnya adalah pasangan *(stasiun, lin)*, bukan stasiun saja,
  sehingga waktu pindah lin ikut diperhitungkan.
- **Tarif dihitung dari jarak total perjalanan**, sesuai cara KRL menagih
  (sekali tap masuk, sekali tap keluar), dan aturannya dibaca dari tabel
  `fare_rules` — bukan angka di dalam kode. Lin bertarif sendiri seperti KA
  Bandara ditagih terpisah.
- **Jadwal disimpan sebagai pola operasi**, bukan puluhan ribu baris jam
  keberangkatan. Jam keberangkatan dibangkitkan saat permintaan datang.

## Dua jalur autentikasi

| | Token JWT | API key |
|---|---|---|
| Untuk | manusia lewat peramban | program |
| Endpoint | `/auth/*`, `/keys/*`, dashboard | `/v1/*` |
| Umur | 1 jam | sampai dicabut |
| Kena kuota | tidak | ya |

## Menjalankan di komputer sendiri

```bash
npm install
cp .env.example .env      # isi DATABASE_URL dan JWT_SECRET
npm run db:start          # nyalakan Postgres lokal (dibuat otomatis)
npm run migrate           # buat tabel dan isi 287 baris data awal
npm test                  # 73 pengujian
npm run dev               # http://localhost:3000
```

Sesudah itu, tiap kali mau menjalankan lagi cukup:

```bash
npm run db:start && npm run dev
```

`npm run db:start` menyiapkan Postgres di `~/.local/share/krl-pg` pada porta
55432 — terpisah dari service `postgresql@18` sistem, dan bertahan melewati
restart. Jalankan `npm run db:status` untuk memeriksa keadaannya.

`DATABASE_URL` bisa diarahkan ke Postgres lokal maupun ke Supabase. Untuk
Supabase, pakai **connection string transaction pooler (porta 6543)**. Jangan
mengarahkannya ke Supabase lalu menjalankan `npm test` — `schema.sql` diawali
`DROP TABLE` dan pengujian akan menghapus isi basis data produksi.

### Row Level Security

`schema.sql` menyalakan RLS pada kesembilan tabel **tanpa satu pun policy**.
Ini bukan kelalaian — itu memang tujuannya.

Supabase menyajikan setiap tabel di skema `public` lewat PostgREST, dan anon
key proyek bersifat publik. Tanpa RLS, siapa pun yang memegangnya bisa
membaca `users` dan `api_keys` langsung dari internet, melewati seluruh
pemeriksaan API key dan kuota di aplikasi ini.

Dengan RLS menyala tanpa policy, peran `anon` dan `authenticated` tidak
memperoleh baris apa pun, sedangkan aplikasi tetap berjalan normal karena
terhubung sebagai pemilik tabel — dan pemilik tabel melewati RLS. Pada Postgres
lokal tanpa PostgREST, baris-baris itu tidak berpengaruh apa-apa.

## Deploy ke Vercel

1. Dorong repositori ini ke GitHub.
2. Impor sebagai project baru di Vercel.
3. Isi environment variable: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`,
   `APP_URL`.
4. Jalankan `npm run migrate` sekali dengan `DATABASE_URL` mengarah ke Supabase.

`vercel.json` sudah memuat `includeFiles: "src/views/**"`. Baris itu wajib —
tanpanya templat EJS tidak ikut terbawa ke dalam bundel fungsi dan dashboard
menjawab 500 di produksi meskipun normal di komputer sendiri.

## Perintah

| Perintah | Kegunaan |
|----------|----------|
| `npm run db:start` | nyalakan Postgres lokal |
| `npm run db:stop` | matikan Postgres lokal |
| `npm run db:status` | periksa keadaan Postgres lokal |
| `npm run dev` | jalankan server di porta 3000 |
| `npm run migrate` | bangun ulang skema dan isi data awal |
| `npm test` | seluruh pengujian (73 kasus) |
| `npm run test:unit` | hanya pengujian unit, tanpa basis data |
| `npm run docs` | render ulang diagram `.mmd` menjadi PNG |

## Struktur

```
api/index.js        titik masuk Vercel
src/config/         env, koneksi Postgres, zona waktu kuota
src/controllers/    handler HTTP per sumber daya
src/models/         akses data (SQL per domain)
src/routes/         pemetaan path → controller
src/views/          templat EJS
src/services/       fungsi murni: graf, Dijkstra, tarif, jadwal
src/middleware/     JWT, API key, kuota, pencatat, penangan galat
db/schema.sql       9 tabel
db/seed.sql         287 baris data awal
docs/               laporan dan diagram
```

Strukturnya MVC: `models/` lapisan data, `views/` templat EJS, `controllers/`
penanganan permintaan, dan `routes/` hanya memetakan path ke controller.

Berkas di `src/services/` tidak menyentuh basis data sama sekali — menerima data
biasa, mengembalikan hasil. Karena itu bagian paling rumit justru paling mudah
diuji.

## Dokumentasi

- Laporan lengkap beserta ERD, use case diagram, dan activity diagram:
  [`docs/laporan.md`](docs/laporan.md)
- Dokumentasi API untuk pemakai: halaman `/docs` pada aplikasi yang berjalan
