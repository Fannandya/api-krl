-- ============================================================================
-- KRL Data API — data awal
--
-- CATATAN SUMBER DATA
-- Daftar stasiun, jarak kumulatif, dan pola operasi di bawah ini dikurasi dari
-- rujukan publik dan merupakan DATA REFERENSI UNTUK KEPERLUAN AKADEMIK.
-- Angkanya mendekati kondisi nyata tetapi bukan data operasional resmi
-- KAI Commuter. Jangan dipakai untuk perencanaan perjalanan sungguhan.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Paket langganan
-- ---------------------------------------------------------------------------
INSERT INTO plans (code, name, daily_quota, rate_limit_per_minute, price_idr, description) VALUES
  ('free', 'Free',  1000,  60,      0, 'Untuk eksplorasi dan proyek belajar. 1.000 permintaan per hari.'),
  ('pro',  'Pro',  50000, 600, 149000, 'Untuk aplikasi produksi. 50.000 permintaan per hari.');

-- ---------------------------------------------------------------------------
-- Stasiun (74 stasiun)
-- ---------------------------------------------------------------------------
INSERT INTO stations (code, name, city, latitude, longitude, is_interchange, interchange_minutes) VALUES
  -- Lintas Bogor
  ('BOO',  'Bogor',                   'Kota Bogor',            -6.595000, 106.790000, FALSE, 5),
  ('CLT',  'Cilebut',                 'Kabupaten Bogor',       -6.530000, 106.800000, FALSE, 5),
  ('BJD',  'Bojonggede',              'Kabupaten Bogor',       -6.495000, 106.795000, FALSE, 5),
  ('CTA',  'Citayam',                 'Kota Depok',            -6.452000, 106.801000, FALSE, 5),
  ('DPK',  'Depok',                   'Kota Depok',            -6.402000, 106.818000, FALSE, 5),
  ('DPB',  'Depok Baru',              'Kota Depok',            -6.390000, 106.820000, FALSE, 5),
  ('POC',  'Pondok Cina',             'Kota Depok',            -6.369000, 106.832000, FALSE, 5),
  ('UI',   'Universitas Indonesia',   'Kota Depok',            -6.361000, 106.832000, FALSE, 5),
  ('UP',   'Universitas Pancasila',   'Kota Depok',            -6.338000, 106.834000, FALSE, 5),
  ('LNA',  'Lenteng Agung',           'Jakarta Selatan',       -6.332000, 106.835000, FALSE, 5),
  ('TNT',  'Tanjung Barat',           'Jakarta Selatan',       -6.311000, 106.838000, FALSE, 5),
  ('PSM',  'Pasar Minggu',            'Jakarta Selatan',       -6.284000, 106.844000, FALSE, 5),
  ('PSMB', 'Pasar Minggu Baru',       'Jakarta Selatan',       -6.274000, 106.845000, FALSE, 5),
  ('DRN',  'Duren Kalibata',          'Jakarta Selatan',       -6.257000, 106.850000, FALSE, 5),
  ('CW',   'Cawang',                  'Jakarta Timur',         -6.245000, 106.856000, FALSE, 5),
  ('TEB',  'Tebet',                   'Jakarta Selatan',       -6.226000, 106.858000, FALSE, 5),
  ('MRI',  'Manggarai',               'Jakarta Selatan',       -6.210000, 106.850000, TRUE,  6),
  ('CKI',  'Cikini',                  'Jakarta Pusat',         -6.198000, 106.841000, FALSE, 5),
  ('GDD',  'Gondangdia',              'Jakarta Pusat',         -6.186000, 106.832000, FALSE, 5),
  ('JUA',  'Juanda',                  'Jakarta Pusat',         -6.167000, 106.830000, FALSE, 5),
  ('SW',   'Sawah Besar',             'Jakarta Pusat',         -6.160000, 106.825000, FALSE, 5),
  ('MGB',  'Mangga Besar',            'Jakarta Barat',         -6.149000, 106.822000, FALSE, 5),
  ('JAY',  'Jayakarta',               'Jakarta Barat',         -6.142000, 106.818000, FALSE, 5),
  ('JAKK', 'Jakarta Kota',            'Jakarta Barat',         -6.137500, 106.814000, TRUE,  4),
  -- Lintas Cikarang
  ('CKR',  'Cikarang',                'Kabupaten Bekasi',      -6.254000, 107.142000, FALSE, 5),
  ('MTM',  'Metland Telaga Murni',    'Kabupaten Bekasi',      -6.249000, 107.105000, FALSE, 5),
  ('CBT',  'Cibitung',                'Kabupaten Bekasi',      -6.242000, 107.085000, FALSE, 5),
  ('TB',   'Tambun',                  'Kabupaten Bekasi',      -6.254000, 107.050000, FALSE, 5),
  ('BKST', 'Bekasi Timur',            'Kota Bekasi',           -6.244000, 107.010000, FALSE, 5),
  ('BKS',  'Bekasi',                  'Kota Bekasi',           -6.236000, 106.999000, FALSE, 5),
  ('KRI',  'Kranji',                  'Kota Bekasi',           -6.228000, 106.970000, FALSE, 5),
  ('CUK',  'Cakung',                  'Jakarta Timur',         -6.220000, 106.942000, FALSE, 5),
  ('KLDB', 'Klender Baru',            'Jakarta Timur',         -6.221000, 106.928000, FALSE, 5),
  ('BUA',  'Buaran',                  'Jakarta Timur',         -6.223000, 106.915000, FALSE, 5),
  ('KLD',  'Klender',                 'Jakarta Timur',         -6.216000, 106.898000, FALSE, 5),
  ('JNG',  'Jatinegara',              'Jakarta Timur',         -6.215000, 106.870000, FALSE, 5),
  ('SUD',  'Sudirman',                'Jakarta Pusat',         -6.202000, 106.823000, FALSE, 5),
  ('KAT',  'Karet',                   'Jakarta Pusat',         -6.201000, 106.816000, FALSE, 5),
  ('THB',  'Tanah Abang',             'Jakarta Pusat',         -6.186000, 106.810000, TRUE,  5),
  ('DU',   'Duri',                    'Jakarta Barat',         -6.152000, 106.796000, TRUE,  4),
  ('AK',   'Angke',                   'Jakarta Barat',         -6.142000, 106.796000, FALSE, 5),
  ('KPB',  'Kampung Bandan',          'Jakarta Utara',         -6.133000, 106.812000, TRUE,  5),
  -- Lintas Rangkasbitung
  ('RK',   'Rangkasbitung',           'Kabupaten Lebak',       -6.356000, 106.250000, FALSE, 5),
  ('CTR',  'Citeras',                 'Kabupaten Lebak',       -6.339000, 106.323000, FALSE, 5),
  ('MJ',   'Maja',                    'Kabupaten Lebak',       -6.332000, 106.376000, FALSE, 5),
  ('CIKY', 'Cikoya',                  'Kabupaten Tangerang',   -6.330000, 106.403000, FALSE, 5),
  ('TGS',  'Tigaraksa',               'Kabupaten Tangerang',   -6.326000, 106.434000, FALSE, 5),
  ('TEJ',  'Tenjo',                   'Kabupaten Bogor',       -6.335000, 106.479000, FALSE, 5),
  ('DAU',  'Daru',                    'Kabupaten Tangerang',   -6.340000, 106.514000, FALSE, 5),
  ('CJT',  'Cilejit',                 'Kabupaten Tangerang',   -6.342000, 106.544000, FALSE, 5),
  ('PRP',  'Parung Panjang',          'Kabupaten Bogor',       -6.345000, 106.585000, FALSE, 5),
  ('CAY',  'Cicayur',                 'Kabupaten Tangerang',   -6.330000, 106.623000, FALSE, 5),
  ('CSK',  'Cisauk',                  'Kabupaten Tangerang',   -6.323000, 106.648000, FALSE, 5),
  ('SRP',  'Serpong',                 'Kota Tangerang Selatan',-6.316000, 106.672000, FALSE, 5),
  ('RU',   'Rawa Buntu',              'Kota Tangerang Selatan',-6.315000, 106.696000, FALSE, 5),
  ('SDM',  'Sudimara',                'Kota Tangerang Selatan',-6.276000, 106.715000, FALSE, 5),
  ('JMG',  'Jurangmangu',             'Kota Tangerang Selatan',-6.266000, 106.730000, FALSE, 5),
  ('PDJ',  'Pondok Ranji',            'Kota Tangerang Selatan',-6.275000, 106.745000, FALSE, 5),
  ('KBY',  'Kebayoran',               'Jakarta Selatan',       -6.240000, 106.783000, FALSE, 5),
  ('PLM',  'Palmerah',                'Jakarta Barat',         -6.207000, 106.797000, FALSE, 5),
  -- Lintas Tangerang
  ('TNG',  'Tangerang',               'Kota Tangerang',        -6.177000, 106.630000, FALSE, 5),
  ('TNTG', 'Tanah Tinggi',            'Kota Tangerang',        -6.175000, 106.642000, FALSE, 5),
  ('BPR',  'Batuceper',               'Kota Tangerang',        -6.171000, 106.659000, TRUE,  4),
  ('POI',  'Poris',                   'Kota Tangerang',        -6.169000, 106.674000, FALSE, 5),
  ('KDS',  'Kalideres',               'Jakarta Barat',         -6.158000, 106.702000, FALSE, 5),
  ('RWB',  'Rawa Buaya',              'Jakarta Barat',         -6.158000, 106.722000, FALSE, 5),
  ('BOI',  'Bojong Indah',            'Jakarta Barat',         -6.158000, 106.736000, FALSE, 5),
  ('TKO',  'Taman Kota',              'Jakarta Barat',         -6.159000, 106.750000, FALSE, 5),
  ('PSG',  'Pesing',                  'Jakarta Barat',         -6.158000, 106.765000, FALSE, 5),
  ('GRG',  'Grogol',                  'Jakarta Barat',         -6.165000, 106.789000, FALSE, 5),
  -- Lintas Tanjung Priok
  ('AC',   'Ancol',                   'Jakarta Utara',         -6.127000, 106.833000, FALSE, 5),
  ('TPK',  'Tanjung Priok',           'Jakarta Utara',         -6.105000, 106.880000, FALSE, 5),
  -- KA Bandara
  ('BNC',  'BNI City',                'Jakarta Pusat',         -6.203000, 106.818000, FALSE, 5),
  ('BST',  'Bandara Soekarno-Hatta',  'Kota Tangerang',        -6.125000, 106.658000, FALSE, 5);

-- ---------------------------------------------------------------------------
-- Lin (jalur layanan)
-- ---------------------------------------------------------------------------
INSERT INTO lines (code, name, color_hex, operator, description) VALUES
  ('BOG', 'Lin Bogor',           '#D32F2F', 'KAI Commuter', 'Bogor - Manggarai - Jakarta Kota'),
  ('CKR', 'Lin Cikarang',        '#1976D2', 'KAI Commuter', 'Cikarang - Jatinegara - Manggarai - Kampung Bandan'),
  ('RGD', 'Lin Rangkasbitung',   '#388E3C', 'KAI Commuter', 'Rangkasbitung - Serpong - Tanah Abang'),
  ('TNG', 'Lin Tangerang',       '#795548', 'KAI Commuter', 'Tangerang - Duri'),
  ('TJP', 'Lin Tanjung Priok',   '#E91E63', 'KAI Commuter', 'Jakarta Kota - Tanjung Priok'),
  ('BST', 'KA Bandara Soetta',   '#0097A7', 'Railink',      'Manggarai - BNI City - Duri - Batuceper - Bandara Soekarno-Hatta');

-- ---------------------------------------------------------------------------
-- Perhentian per lin (tabel penghubung many-to-many).
-- Kolom km adalah jarak kumulatif dari stasiun pertama pada lin tersebut.
-- Kolom travel_minutes_from_prev tidak diisi di sini — dihitung otomatis di
-- bagian bawah berkas ini dari selisih jarak antar perhentian.
-- ---------------------------------------------------------------------------
INSERT INTO line_stations (line_id, station_id, stop_order, distance_km_from_origin)
SELECT l.id, s.id, v.stop_order, v.km
FROM (VALUES
  -- Lin Bogor: Bogor -> Jakarta Kota
  ('BOG','BOO',   1,  0.00), ('BOG','CLT',   2,  5.50), ('BOG','BJD',   3,  9.70),
  ('BOG','CTA',   4, 14.40), ('BOG','DPK',   5, 19.40), ('BOG','DPB',   6, 21.00),
  ('BOG','POC',   7, 23.70), ('BOG','UI',    8, 25.00), ('BOG','UP',    9, 26.50),
  ('BOG','LNA',  10, 28.00), ('BOG','TNT',  11, 30.20), ('BOG','PSM',  12, 33.20),
  ('BOG','PSMB', 13, 34.60), ('BOG','DRN',  14, 36.00), ('BOG','CW',   15, 37.50),
  ('BOG','TEB',  16, 39.20), ('BOG','MRI',  17, 41.80), ('BOG','CKI',  18, 43.50),
  ('BOG','GDD',  19, 45.20), ('BOG','JUA',  20, 46.80), ('BOG','SW',   21, 47.90),
  ('BOG','MGB',  22, 49.00), ('BOG','JAY',  23, 50.00), ('BOG','JAKK', 24, 51.20),
  -- Lin Cikarang: Cikarang -> Kampung Bandan (lewat Manggarai)
  ('CKR','CKR',   1,  0.00), ('CKR','MTM',   2,  3.00), ('CKR','CBT',   3,  5.60),
  ('CKR','TB',    4,  9.40), ('CKR','BKST',  5, 14.00), ('CKR','BKS',   6, 16.60),
  ('CKR','KRI',   7, 19.60), ('CKR','CUK',   8, 23.00), ('CKR','KLDB',  9, 25.30),
  ('CKR','BUA',  10, 26.90), ('CKR','KLD',  11, 29.20), ('CKR','JNG',  12, 33.60),
  ('CKR','MRI',  13, 37.40), ('CKR','SUD',  14, 39.60), ('CKR','KAT',  15, 40.80),
  ('CKR','THB',  16, 42.50), ('CKR','DU',   17, 45.00), ('CKR','AK',   18, 46.60),
  ('CKR','KPB',  19, 48.60),
  -- Lin Rangkasbitung: Rangkasbitung -> Tanah Abang
  ('RGD','RK',    1,  0.00), ('RGD','CTR',   2,  8.00), ('RGD','MJ',    3, 13.60),
  ('RGD','CIKY',  4, 16.40), ('RGD','TGS',   5, 19.60), ('RGD','TEJ',   6, 24.50),
  ('RGD','DAU',   7, 28.20), ('RGD','CJT',   8, 31.40), ('RGD','PRP',   9, 36.20),
  ('RGD','CAY',  10, 40.50), ('RGD','CSK',  11, 43.70), ('RGD','SRP',  12, 47.20),
  ('RGD','RU',   13, 50.00), ('RGD','SDM',  14, 54.00), ('RGD','JMG',  15, 56.40),
  ('RGD','PDJ',  16, 58.60), ('RGD','KBY',  17, 64.00), ('RGD','PLM',  18, 67.50),
  ('RGD','THB',  19, 70.40),
  -- Lin Tangerang: Tangerang -> Duri
  ('TNG','TNG',   1,  0.00), ('TNG','TNTG',  2,  1.50), ('TNG','BPR',   3,  3.30),
  ('TNG','POI',   4,  5.00), ('TNG','KDS',   5,  7.50), ('TNG','RWB',   6,  9.50),
  ('TNG','BOI',   7, 11.00), ('TNG','TKO',   8, 12.60), ('TNG','PSG',   9, 14.20),
  ('TNG','GRG',  10, 16.40), ('TNG','DU',   11, 19.30),
  -- Lin Tanjung Priok: Jakarta Kota -> Tanjung Priok
  ('TJP','JAKK',  1,  0.00), ('TJP','KPB',   2,  2.50), ('TJP','AC',    3,  5.00),
  ('TJP','TPK',   4,  8.80),
  -- KA Bandara: Manggarai -> Bandara Soekarno-Hatta
  ('BST','MRI',   1,  0.00), ('BST','BNC',   2,  4.50), ('BST','DU',    3, 10.20),
  ('BST','BPR',   4, 27.00), ('BST','BST',   5, 36.30)
) AS v(line_code, station_code, stop_order, km)
JOIN lines l    ON l.code = v.line_code
JOIN stations s ON s.code = v.station_code;

-- Turunkan waktu tempuh antar perhentian dari selisih jarak.
-- Kecepatan rata-rata: Commuter Line ~37 km/jam (0,62 km/menit) sudah termasuk
-- waktu berhenti; KA Bandara ~66 km/jam (1,10 km/menit) karena melewati
-- sebagian besar stasiun tanpa berhenti.
UPDATE line_stations ls
SET travel_minutes_from_prev = sub.mins
FROM (
  SELECT ls2.id,
         CASE
           WHEN ls2.stop_order = 1 THEN 0
           ELSE GREATEST(2, CEIL(
             (ls2.distance_km_from_origin
              - LAG(ls2.distance_km_from_origin) OVER (PARTITION BY ls2.line_id ORDER BY ls2.stop_order))
             / CASE WHEN l.code = 'BST' THEN 1.10 ELSE 0.62 END))
         END AS mins
  FROM line_stations ls2
  JOIN lines l ON l.id = ls2.line_id
) AS sub
WHERE ls.id = sub.id;

-- ---------------------------------------------------------------------------
-- Pola operasi.
-- Dibangkitkan sebagai perkalian: setiap lin x 2 arah x 10 rentang jam.
-- Faktor per lin menyesuaikan kepadatan layanan (Lin Bogor paling rapat,
-- Lin Tanjung Priok dan KA Bandara paling jarang).
-- ---------------------------------------------------------------------------
INSERT INTO service_patterns (line_id, direction, day_type, start_time, end_time, headway_minutes)
SELECT l.id,
       dir.direction,
       band.day_type,
       band.start_time::time,
       band.end_time::time,
       GREATEST(3, ROUND(band.base_headway * f.factor))::int
FROM (VALUES
  ('BOG', 1.0), ('CKR', 1.4), ('RGD', 1.6), ('TNG', 2.0), ('TJP', 3.0), ('BST', 3.0)
) AS f(line_code, factor)
JOIN lines l ON l.code = f.line_code
CROSS JOIN (VALUES ('up'), ('down')) AS dir(direction)
CROSS JOIN (VALUES
  ('weekday', '04:00', '06:00', 12),
  ('weekday', '06:00', '09:00',  6),
  ('weekday', '09:00', '16:00', 12),
  ('weekday', '16:00', '19:00',  6),
  ('weekday', '19:00', '23:30', 15),
  ('weekend', '04:00', '06:00', 15),
  ('weekend', '06:00', '09:00', 10),
  ('weekend', '09:00', '16:00', 10),
  ('weekend', '16:00', '19:00', 10),
  ('weekend', '19:00', '23:30', 18)
) AS band(day_type, start_time, end_time, base_headway);

-- ---------------------------------------------------------------------------
-- Aturan tarif.
-- Tarif Commuter Line bersifat progresif terhadap jarak. KA Bandara memakai
-- tarif tetap, yang dimodelkan sebagai tarif dasar dengan tambahan nol rupiah
-- dan jarak dasar yang melampaui panjang lin itu sendiri.
-- Baris pertama sudah kedaluwarsa dan disimpan sebagai riwayat.
-- ---------------------------------------------------------------------------
INSERT INTO fare_rules (name, line_id, base_fare_idr, base_distance_km, increment_fare_idr, increment_distance_km, effective_from, effective_to)
SELECT 'Tarif Commuter Line 2015', NULL::int, 2000, 25.00, 1000, 10.00, DATE '2015-04-01', DATE '2016-10-01'
UNION ALL
SELECT 'Tarif Commuter Line',      NULL::int, 3000, 25.00, 1000, 10.00, DATE '2016-10-01', NULL
UNION ALL
SELECT 'Tarif KA Bandara Soekarno-Hatta', l.id, 70000, 100.00, 0, 10.00, DATE '2023-01-01', NULL
FROM lines l WHERE l.code = 'BST';
