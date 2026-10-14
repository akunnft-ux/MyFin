-- MyFin — schema Turso (libSQL / SQLite)
-- Cara pakai: turso db shell <db-name> < sql/schema.sql
-- atau via Dashboard > SQL Editor, paste isi file ini.

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('masuk', 'keluar')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  trx_date TEXT NOT NULL,              -- format YYYY-MM-DD
  category TEXT NOT NULL DEFAULT 'Lainnya',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trx_date ON transactions(trx_date);
CREATE INDEX IF NOT EXISTS idx_trx_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_trx_date_type ON transactions(trx_date, type);

-- Contoh seed (opsional, hapus jika tidak perlu):
-- INSERT INTO transactions (type, amount, trx_date, category, note) VALUES
--   ('masuk', 5000000, date('now'), 'Gaji', 'Gaji bulanan'),
--   ('keluar', 50000, date('now'), 'Makan', 'Makan siang'),
--   ('keluar', 150000, date('now'), 'Transport', 'Bensin');
