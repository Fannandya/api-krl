-- ============================================================================
-- KRL Data API — skema basis data
-- Dijalankan dengan: npm run migrate
-- Skrip ini idempoten: DROP dulu supaya bisa dijalankan berulang selama pengembangan.
-- ============================================================================

DROP TABLE IF EXISTS request_logs CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS service_patterns CASCADE;
DROP TABLE IF EXISTS line_stations CASCADE;
DROP TABLE IF EXISTS lines CASCADE;
DROP TABLE IF EXISTS stations CASCADE;
DROP TABLE IF EXISTS fare_rules CASCADE;

-- ---------------------------------------------------------------------------
-- SISI SaaS: akun, paket langganan, API key, dan catatan pemakaian
-- ---------------------------------------------------------------------------

-- Paket langganan. Menentukan berapa banyak request yang boleh dikirim per hari.
CREATE TABLE plans (
  id                    SERIAL PRIMARY KEY,
  code                  TEXT NOT NULL UNIQUE,
  name                  TEXT NOT NULL,
  daily_quota           INTEGER NOT NULL CHECK (daily_quota > 0),
  rate_limit_per_minute INTEGER NOT NULL CHECK (rate_limit_per_minute > 0),
  price_idr             INTEGER NOT NULL DEFAULT 0 CHECK (price_idr >= 0),
  description           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Developer yang mendaftar. Login memakai JWT.
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- API key. Nilai aslinya tidak pernah disimpan — hanya hash SHA-256-nya,
-- ditambah 12 karakter awal supaya pengguna masih bisa mengenalinya.
CREATE TABLE api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id      INTEGER NOT NULL REFERENCES plans(id),
  name         TEXT NOT NULL,
  key_prefix   TEXT NOT NULL,
  key_hash     TEXT NOT NULL UNIQUE,
  last_used_at TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Satu baris per request yang masuk ke /v1/*. Dipakai untuk menghitung kuota
-- harian sekaligus menampilkan statistik pemakaian di dashboard.
CREATE TABLE request_logs (
  id          BIGSERIAL PRIMARY KEY,
  api_key_id  UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  method      TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  latency_ms  INTEGER NOT NULL,
  ip          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- SISI DOMAIN: jaringan KRL Commuter Line Jabodetabek
-- ---------------------------------------------------------------------------

-- Stasiun. Satu stasiun bisa dilalui beberapa lin (mis. Manggarai, Tanah Abang).
CREATE TABLE stations (
  id                  SERIAL PRIMARY KEY,
  code                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  city                TEXT NOT NULL,
  latitude            NUMERIC(9,6) NOT NULL,
  longitude           NUMERIC(9,6) NOT NULL,
  is_interchange      BOOLEAN NOT NULL DEFAULT FALSE,
  interchange_minutes INTEGER NOT NULL DEFAULT 5 CHECK (interchange_minutes >= 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lin (jalur layanan) Commuter Line.
CREATE TABLE lines (
  id          SERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  color_hex   TEXT NOT NULL,
  operator    TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabel penghubung many-to-many antara lin dan stasiun, sekaligus menyimpan
-- urutan perhentian, jarak kumulatif dari stasiun awal, dan waktu tempuh
-- dari perhentian sebelumnya. Tiga kolom inilah bahan baku mesin rute.
CREATE TABLE line_stations (
  id                       SERIAL PRIMARY KEY,
  line_id                  INTEGER NOT NULL REFERENCES lines(id) ON DELETE CASCADE,
  station_id               INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  stop_order               INTEGER NOT NULL CHECK (stop_order > 0),
  distance_km_from_origin  NUMERIC(6,2) NOT NULL CHECK (distance_km_from_origin >= 0),
  travel_minutes_from_prev INTEGER NOT NULL DEFAULT 0 CHECK (travel_minutes_from_prev >= 0),
  UNIQUE (line_id, stop_order),
  UNIQUE (line_id, station_id)
);

-- Pola operasi: alih-alih menyimpan puluhan ribu baris jam keberangkatan,
-- kami menyimpan rentang jam beserta headway-nya lalu membangkitkan jam
-- keberangkatan saat request datang.
CREATE TABLE service_patterns (
  id              SERIAL PRIMARY KEY,
  line_id         INTEGER NOT NULL REFERENCES lines(id) ON DELETE CASCADE,
  direction       TEXT NOT NULL CHECK (direction IN ('up', 'down')),
  day_type        TEXT NOT NULL CHECK (day_type IN ('weekday', 'weekend')),
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  headway_minutes INTEGER NOT NULL CHECK (headway_minutes > 0),
  CHECK (end_time > start_time)
);

-- Aturan tarif progresif. Disimpan sebagai data, bukan angka di dalam kode,
-- sehingga perubahan tarif cukup dilakukan lewat INSERT baris baru.
CREATE TABLE fare_rules (
  id                     SERIAL PRIMARY KEY,
  name                   TEXT NOT NULL,
  -- NULL berarti aturan berlaku untuk seluruh jaringan Commuter Line.
  -- Diisi bila sebuah lin punya tarif sendiri (mis. KA Bandara yang flat).
  line_id                INTEGER REFERENCES lines(id) ON DELETE CASCADE,
  base_fare_idr          INTEGER NOT NULL CHECK (base_fare_idr >= 0),
  base_distance_km       NUMERIC(6,2) NOT NULL CHECK (base_distance_km > 0),
  increment_fare_idr     INTEGER NOT NULL CHECK (increment_fare_idr >= 0),
  increment_distance_km  NUMERIC(6,2) NOT NULL CHECK (increment_distance_km > 0),
  effective_from         DATE NOT NULL,
  effective_to           DATE,
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);

-- ---------------------------------------------------------------------------
-- INDEKS
-- ---------------------------------------------------------------------------

-- Dipakai pada setiap request ber-API-key untuk menghitung kuota hari berjalan.
CREATE INDEX idx_request_logs_key_time ON request_logs (api_key_id, created_at DESC);
CREATE INDEX idx_api_keys_user         ON api_keys (user_id);
CREATE INDEX idx_line_stations_line    ON line_stations (line_id, stop_order);
CREATE INDEX idx_line_stations_station ON line_stations (station_id);
CREATE INDEX idx_service_patterns_line ON service_patterns (line_id, day_type, direction);
CREATE INDEX idx_stations_name         ON stations (lower(name));
CREATE INDEX idx_fare_rules_line        ON fare_rules (line_id, effective_from DESC);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
--
-- Supabase menyajikan setiap tabel di skema public lewat PostgREST, dan anon
-- key-nya bersifat publik. Tanpa RLS, siapa pun yang memegang anon key bisa
-- membaca tabel users dan api_keys langsung dari internet, melewati seluruh
-- pemeriksaan yang dikerjakan aplikasi ini.
--
-- RLS dinyalakan tanpa satu pun policy, sehingga peran anon dan authenticated
-- tidak memperoleh akses apa pun. Aplikasi tetap berjalan normal karena ia
-- terhubung langsung ke Postgres sebagai pemilik tabel, dan pemilik tabel
-- melewati RLS. Dengan begitu satu-satunya pintu menuju data adalah endpoint
-- yang memang disediakan, lengkap dengan pemeriksaan API key dan kuotanya.
--
-- Pada Postgres lokal tanpa PostgREST, baris-baris ini tidak berpengaruh apa-apa.
-- ---------------------------------------------------------------------------

ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans            ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys         ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE lines            ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_stations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE fare_rules       ENABLE ROW LEVEL SECURITY;
