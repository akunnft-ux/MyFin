# MyFin — Catatan Keuangan (HTML+JS+CSS murni · Turso · GitHub Pages)

Single-user, tanpa login. Cocok untuk pemakaian pribadi.

## 1. Struktur
```
MyFin/
├── index.html
├── css/styles.css
├── js/turso.js   (client libSQL HTTP /v2/pipeline)
├── js/app.js     (CRUD + laporan harian/mingguan/bulanan + klik tanggal)
├── sql/schema.sql
├── docs/PRD.md
├── docs/architecture.md
└── .github/workflows/deploy.yml
```

## 2. Setup Turso (5 menit)
1. Install CLI: `curl -sSf https://get.tur.so/install.sh | bash`
2. `turso auth login` (atau signup via dashboard.turso.com)
3. `turso db create myfin`
4. `turso db show myfin --url` → dapat `https://xxx.turso.io`
5. `turso db tokens create myfin` → dapat token
6. Terapkan schema: `turso db shell myfin < sql/schema.sql`
   atau paste `sql/schema.sql` di Dashboard > SQL Editor.
7. Jalankan lokal: `python3 -m http.server 8000` di folder `MyFin/`, buka `http://localhost:8000`
   (buka via http, jangan `file://` agar `fetch('sql/schema.sql')` untuk tombol Init jalan).
8. Di webapp > Pengaturan Turso: paste URL + token → Simpan & Tes Koneksi.
   Token hanya tersimpan di localStorage browser, tidak ikut ke git/Pages.

## 3. Deploy GitHub Pages
1. `git init` di folder ini (atau copy ke repo baru), commit, push ke GitHub branch `main`.
2. Repo > Settings > Pages > Source: **GitHub Actions**.
3. Push → workflow `Deploy to GitHub Pages` jalan otomatis.
4. Buka URL Pages, isi URL+token Turso di Pengaturan (per perangkat/browser).

> Alternatif manual tanpa Actions: Settings > Pages > Deploy from branch > `main` / root.

## 4. Fitur
- Tambah pemasukan/pengeluaran (nominal, tanggal, kategori, catatan).
- Ringkasan: net hari ini, net periode (harian/mingguan Senin–Minggu/bulanan), total saldo.
- Tabel periode + filter tipe + search; klik baris → rincian tanggal.
- Mode lokal otomatis bila Turso belum dikonfigurasi (data di localStorage).

## 5. Keamanan (penting)
- Tanpa login + Pages statis = token Turso ada di browser user. Ini OK untuk **pemakaian pribadi single-user**,
  JANGAN dipakai untuk multi-user / data sensitif bersama.
- Jangan hardcode token di `js/*.js` atau HTML. Jangan commit token.
- Untuk multi-user kelak: tambah proxy (Cloudflare Worker) + auth, token Turso simpan server-side.

## 6. Batasan
- `fetch('sql/schema.sql')` butuh http(s), tidak jalan di `file://`. Untuk init schema bisa juga via CLI (langkah 6).
- Limit default query 2000 baris terakhir — cukup untuk keuangan pribadi.
