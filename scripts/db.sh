#!/usr/bin/env bash
#
# Mengelola instance PostgreSQL untuk pengembangan.
#
# Instance ini sengaja terpisah dari service postgresql@18 milik sistem: ia punya
# data directory sendiri, berjalan di porta 55432 (bukan 5432), dan hanya hidup
# selama dinyalakan. Dengan begitu proyek ini tidak menitipkan apa pun pada
# konfigurasi Postgres global di komputer siapa pun.
#
#   npm run db:start    nyalakan (initdb otomatis bila belum ada)
#   npm run db:stop     matikan
#   npm run db:status   cek hidup atau tidak, sekalian hitung isi tabelnya
#   npm run db:reset    hapus lalu bangun ulang dari nol
#
set -euo pipefail

PGBIN="${KRL_PGBIN:-/opt/homebrew/opt/postgresql@18/bin}"

# Data ditaruh di ~/.local/share, bukan di /tmp. macOS mengosongkan /tmp setiap
# restart, dan basis data pengembangan yang hilang tiap reboot lebih merepotkan
# daripada satu folder tambahan di direktori home.
KRL_PGHOME="${KRL_PGHOME:-$HOME/.local/share/krl-pg}"
PGDATA="$KRL_PGHOME/pgdata"
PGLOG="$KRL_PGHOME/postgres.log"
PGPORT="${KRL_PGPORT:-55432}"

# Socket Unix-domain punya batas panjang path 103 byte. Menaruhnya di dalam
# KRL_PGHOME aman karena path-nya pendek, dan membuat instance ini sama sekali
# tidak bergantung pada /tmp.
PGSOCKET="$KRL_PGHOME"

DATABASES=(krl_dev krl_test)

die() { echo "error: $*" >&2; exit 1; }

require_postgres() {
  if [ ! -x "$PGBIN/pg_ctl" ]; then
    die "PostgreSQL tidak ditemukan di $PGBIN
       Pasang dengan: brew install postgresql@18
       Atau tunjuk lokasi lain lewat: KRL_PGBIN=/path/ke/bin npm run db:start"
  fi
}

is_running() {
  "$PGBIN/pg_isready" -h 127.0.0.1 -p "$PGPORT" >/dev/null 2>&1
}

cmd_start() {
  require_postgres
  mkdir -p "$KRL_PGHOME"

  if is_running; then
    echo "Sudah berjalan di porta $PGPORT."
    return 0
  fi

  if [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "Membuat cluster baru di $PGDATA ..."
    "$PGBIN/initdb" -D "$PGDATA" -U postgres --auth=trust >/dev/null
  fi

  echo "Menyalakan PostgreSQL di porta $PGPORT ..."
  "$PGBIN/pg_ctl" -D "$PGDATA" -o "-p $PGPORT -k $PGSOCKET" -l "$PGLOG" start >/dev/null

  # pg_ctl kembali sebelum server benar-benar menerima koneksi.
  for _ in $(seq 1 20); do
    is_running && break
    sleep 0.3
  done
  is_running || die "server tidak merespons. Periksa log: $PGLOG"

  for db in "${DATABASES[@]}"; do
    if ! "$PGBIN/psql" -h 127.0.0.1 -p "$PGPORT" -U postgres -lqtA \
         | cut -d'|' -f1 | grep -qx "$db"; then
      "$PGBIN/createdb" -h 127.0.0.1 -p "$PGPORT" -U postgres "$db"
      echo "  basis data '$db' dibuat"
    fi
  done

  echo "Siap. DATABASE_URL=postgresql://postgres@127.0.0.1:$PGPORT/krl_dev"
  echo "Isi datanya dengan: npm run migrate"
}

cmd_stop() {
  require_postgres
  if ! is_running; then
    echo "Tidak sedang berjalan."
    return 0
  fi
  "$PGBIN/pg_ctl" -D "$PGDATA" stop -m fast >/dev/null
  echo "Dimatikan."
}

cmd_status() {
  require_postgres
  echo "data directory : $PGDATA"
  echo "porta          : $PGPORT"

  if ! is_running; then
    echo "status         : mati — nyalakan dengan 'npm run db:start'"
    return 0
  fi
  echo "status         : hidup"

  for db in "${DATABASES[@]}"; do
    local jumlah
    if jumlah=$("$PGBIN/psql" -h 127.0.0.1 -p "$PGPORT" -U postgres -d "$db" -tAc "
      SELECT coalesce(sum(n), 0) FROM (
        SELECT count(*) AS n FROM stations
        UNION ALL SELECT count(*) FROM lines
        UNION ALL SELECT count(*) FROM line_stations
        UNION ALL SELECT count(*) FROM service_patterns
        UNION ALL SELECT count(*) FROM fare_rules
        UNION ALL SELECT count(*) FROM plans
      ) x;" 2>/dev/null); then
      printf "%-15s: %s baris data awal\n" "$db" "$jumlah"
    else
      printf "%-15s: tabel belum dibuat — jalankan 'npm run migrate'\n" "$db"
    fi
  done
}

cmd_reset() {
  require_postgres
  echo "Menghapus cluster di $PGDATA dan membangunnya ulang."
  is_running && "$PGBIN/pg_ctl" -D "$PGDATA" stop -m fast >/dev/null || true
  rm -rf "$PGDATA"
  cmd_start
}

case "${1:-}" in
  start)  cmd_start ;;
  stop)   cmd_stop ;;
  status) cmd_status ;;
  reset)  cmd_reset ;;
  *)      die "pemakaian: bash scripts/db.sh {start|stop|status|reset}" ;;
esac
