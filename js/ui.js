/* MyFin ui.js — progressive enhancement ADITIF (visual only).
 * Tidak mengubah app.js / turso.js. Hanya membaca DOM & menambah kenyamanan.
 * Aman: semua listener pasif; tidak ada override business logic.
 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmtRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

  /* ---------- toast ---------- */
  function toast(msg, isErr = false) {
    const wrap = $('#toast-wrap');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = 'toast' + (isErr ? ' err' : '');
    el.textContent = (isErr ? '⚠️ ' : '✅ ') + msg;
    wrap.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 2600);
  }

  /* ---------- eye toggle: sembunyikan saldo ---------- */
  const eye = $('#btn-eye'), saldo = $('#stat-saldo');
  if (eye && saldo) {
    eye.addEventListener('click', () => {
      const hidden = saldo.classList.toggle('hidden-blur');
      eye.setAttribute('aria-pressed', String(hidden));
      toast(hidden ? 'Saldo disembunyikan' : 'Saldo ditampilkan');
    });
  }

  /* ---------- preview nominal ---------- */
  const amt = $('#f-amount'), preview = $('#amt-preview');
  if (amt && preview) {
    const upd = () => { preview.textContent = fmtRp(Number(amt.value) || 0); };
    amt.addEventListener('input', upd); upd();
  }

  /* ---------- chips nominal & kategori ---------- */
  $$('.chip[data-amt]').forEach(ch => ch.addEventListener('click', () => {
    if (!amt) return;
    amt.value = ch.dataset.amt;
    amt.dispatchEvent(new Event('input', { bubbles: true }));
    $$('.chip[data-amt]').forEach(c => c.classList.remove('picked'));
    ch.classList.add('picked');
    amt.focus();
  }));
  const cat = $('#f-cat');
  $$('.chip[data-cat]').forEach(ch => ch.addEventListener('click', () => {
    if (!cat) return;
    cat.value = ch.dataset.cat;
    cat.focus();
    toast('Kategori: ' + ch.dataset.cat);
  }));

  /* ---------- segmented tipe <-> select (2 arah, sinkron visual) ---------- */
  const sel = $('#f-type');
  const segs = $$('.seg-btn');
  function paintSeg(v) { segs.forEach(b => b.classList.toggle('active', b.dataset.seg === v)); }
  segs.forEach(b => b.addEventListener('click', () => {
    if (!sel) return;
    sel.value = b.dataset.seg;
    paintSeg(b.dataset.seg);
  }));
  if (sel) {
    sel.addEventListener('change', () => paintSeg(sel.value));
    paintSeg(sel.value || 'keluar');
    // saat app.js masuk mode edit, sel diisi programmatically -> pantau
    new MutationObserver(() => paintSeg(sel.value)).observe(sel, { attributes: true, attributeFilter: ['value'] });
    setInterval(() => paintSeg(sel.value), 800); // fallback ringan utk programmatic set
  }

  /* ---------- tombol "tambah sekarang" di empty state ---------- */
  $$('[data-goto]').forEach(b => b.addEventListener('click', () => {
    const target = document.querySelector(`[data-tabbtn="${b.dataset.goto}"]`);
    if (target) target.click();
  }));

  /* ---------- badge status online/offline (read-only observer) ---------- */
  const badge = $('#storage-badge'), dot = $('#conn-dot');
  function paintBadge() {
    if (!badge) return;
    const online = /terhubung/i.test(badge.textContent || '');
    badge.classList.toggle('online', online);
    if (dot) dot.classList.toggle('on', online);
  }
  if (badge) new MutationObserver(paintBadge).observe(badge, { childList: true, characterData: true, subtree: true });
  paintBadge();

  /* ---------- health bar + hint + empty state (read-only observer) ---------- */
  const fill = $('#health-fill'), hint = $('#hero-hint');
  const sumIn = $('#sum-masuk'), sumOut = $('#sum-keluar');
  const tbody = $('#tbody'), empty = $('#empty-state'), detailBadge = $('#detail-date-badge');
  const datePicker = $('#date-picker');
  function parseRp(t) { return Number(String(t || '').replace(/[^0-9]/g, '')) || 0; }
  function refreshHealth() {
    if (!sumIn || !sumOut) return;
    const i = parseRp(sumIn.textContent), o = parseRp(sumOut.textContent);
    const total = i + o;
    const pct = total ? Math.round((i / total) * 100) : 50;
    if (fill) {
      fill.style.width = pct + '%';
      fill.style.background = (i - o) >= 0
        ? 'linear-gradient(90deg,var(--green),var(--accent3))'
        : 'linear-gradient(90deg,#f43f5e,#fbbf24)';
    }
    if (hint) {
      hint.textContent = total === 0
        ? 'Belum ada data periode ini — yuk catat transaksi pertamamu.'
        : (i - o) >= 0
          ? `Sehat 🎉 pemasukan menutup pengeluaran periode ini.`
          : `Waspada 💡 pengeluaran melebihi pemasukan periode ini.`;
    }
  }
  function refreshEmpty() {
    if (!tbody || !empty) return;
    const hasRows = tbody.querySelector('tr.clickable') !== null;
    empty.hidden = hasRows;
  }
  function refreshDetailBadge() {
    if (detailBadge && datePicker && datePicker.value) detailBadge.textContent = '📅 ' + datePicker.value;
  }
  const obs = new MutationObserver(() => { refreshHealth(); refreshEmpty(); refreshDetailBadge(); paintBadge(); });
  [sumIn, sumOut, tbody, badge].forEach(el => { if (el) obs.observe(el, { childList: true, characterData: true, subtree: true }); });
  if (datePicker) datePicker.addEventListener('change', refreshDetailBadge);
  refreshHealth(); refreshEmpty(); refreshDetailBadge();

  /* ---------- feedback ringan tombol settings (tanpa override logic app.js) ---------- */
  const t = $('#btn-test'), iv = $('#btn-init'), cl = $('#btn-clear');
  if (t) t.addEventListener('click', () => setTimeout(() => toast('Mengecek koneksi Turso…'), 50));
  if (iv) iv.addEventListener('click', () => setTimeout(() => toast('Mengirim schema ke Turso…'), 50));
  if (cl) cl.addEventListener('click', () => setTimeout(() => toast('Kembali ke mode lokal'), 50));

  /* ---------- aria-selected tabs sinkron visual ---------- */
  $$('.tabs button[data-view]').forEach(b => b.addEventListener('click', () => {
    $$('.tabs button[data-view]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
  }));
})();
