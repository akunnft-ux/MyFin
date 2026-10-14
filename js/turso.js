/* MyFin Turso client — pure fetch ke libSQL HTTP /v2/pipeline.
 * Kredensial TIDAK di-hardcode. Disimpan di localStorage milik user (Settings).
 * Fallback: mode lokal (localStorage) bila Turso belum dikonfigurasi.
 */
const TursoDB = (() => {
  const LS_URL = 'myfin_turso_url';
  const LS_TOKEN = 'myfin_turso_token';

  function getConfig() {
    return {
      url: (localStorage.getItem(LS_URL) || '').replace(/\/$/, ''),
      token: localStorage.getItem(LS_TOKEN) || ''
    };
  }
  function isConfigured() {
    const c = getConfig();
    return !!(c.url && c.token);
  }
  function saveConfig(url, token) {
    localStorage.setItem(LS_URL, (url || '').trim().replace(/\/$/, ''));
    localStorage.setItem(LS_TOKEN, (token || '').trim());
  }
  function clearConfig() {
    localStorage.removeItem(LS_URL);
    localStorage.removeItem(LS_TOKEN);
  }

  async function pipeline(statements) {
    const { url, token } = getConfig();
    if (!url || !token) throw new Error('Turso belum dikonfigurasi');
    const res = await fetch(url + '/v2/pipeline', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        requests: statements.map(s => ({
          type: 'execute',
          stmt: { sql: s.sql, args: s.args || [] }
        }))
      })
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error('Turso HTTP ' + res.status + ': ' + t.slice(0, 300));
    }
    const data = await res.json();
    if (data.results) {
      for (const r of data.results) {
        if (r.type === 'error') throw new Error('Turso error: ' + JSON.stringify(r.error).slice(0, 500));
      }
    }
    return data;
  }

  // rows -> array of objects {col: val}
  function toObjects(result) {
    const cols = result.cols || result.columns || [];
    const colNames = cols.map(c => c.name || c);
    const rows = result.rows || [];
    return rows.map(r => {
      const vals = r.map ? r.map(cell => (cell && typeof cell === 'object' && 'value' in cell ? cell.value : cell)) : [];
      const o = {};
      colNames.forEach((n, i) => o[n] = vals[i]);
      return o;
    });
  }

  async function query(sql, args = []) {
    const data = await pipeline([{ sql, args }]);
    const first = (data.results && data.results[0] && data.results[0].response) || {};
    const exec = first.result || first;
    return toObjects(exec);
  }

  async function exec(sql, args = []) {
    await pipeline([{ sql, args }]);
  }

  async function testConnection() {
    return query('SELECT 1 AS ok');
  }

  async function initSchema(schemaSql) {
    const stmts = schemaSql.split(';').map(s => s.trim()).filter(s => s && !s.startsWith('--'));
    for (const sql of stmts) {
      // skip seed example yang di-comment
      await pipeline([{ sql, args: [] }]);
    }
  }

  return { getConfig, isConfigured, saveConfig, clearConfig, query, exec, testConnection, initSchema };
})();
