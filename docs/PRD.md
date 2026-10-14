# PRD MyFin (ringkas, implementation-ready)

## 0. Kontrol Dokumen
Versi 0.1 — 2026-10-14 — Initial draft (Tech Lead + AI Product Owner).

## 1. Executive Summary
MyFin: webapp statis catatan keuangan pribadi (pemasukan/pengeluaran), murni HTML+JS+CSS, storage Turso (libSQL), hosting GitHub Pages, tanpa login.

## 2. Business Objectives
- BO-001: User bisa mencatat setiap pemasukan & pengeluaran < 30 detik.
- BO-002: User bisa melihat posisi keuangan per hari/minggu/bulan + rincian per tanggal.
- BO-003: Zero-cost hosting (Pages) + zero-maintenance DB (Turso), tanpa build step.

## 3. Scope
In: CRUD transaksi, ringkasan harian/mingguan/bulanan, klik tanggal → rincian, settings Turso (localStorage), mode lokal fallback, deploy Pages via Actions.
Out: login/multi-user, kategori management lanjutan, export PDF/Excel, grafik, reminder, API server.
Future: auth + Worker proxy, export CSV, chart, budget limit.

## 4-5. Stakeholder & Role
Satu peran: Pengguna (pemilik data). Bisa create/read/delete. Tidak ada approve. Data scope: seluruh tabel miliknya.

## 6. Asumsi
- ASM-001 (Confirmed): single-user pribadi → tanpa login OK.
- ASM-002 (Confirmed): user bersedia paste URL+token Turso di Settings per perangkat.
- ASM-003 (Inferred): volume < 2000 transaksi/tahun → LIMIT 2000 cukup.

## 7. User Stories
- US-001: Sebagai pengguna saya ingin tambah pemasukan agar tercatat. → FR-001
- US-002: ... tambah pengeluaran agar terkontrol. → FR-001
- US-003: ... lihat net harian/mingguan/bulanan agar tahu kondisi. → FR-002
- US-004: ... klik tanggal untuk rincian agar audit mudah. → FR-003
- US-005: ... simpan kredensial Turso di browser agar tidak hardcode. → FR-004

## 8. Functional Requirements
- FR-001 [Core] Input transaksi. Traces to BO-001. Inputs: type{masuk,keluar}, amount>0 integer, trx_date YYYY-MM-DD, category, note. Validasi client+CHECK DB. AC-001.
- FR-002 [Core] Laporan periode. Traces to BO-002. Harian=tanggal dipilih; mingguan=Senin–Minggu berisi tanggal; bulanan=1–akhir bulan. Output: net, total masuk/keluar, tabel. AC-002.
- FR-003 [Core] Rincian tanggal. Traces to BO-002. Klik baris → set selectedDate, tampilkan daftar + subtotal. AC-003.
- FR-004 [Supporting] Koneksi Turso. Traces to BO-003. Simpan URL+token di localStorage, test `SELECT 1`, init schema via `sql/schema.sql`. AC-004.
- FR-005 [Supporting] Mode lokal fallback. Bila Turso tidak dikonfigurasi, CRUD ke localStorage `myfin_local_v1`. AC-005.
- FR-006 [Peripheral] Filter/search. Filter tipe + substring kategori/catatan (client-side). AC-006.

## 9. NFR
- NFR-001: load awal < 2 dtk di koneksi 4G (tanpa build, < 50KB).
- NFR-002: responsif 360px–desktop, tanpa framework.
- NFR-003: token tidak ada di repo/bundle; hanya localStorage.

## 10-12. Data
Entitas tunggal `transactions(id INTEGER PK, type, amount, trx_date TEXT, category, note, created_at, updated_at)`.
Index: trx_date, (trx_date,type). Relasi: tidak ada (single table). Lihat `sql/schema.sql`.

## 13. Business Rules
- amount > 0; type hanya masuk/keluar; trx_date wajib valid.
- Delete butuh konfirmasi; tidak ada edit (hapus lalu input ulang — MVP).
- Minggu = Senin–Minggu.

## 14. Workflow
Buka app → (atur Turso sekali) → tambah transaksi → pilih view harian/mingguan/bulanan + tanggal → lihat ringkasan & tabel → klik baris → rincian. Alt: mode lokal bila tanpa Turso. Fail: Turso error → alert + tetap tampil data lama.

## 15-16. API/Integrasi
Satu-satunya integrasi: Turso libSQL HTTP `POST {url}/v2/pipeline` header `Authorization: Bearer <token>`, body `{requests:[{type:"execute",stmt:{sql,args}}]}`. Tidak ada backend sendiri.

## 17. UI
Satu halaman: header+storage badge; Ringkasan (3 stat + tabs + date picker + search); Form; Tabel; Rincian; Settings. States: loading implisit, empty ("Belum ada transaksi"), error via alert.

## 18-20. Reporting/Notif/Audit
Laporan = ringkasan periode (tanpa export di MVP). Tanpa notifikasi. Audit = `created_at` per baris; tanpa tabel audit terpisah (single-user).

## 21. Security
Tanpa auth (risiko diterima untuk pribadi). Token user-owned di localStorage. Mitigasi: jangan share perangkat/token; rotasi via `turso db tokens invalidate`. XSS: semua render user-input via `escapeHtml`. SQLi: parameterized via `args`.

## 22-25. Perf/Scale/Retention
< 2000 baris/query; tanpa paginasi server di MVP. Single-org, tanpa multi-tenant. Retensi: tidak dihapus otomatis.

## 26. Edge Cases
- Token salah → HTTP 401 → alert, fallback data lama.
- Tanggal kosong/nominal 0 → ditolak form.
- `file://` → tombol Init schema gagal (perlu http); solusi CLI.
- Hapus di mode Turso vs lokal dibedakan by `isConfigured()`.

## 27. Risks
- RISK-001: token terekspos bila perangkat dishare (likelihood M, impact M; mitigasi: peringatan README + hapus konfigurasi).
- RISK-002: salah paham minggu (Minggu vs Senin awal) → tetapkan Senin–Minggu.
- RISK-003: limit GitHub Pages 10GB/bulan — tidak relevan untuk app sekecil ini.

## 28-28a. Acceptance & Traceability
- AC-001: input 50.000 keluar hari ini tersimpan & muncul di tabel. (FR-001)
- AC-002: ganti view harian→mingguan→bulanan mengubah angka net & range label benar. (FR-002)
- AC-003: klik baris 2026-10-01 menampilkan rincian tanggal tsb. (FR-003)
- AC-004: Simpan URL+token salah → error; benar → "Koneksi OK". (FR-004)
- AC-005: hapus konfigurasi → tambah data tetap jalan (mode lokal). (FR-005)
- AC-006: search "makan" memfilter tabel. (FR-006)
| BO-001 | FR-001 | AC-001 | — |
| BO-002 | FR-002, FR-003 | AC-002, AC-003 | RISK-002 |
| BO-003 | FR-004, FR-005, FR-006 | AC-004 s/d AC-006 | RISK-001, RISK-003 |

## 29-33. Rilis/Estimasi/Glosarium
MVP = dokumen ini (1 sesi). Berikutnya: edit transaksi, export CSV, chart. Estimasi: 1 orang × 1–2 hari termasuk setup Turso+Pages. Glosarium: net = masuk−keluar; periode = rentang tanggal view aktif.
