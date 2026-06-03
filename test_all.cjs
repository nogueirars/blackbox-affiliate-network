/**
 * test_all.cjs — Orbit Security & Functionality Test Suite
 * Runs: DB integrity, RLS, Sync API, HTTP security
 * Usage: node test_all.cjs
 */
const https = require('https');
const http  = require('http');

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://tsavvhlrnvzzmxjgrkot.supabase.co';
const SERVICE_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzYXZ2aGxybnZ6em14amdya290Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQwMTMxNSwiZXhwIjoyMDk0OTc3MzE1fQ.4HFIGBdBCnUi3OMu7apdnea6zkAtm9SQ20msOlTbzPI';
const ANON_KEY      = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzYXZ2aGxybnZ6em14amdya290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDEzMTUsImV4cCI6MjA5NDk3NzMxNX0.dq6OcOjKnqQVKQ1j5HKcc0YVnGC1Dlcl87FD9Q2IdQI';
const APP_URL       = 'http://localhost:3001';
const ADMIN_USER_ID = '73985b5a-e22f-4bda-9b7c-af46aaf77755'; // test@orbit.dev

// ── Colours ───────────────────────────────────────────────────────────────────
const G = (s) => `\x1b[32m${s}\x1b[0m`;
const R = (s) => `\x1b[31m${s}\x1b[0m`;
const Y = (s) => `\x1b[33m${s}\x1b[0m`;
const B = (s) => `\x1b[36m${s}\x1b[0m`;
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;

// ── Test runner ───────────────────────────────────────────────────────────────
let passed = 0, failed = 0, warned = 0;
const failures = [];

function pass(name, detail = '') {
  passed++;
  process.stdout.write(`  ${G('✓')} ${name}${detail ? DIM(' — ' + detail) : ''}\n`);
}
function fail(name, detail = '') {
  failed++;
  failures.push({ name, detail });
  process.stdout.write(`  ${R('✗')} ${name}${detail ? R(' — ' + detail) : ''}\n`);
}
function warn(name, detail = '') {
  warned++;
  process.stdout.write(`  ${Y('!')} ${name}${detail ? Y(' — ' + detail) : ''}\n`);
}
function section(title) {
  process.stdout.write(`\n${B('▶ ' + title)}\n`);
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function sbGet(path, key = SERVICE_KEY) {
  return sbReq('GET', path, null, key);
}
function sbReq(method, path, body, key = SERVICE_KEY) {
  return new Promise((res, rej) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
    const opts = {
      method, hostname: url.hostname, path: url.pathname + url.search,
      headers: {
        'apikey': key, 'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };
    const req = https.request(opts, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res({ status: r.statusCode, body: d ? ((() => { try { return JSON.parse(d); } catch { return d; } })()) : null }));
    });
    req.on('error', rej);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function appReq(method, path, body, authHeader = '') {
  return new Promise((res, rej) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const url = new URL(`${APP_URL}${path}`);
    const opts = {
      method, hostname: url.hostname, port: url.port || 3001,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...(authHeader ? { 'Authorization': authHeader } : {}),
        'Cookie': '',
      },
    };
    const req = http.request(opts, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res({ status: r.statusCode, body: d ? ((() => { try { return JSON.parse(d); } catch { return d; } })()) : null }));
    });
    req.on('error', rej);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function smarticoReq(base, token, from, to) {
  const url = new URL(base);
  url.searchParams.set('aggregation_period', 'DAY');
  url.searchParams.set('group_by', 'afp');
  url.searchParams.set('date_from', from);
  url.searchParams.set('date_to', to);
  return new Promise((res) => {
    https.get({ hostname: url.hostname, path: url.pathname + url.search, headers: { Authorization: token } }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try { res({ status: r.statusCode, body: JSON.parse(d) }); }
        catch { res({ status: r.statusCode, body: d }); }
      });
    }).on('error', e => res({ status: 'ERR', body: e.message }));
  });
}

// ── SUITE 1: DB Integrity ─────────────────────────────────────────────────────
async function testDB() {
  section('DB Integrity');

  const { body: casas } = await sbGet('casas_aposta?select=id,nome_exibicao,tipo_integracao,api_token,api_auth_type,ativo');
  if (!Array.isArray(casas)) { fail('casas_aposta readable', 'not array'); return; }

  // Count
  casas.length === 42
    ? pass('Total casas = 42', `got ${casas.length}`)
    : fail('Total casas = 42', `got ${casas.length}`);

  const ativas = casas.filter(c => c.ativo);
  ativas.length === 32
    ? pass('Casas ativas = 32', `got ${ativas.length}`)
    : fail('Casas ativas = 32', `got ${ativas.length}`);

  // All API casas have token + auth_type
  const apiCasas = casas.filter(c => c.tipo_integracao === 'API');
  const apiWithoutToken = apiCasas.filter(c => !c.api_token || !c.api_auth_type);
  apiWithoutToken.length === 0
    ? pass('All API casas have token + auth_type', `${apiCasas.length} API casas`)
    : fail('All API casas have token + auth_type', `missing: ${apiWithoutToken.map(c => c.nome_exibicao).join(', ')}`);

  // MmaBet token has no ++ suffix
  const mma = casas.find(c => c.nome_exibicao === 'MmaBet');
  mma && !mma.api_token?.includes('++')
    ? pass('MmaBet token clean (no ++)')
    : fail('MmaBet token clean', mma ? `token=${mma.api_token}` : 'not found');

  // Manual casas have null api_url_base
  const manualCasas = casas.filter(c => c.tipo_integracao === 'MANUAL');
  const { body: manualFull } = await sbGet('casas_aposta?tipo_integracao=eq.MANUAL&select=nome_exibicao,api_url_base,api_token');
  const manualWithToken = (manualFull || []).filter(c => c.api_token || c.api_url_base);
  manualWithToken.length === 0
    ? pass('MANUAL casas have no API fields', `${manualCasas.length} manual casas`)
    : fail('MANUAL casas have no API fields', `with data: ${manualWithToken.map(c=>c.nome_exibicao).join(', ')}`);

  // Entidade exists
  const { body: ents } = await sbGet('entidades?select=id,nome_fantasia');
  Array.isArray(ents) && ents.length >= 1
    ? pass('Entidade exists', ents[0].nome_fantasia)
    : fail('Entidade exists', 'none found');
}

// ── SUITE 2: RLS Security ─────────────────────────────────────────────────────
async function testRLS() {
  section('RLS (anon key)');

  // Anon should NOT see api_token
  const { body: anonCasas } = await sbGet('casas_aposta?select=id,nome_exibicao,api_token&limit=5', ANON_KEY);
  if (Array.isArray(anonCasas) && anonCasas.length > 0) {
    const tokensExposed = anonCasas.some(c => c.api_token !== null && c.api_token !== undefined && c.api_token !== '');
    tokensExposed
      ? fail('🚨 api_token hidden from anon', `EXPOSED: ${anonCasas.filter(c=>c.api_token).map(c=>c.nome_exibicao).join(', ')}`)
      : pass('api_token hidden from anon (null in response)');
  } else if (anonCasas === null || (Array.isArray(anonCasas) && anonCasas.length === 0)) {
    pass('Anon blocked from casas_aposta entirely');
  } else {
    warn('casas_aposta anon access unclear', JSON.stringify(anonCasas).slice(0, 100));
  }

  // Anon should NOT see producao_dados
  const { body: anonProd, status: anonProdStatus } = await sbGet('producao_dados?select=id&limit=1', ANON_KEY);
  if (anonProdStatus === 200 && Array.isArray(anonProd) && anonProd.length === 0) {
    pass('producao_dados: anon sees 0 rows (RLS blocks)');
  } else if (anonProdStatus >= 400 || anonProd === null) {
    pass('producao_dados: anon blocked', `HTTP ${anonProdStatus}`);
  } else {
    warn('producao_dados anon access unclear', `status=${anonProdStatus} rows=${Array.isArray(anonProd)?anonProd.length:'?'}`);
  }

  // Anon should NOT see users table (public.users has sensitive data)
  const { body: anonUsers, status: anonUsersStatus } = await sbGet('users?select=id,email,cpf&limit=1', ANON_KEY);
  if (anonUsersStatus >= 400 || (Array.isArray(anonUsers) && anonUsers.length === 0)) {
    pass('public.users: anon blocked or empty');
  } else if (Array.isArray(anonUsers) && anonUsers.length > 0 && anonUsers[0].cpf) {
    fail('🚨 public.users CPF exposed to anon', `${anonUsers[0].email}`);
  } else {
    warn('public.users anon access unclear', `status=${anonUsersStatus}`);
  }

  // Anon should NOT see contratos
  const { body: anonContratos, status: anonCtStatus } = await sbGet('contratos?select=id&limit=1', ANON_KEY);
  anonCtStatus >= 400 || (Array.isArray(anonContratos) && anonContratos.length === 0)
    ? pass('contratos: anon blocked or empty')
    : warn('contratos anon access unclear', `status=${anonCtStatus}`);

  // Service role CAN see api_token (baseline)
  const { body: svcCasas } = await sbGet('casas_aposta?select=api_token&limit=1&api_token=not.is.null');
  Array.isArray(svcCasas) && svcCasas.length > 0 && svcCasas[0].api_token
    ? pass('Service role CAN read api_token (baseline)')
    : fail('Service role cannot read api_token', 'something wrong');
}

// ── SUITE 3: Sync Functionality ───────────────────────────────────────────────
async function testSync() {
  section('Sync Functionality (direct API calls)');

  // Zero Um — should work
  const zuResult = await smarticoReq(
    'https://boapi3.smartico.ai/api/af2_media_report_af',
    '1062dfc4-4d13-11f0-b10d-027e66b7665d-525742',
    '2026-05-01', '2026-05-10'
  );
  if (zuResult.status === 200 && Array.isArray(zuResult.body?.data)) {
    zuResult.body.data.length > 0
      ? pass('Zero Um API returns rows', `${zuResult.body.data.length} rows`)
      : warn('Zero Um API returned 0 rows', 'maybe no data for period');
  } else {
    fail('Zero Um API call', `status=${zuResult.status} errCode=${zuResult.body?.errCode}`);
  }

  // Zero Um field mapping — check key fields exist
  if (zuResult.status === 200 && zuResult.body?.data?.[0]) {
    const row = zuResult.body.data[0];
    const required = ['dt', 'afp', 'registration_count', 'ftd_count', 'deposit_count', 'net_pl', 'commissions_total'];
    const missing = required.filter(k => !(k in row));
    missing.length === 0
      ? pass('Smartico v2 field names present', required.join(', '))
      : fail('Missing Smartico fields', missing.join(', '));
  }

  // GoldeBet — should work
  const gbResult = await smarticoReq(
    'https://boapi3.smartico.ai/api/af2_media_report_af',
    '8761fd6e-e13d-11ee-9abc-0228c1221b89-210263',
    '2026-05-01', '2026-05-10'
  );
  gbResult.status === 200 && Array.isArray(gbResult.body?.data)
    ? pass('GoldeBet API call succeeds', `${gbResult.body.data.length} rows`)
    : fail('GoldeBet API call', `status=${gbResult.status}`);

  // EstrelaBet — should return errCode:3 (token issue)
  const ebResult = await smarticoReq(
    'https://boapi.smartico.ai/api/af2_media_report_af',
    '53491628-ae27-11ee-b62d-0a499b262305-201599',
    '2026-05-01', '2026-05-10'
  );
  const isErrCode = ebResult.body?.errCode != null;
  isErrCode
    ? pass('EstrelaBet returns errCode (detected correctly)', `msg: ${ebResult.body?.message}`)
    : warn('EstrelaBet unexpected response', `status=${ebResult.status}`);

  // Date range validation: same date should fail on Smartico (500)
  const sameDateResult = await smarticoReq(
    'https://boapi3.smartico.ai/api/af2_media_report_af',
    '1062dfc4-4d13-11f0-b10d-027e66b7665d-525742',
    '2026-05-14', '2026-05-14'
  );
  sameDateResult.status === 500 || sameDateResult.body?.message?.includes('equal')
    ? pass('Same-date request blocked by Smartico', `msg: ${sameDateResult.body?.message}`)
    : warn('Same-date handling unclear', `status=${sameDateResult.status}`);

  // Betano API
  const betanoUrl = new URL('https://affiliateslatam.betano.com/api/affreporting.asp?reportname=ACIDReport&reportformat=xml&reportmerchantid=0&reportdisplayby=Site%2CDate');
  betanoUrl.searchParams.set('apipassword', 'd156a081df104add82dfb25846269ad2');
  betanoUrl.searchParams.set('reportstartdate', '2026-05-01');
  betanoUrl.searchParams.set('reportenddate', '2026-05-10');
  await new Promise((res) => {
    https.get(betanoUrl.toString(), (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        r.statusCode === 200 && (d.includes('<row') || d.length > 100)
          ? pass('Betano API returns XML', `status=${r.statusCode} len=${d.length}`)
          : (r.statusCode === 200
              ? warn('Betano API 200 but no <row>', `len=${d.length}`)
              : fail('Betano API', `status=${r.statusCode}`));
        res();
      });
    }).on('error', e => { fail('Betano API network error', e.message); res(); });
  });
}

// ── SUITE 4: HTTP Security (requires app on :3001) ────────────────────────────
async function testHTTPSecurity() {
  section('HTTP Security (localhost:3001)');

  // Test if server is up first
  try {
    const ping = await appReq('GET', '/api/admin/sync', null, '');
    if (ping === null) { warn('Server not reachable on :3001 — skipping HTTP tests'); return; }
  } catch (e) {
    warn('Server not reachable on :3001 — skipping HTTP tests', e.message);
    return;
  }

  const secTests = [
    { method: 'GET',  path: '/api/admin/sync',            expectStatus: [401,403], desc: 'GET /api/admin/sync (no auth)' },
    { method: 'POST', path: '/api/admin/sync',            expectStatus: [401,403], desc: 'POST /api/admin/sync (no auth)' },
    { method: 'GET',  path: '/api/admin/afiliados/fake-id', expectStatus: [401,403], desc: 'GET /api/admin/afiliados/x (no auth)' },
    { method: 'GET',  path: '/api/admin/saques/fake-id',  expectStatus: [401,403], desc: 'GET /api/admin/saques/x (no auth)' },
    { method: 'POST', path: '/api/saques',                expectStatus: [401,403], desc: 'POST /api/saques (no auth)' },
    { method: 'GET',  path: '/api/saldo/influenciador/fake-id', expectStatus: [401,403], desc: 'GET /api/saldo/influenciador/x (no auth)' },
    { method: 'GET',  path: '/api/saldo/gerente/fake-id', expectStatus: [401,403], desc: 'GET /api/saldo/gerente/x (no auth)' },
    { method: 'GET',  path: '/api/saldo/intermediario/fake-id', expectStatus: [401,403], desc: 'GET /api/saldo/intermediario/x (no auth)' },
  ];

  for (const t of secTests) {
    try {
      const { status } = await appReq(t.method, t.path, t.method === 'POST' ? {} : null, '');
      t.expectStatus.includes(status)
        ? pass(t.desc, `HTTP ${status}`)
        : fail(t.desc, `expected ${t.expectStatus.join('/')} got ${status}`);
    } catch (e) {
      fail(t.desc, e.message);
    }
  }

  // IDOR: try to access wrong user's saldo with a fake token
  const { status: idorStatus } = await appReq('GET', `/api/saldo/influenciador/${ADMIN_USER_ID}`, null, 'Bearer fake-token-xyz');
  [401, 403].includes(idorStatus)
    ? pass('IDOR: fake token rejected on saldo endpoint', `HTTP ${idorStatus}`)
    : fail('IDOR: fake token should be rejected', `got ${idorStatus}`);

  // Verify admin sync with service role token (should it work via HTTP? service role bypasses auth differently)
  // This confirms app auth layer is separate from DB auth
  const { status: srStatus } = await appReq('POST', '/api/admin/sync', { debug: true }, `Bearer ${SERVICE_KEY}`);
  // Service role JWT is NOT a user JWT — app.auth.getUser() should return null
  [401, 403].includes(srStatus)
    ? pass('Service role JWT rejected at app layer (not a user session)', `HTTP ${srStatus}`)
    : warn('Service role JWT at app layer returned unexpected status', `HTTP ${srStatus} (app may treat service role as authed)`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  process.stdout.write(`\n${'═'.repeat(60)}\n`);
  process.stdout.write(`  ${B('Orbit Test Suite')}\n`);
  process.stdout.write(`${'═'.repeat(60)}\n`);

  await testDB();
  await testRLS();
  await testSync();
  await testHTTPSecurity();

  // ── Summary ──────────────────────────────────────────────────────────────────
  process.stdout.write(`\n${'─'.repeat(60)}\n`);
  process.stdout.write(`  ${G(`${passed} passed`)}  ${failed > 0 ? R(`${failed} failed`) : DIM('0 failed')}  ${warned > 0 ? Y(`${warned} warnings`) : DIM('0 warnings')}\n`);

  if (failures.length > 0) {
    process.stdout.write(`\n${R('Failed tests:')}\n`);
    failures.forEach(f => process.stdout.write(`  ${R('✗')} ${f.name}: ${f.detail}\n`));
  }

  process.stdout.write(`${'─'.repeat(60)}\n\n`);
  if (failed > 0) process.exit(1);
}

main().catch(e => { process.stderr.write('FATAL: ' + e.message + '\n'); process.exit(1); });
