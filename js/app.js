/* MyFin app logic — CRUD + laporan harian/mingguan/bulanan + klik tanggal.
 * Storage: Turso bila dikonfigurasi, else localStorage (key myfin_local).
 */
const App = (() => {
  const LS_LOCAL = 'myfin_local_v1';
  const state = { rows: [], view: 'harian', selectedDate: todayStr(), filterType: 'semua', search: '', editingId: null };

  function todayStr(d = new Date()) {
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function mondayOf(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const day = (d.getDay() + 6) % 7; // Senin=0
    d.setDate(d.getDate() - day);
    return todayStr(d);
  }
  function sundayOf(mondayStr) {
    const d = new Date(mondayStr + 'T00:00:00');
    d.setDate(d.getDate() + 6);
    return todayStr(d);
  }
  function monthRange(dateStr) {
    const y = dateStr.slice(0, 4), m = dateStr.slice(5, 7);
    const last = new Date(Number(y), Number(m), 0).getDate();
    return [y + '-' + m + '-01', y + '-' + m + '-' + String(last).padStart(2, '0')];
  }
  function fmtRp(n) {
    return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
  }

  // ---------- storage ----------
  function localLoad() {
    try { return JSON.parse(localStorage.getItem(LS_LOCAL) || '[]'); }
    catch { return []; }
  }
  function localSave(rows) { localStorage.setItem(LS_LOCAL, JSON.stringify(rows)); }

  async function loadAll() {
    if (TursoDB.isConfigured()) {
      state.rows = await TursoDB.query(
        'SELECT id, type, amount, trx_date, category, note, created_at FROM transactions ORDER BY trx_date DESC, id DESC LIMIT 2000'
      );
    } else {
      state.rows = localLoad().sort((a, b) => String(b.trx_date).localeCompare(String(a.trx_date)));
    }
    render();
  }

  async function addTx(tx) {
    if (TursoDB.isConfigured()) {
      await TursoDB.exec(
        "INSERT INTO transactions (type, amount, trx_date, category, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
        [
          { type: 'text', value: tx.type },
          { type: 'integer', value: String(tx.amount) },
          { type: 'text', value: tx.trx_date },
          { type: 'text', value: tx.category },
          { type: 'text', value: tx.note || '' }
        ]
      );
    } else {
      const rows = localLoad();
      rows.push({ id: Date.now(), ...tx, created_at: new Date().toISOString() });
      localSave(rows);
    }
    await loadAll();
  }

  async function updateTx(id, tx) {
    if (TursoDB.isConfigured()) {
      await TursoDB.exec(
        "UPDATE transactions SET type = ?, amount = ?, trx_date = ?, category = ?, note = ?, updated_at = datetime('now') WHERE id = ?",
        [
          { type: 'text', value: tx.type },
          { type: 'integer', value: String(tx.amount) },
          { type: 'text', value: tx.trx_date },
          { type: 'text', value: tx.category },
          { type: 'text', value: tx.note || '' },
          { type: 'integer', value: String(id) }
        ]
      );
    } else {
      const rows = localLoad().map(r => String(r.id) === String(id)
        ? { ...r, ...tx, id: r.id, created_at: r.created_at }
        : r);
      localSave(rows);
    }
    await loadAll();
  }

  function startEdit(id) {
    const r = state.rows.find(x => String(x.id) === String(id));
    if (!r) return alert('Data tidak ditemukan (mungkin terfilter).');
    state.editingId = r.id;
    document.getElementById('f-type').value = r.type;
    document.getElementById('f-amount').value = r.amount;
    document.getElementById('f-date').value = r.trx_date;
    document.getElementById('f-cat').value = r.category || '';
    document.getElementById('f-note').value = r.note || '';
    document.getElementById('form-title').textContent = 'Edit Transaksi';
    document.getElementById('btn-submit').textContent = 'Update';
    document.getElementById('btn-cancel-edit').style.display = '';
    document.getElementById('form-card').scrollIntoView({ behavior: 'smooth' });
  }

  function cancelEdit(resetForm = true) {
    state.editingId = null;
    if (resetForm) {
      document.getElementById('tx-form').reset();
      document.getElementById('f-date').value = todayStr();
    }
    document.getElementById('form-title').textContent = 'Tambah Transaksi';
    document.getElementById('btn-submit').textContent = 'Simpan';
    document.getElementById('btn-cancel-edit').style.display = 'none';
  }

  async function deleteTx(id) {
    if (!confirm('Hapus transaksi ini?')) return;
    if (TursoDB.isConfigured()) {
      await TursoDB.exec('DELETE FROM transactions WHERE id = ?', [{ type: 'integer', value: String(id) }]);
    } else {
      localSave(localLoad().filter(r => String(r.id) !== String(id)));
    }
    if (String(state.editingId) === String(id)) cancelEdit(true);
    await loadAll();
  }

  // ---------- reports ----------
  function inRange(trxDate, a, b) { return trxDate >= a && trxDate <= b; }
  function currentRange() {
    const sel = state.selectedDate;
    if (state.view === 'harian') return [sel, sel];
    if (state.view === 'mingguan') { const m = mondayOf(sel); return [m, sundayOf(m)]; }
    const [a, b] = monthRange(sel); return [a, b];
  }
  function filteredRows(forReport = false) {
    const [a, b] = currentRange();
    let rows = state.rows.filter(r => inRange(r.trx_date, a, b));
    if (!forReport) {
      if (state.filterType !== 'semua') rows = rows.filter(r => r.type === state.filterType);
      if (state.search) {
        const q = state.search.toLowerCase();
        rows = rows.filter(r => (r.category + ' ' + (r.note || '')).toLowerCase().includes(q));
      }
    }
    return rows;
  }

  function renderSummary() {
    const today = todayStr();
    const [mA, mB] = currentRange();
    const sum = (rows, t) => rows.filter(r => r.type === t).reduce((s, r) => s + Number(r.amount), 0);
    const dayRows = state.rows.filter(r => r.trx_date === today);
    const rangeRows = state.rows.filter(r => inRange(r.trx_date, mA, mB));
    const allIn = sum(state.rows, 'masuk'), allOut = sum(state.rows, 'keluar');

    document.getElementById('stat-hari').textContent =
      fmtRp(sum(dayRows, 'masuk') - sum(dayRows, 'keluar'));
    document.getElementById('stat-periode').textContent =
      fmtRp(sum(rangeRows, 'masuk') - sum(rangeRows, 'keluar'));
    document.getElementById('stat-periode-label').textContent =
      state.view === 'harian' ? 'Net hari dipilih' : state.view === 'mingguan' ? 'Net minggu dipilih' : 'Net bulan dipilih';
    document.getElementById('stat-saldo').textContent = fmtRp(allIn - allOut);
    document.getElementById('sum-masuk').textContent = fmtRp(sum(rangeRows, 'masuk'));
    document.getElementById('sum-keluar').textContent = fmtRp(sum(rangeRows, 'keluar'));
    document.getElementById('range-label').textContent = mA === mB ? mA : mA + ' s/d ' + mB;
  }

  function renderTable() {
    const rows = filteredRows(false);
    const tb = document.getElementById('tbody');
    tb.innerHTML = '';
    if (!rows.length) {
      tb.innerHTML = '<tr><td colspan="5" class="muted">Belum ada transaksi pada periode ini.</td></tr>';
      return;
    }
    for (const r of rows) {
      const tr = document.createElement('tr');
      tr.className = 'clickable';
      tr.innerHTML =
        '<td>' + r.trx_date + '</td>' +
        '<td><span class="badge ' + r.type + '">' + (r.type === 'masuk' ? 'Masuk' : 'Keluar') + '</span></td>' +
        '<td>' + escapeHtml(r.category) + (r.note ? '<br><span class="muted">' + escapeHtml(r.note) + '</span>' : '') + '</td>' +
        '<td style="text-align:right">' + fmtRp(r.amount) + '</td>' +
        '<td><button class="btn small ghost" data-edit="' + r.id + '">Edit</button> <button class="btn small danger" data-del="' + r.id + '">Hapus</button></td>';
      tr.addEventListener('click', (e) => {
        if (e.target.dataset.del || e.target.dataset.edit) return; // tombol aksi
        state.selectedDate = r.trx_date;
        document.getElementById('date-picker').value = r.trx_date;
        renderDetail(r.trx_date);
        render();
        document.getElementById('detail').scrollIntoView({ behavior: 'smooth' });
      });
      tb.appendChild(tr);
    }
    tb.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); deleteTx(btn.dataset.del); });
    });
    tb.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); startEdit(btn.dataset.edit); });
    });
  }

  function renderDetail(dateStr) {
    const d = dateStr || state.selectedDate;
    const rows = state.rows.filter(r => r.trx_date === d);
    const el = document.getElementById('detail-body');
    const sum = (t) => rows.filter(r => r.type === t).reduce((s, r) => s + Number(r.amount), 0);
    if (!rows.length) {
      el.innerHTML = '<p class="muted">Tidak ada transaksi pada <b>' + d + '</b>.</p>';
      return;
    }
    el.innerHTML =
      '<p><b>' + d + '</b> — ' + rows.length + ' transaksi. Masuk: ' + fmtRp(sum('masuk')) +
      ' · Keluar: ' + fmtRp(sum('keluar')) + ' · Net: ' + fmtRp(sum('masuk') - sum('keluar')) + '</p>' +
      '<table><thead><tr><th>Jam</th><th>Tipe</th><th>Kategori / Catatan</th><th style="text-align:right">Jumlah</th></tr></thead><tbody>' +
      rows.map(r => '<tr><td class="muted">' + String(r.created_at || '').slice(0, 16).replace('T', ' ') + '</td><td>' + r.type + '</td><td>' +
        escapeHtml(r.category) + ' — ' + escapeHtml(r.note || '') + '</td><td style="text-align:right">' + fmtRp(r.amount) + '</td></tr>').join('') +
      '</tbody></table>';
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function render() {
    document.querySelectorAll('.tabs button[data-view]').forEach(b =>
      b.classList.toggle('active', b.dataset.view === state.view));
    renderSummary();
    renderTable();
    renderDetail(state.selectedDate);
    const badge = document.getElementById('storage-badge');
    badge.textContent = TursoDB.isConfigured() ? 'Turso: terhubung' : 'Mode lokal (localStorage)';
  }

  function bind() {
    document.getElementById('tx-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const tx = {
        type: document.getElementById('f-type').value,
        amount: Number(document.getElementById('f-amount').value),
        trx_date: document.getElementById('f-date').value,
        category: document.getElementById('f-cat').value.trim() || 'Lainnya',
        note: document.getElementById('f-note').value.trim()
      };
      if (!tx.amount || tx.amount <= 0) return alert('Nominal harus > 0');
      if (!tx.trx_date) return alert('Tanggal wajib diisi');
      try {
        if (state.editingId !== null) {
          await updateTx(state.editingId, tx);
          cancelEdit(true);
        } else {
          await addTx(tx);
          e.target.reset();
          document.getElementById('f-date').value = todayStr();
        }
      }
      catch (err) { alert('Gagal simpan: ' + err.message); }
    });
    document.getElementById('btn-cancel-edit').addEventListener('click', () => cancelEdit(true));

    document.querySelectorAll('[data-view]').forEach(b =>
      b.addEventListener('click', () => { state.view = b.dataset.view; render(); }));
    document.getElementById('date-picker').addEventListener('change', (e) => {
      state.selectedDate = e.target.value || todayStr(); render();
    });
    document.getElementById('f-type-filter').addEventListener('change', (e) => {
      state.filterType = e.target.value; renderTable();
    });
    document.getElementById('f-search').addEventListener('input', (e) => {
      state.search = e.target.value; renderTable();
    });

    // settings Turso
    document.getElementById('btn-test').addEventListener('click', async () => {
      const url = document.getElementById('s-url').value;
      const token = document.getElementById('s-token').value;
      TursoDB.saveConfig(url, token);
      try { await TursoDB.testConnection(); alert('Koneksi Turso OK'); await loadAll(); }
      catch (err) { alert('Koneksi gagal: ' + err.message); }
    });
    document.getElementById('btn-clear').addEventListener('click', () => {
      TursoDB.clearConfig(); render(); alert('Konfigurasi Turso dihapus, kembali ke mode lokal.');
    });
    document.getElementById('btn-init').addEventListener('click', async () => {
      try {
        const sql = await (await fetch('sql/schema.sql')).text();
        await TursoDB.initSchema(sql);
        alert('Schema berhasil dibuat di Turso'); await loadAll();
      } catch (err) { alert('Init schema gagal: ' + err.message); }
    });

    document.getElementById('f-date').value = todayStr();
    document.getElementById('date-picker').value = state.selectedDate;
    const cfg = TursoDB.getConfig();
    document.getElementById('s-url').value = cfg.url || '';
    document.getElementById('s-token').value = cfg.token || '';
  }

  return { boot: async () => { bind(); await loadAll().catch(err => { render(); console.error(err); }); } };
})();

document.addEventListener('DOMContentLoaded', App.boot);
