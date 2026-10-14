# Arsitektur MyFin

## 1. Overview
Static SPA tanpa build: `index.html` + `css/` + `js/` langsung diserve GitHub Pages.
Storage: Turso (libSQL SQLite) via HTTPS `/v2/pipeline` dengan `fetch`; kredensial user-owned di `localStorage`. Fallback lokal (`localStorage`) bila belum dikonfigurasi.

## 2. Context
User (browser) → GitHub Pages (file statis) → Turso Cloud (HTTP API). Tidak ada server aplikasi. Setup schema via Turso CLI/Dashboard.

## 3. Modul
- `js/turso.js`: getConfig/isConfigured/save/clear, `pipeline()`, `query()`, `exec()`, `testConnection()`, `initSchema()`.
- `js/app.js`: state {rows, view, selectedDate, filterType, search}; storage switch; report (harian/mingguan/bulanan); render summary/table/detail; bind form & settings.
- `sql/schema.sql`: single table `transactions` + 3 index.
- `.github/workflows/deploy.yml`: upload artifact → deploy-pages.

## 4. Data flow
Submit form → validasi client → `addTx()` → Turso `INSERT` (parameterized args) atau localStorage → `loadAll()` (`SELECT ... ORDER BY trx_date DESC LIMIT 2000`) → render. View/tanggal hanya filter client-side (tanpa query ulang).

## 5. AuthZ/Audit/Observability
Tanpa login (keputusan: single-user pribadi, ADR-001). Tidak ada RLS (SQLite single-tenant). Audit minimal: `created_at`. Error: `alert()` + console. Tanpa telemetri.

## 6. Security design
- Token tidak di-hardcode; hanya `localStorage`. `.nojekyll` + Pages tanpa proses build = tidak ada secret di CI.
- XSS: `escapeHtml()` untuk category/note. SQLi: selalu `args`, tidak ada string interpolation ke SQL.
- Risiko sisa: siapa pun pegang perangkat bisa baca token → terdokumentasi di README/PRD; mitigasi: tombol Hapus Konfigurasi + rotasi token.

## 7. Perf/Scale/Deploy
Bundle < 50KB, 0 dependensi, 1 query load. Skala pribadi. Deploy: push `main` → Actions → Pages. Rollback: revert commit / redeploy. Env per-browser (bukan per-deploy).

## 8. ADR
- ADR-001: murni HTML+JS+CSS (bukan Next.js default stack) — alasan: permintaan eksplisit user + hosting Pages gratis + tanpa build.
- ADR-002: kredensial di localStorage user (bukan Worker proxy) — alasan: tanpa login, nol biaya, nol server; trade-off: hanya layak single-user. Jalur evolusi: tambah Cloudflare Worker bila multi-user.
- ADR-003: SQLite INTEGER PK (bukan UUID Postgres) — alasan: Turso = libSQL/SQLite; auto-increment cukup untuk single-writer.
- ADR-004: tanpa edit-transaksi di MVP — alasan: cakupan; workaround hapus+input ulang.

## 9. Risiko & rekomendasi
Lihat PRD §27. Rekomendasi: jangan fork untuk multi-user tanpa proxy+auth; tambah export CSV + chart sebagai iterasi berikut.
