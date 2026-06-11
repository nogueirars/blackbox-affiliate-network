/**
 * Teste de reprodução/verificação do bug de AFP em contratos.
 *
 * Bug: criar contrato sem AFP falha com not-null constraint porque
 *  - o trigger trg_contratos_gera_afp está desabilitado
 *  - a RPC generate_unique_afp chamada pelo código nunca existiu no banco
 *
 * Uso: node scripts/test-afp-fix.cjs
 * Todas as escritas rodam dentro de transação com ROLLBACK — não polui dados.
 */
const { Client } = require('pg')

const CONN = process.env.DATABASE_URL_TEST ||
  'postgresql://postgres.tsavvhlrnvzzmxjgrkot:Blackbox%4033225640@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'

async function main() {
  const c = new Client({ connectionString: CONN, ssl: { rejectUnauthorized: false } })
  await c.connect()
  let pass = 0, fail = 0
  const check = (name, ok, detail = '') => {
    console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
    ok ? pass++ : fail++
  }

  // 1. RPC generate_unique_afp existe e retorna AFP válido
  try {
    const r = await c.query('select public.generate_unique_afp() as afp')
    const afp = r.rows[0].afp
    check('RPC generate_unique_afp existe', true, `gerou "${afp}"`)
    check('AFP gerado tem formato [A-Z0-9]{8}', /^[A-Z0-9]{8}$/.test(afp), afp)
  } catch (e) {
    check('RPC generate_unique_afp existe', false, e.message)
  }

  // 2. Trigger habilitado
  const trg = await c.query(
    "select tgenabled from pg_trigger where tgrelid='public.contratos'::regclass and tgname='trg_contratos_gera_afp'")
  check('Trigger trg_contratos_gera_afp habilitado', trg.rows[0]?.tgenabled === 'O',
    `tgenabled=${trg.rows[0]?.tgenabled}`)

  // Pega um contrato existente para reusar FKs válidas
  const ref = await c.query('select id_casa, id_user_role from public.contratos limit 1')
  if (!ref.rows.length) {
    console.log('⚠️  Sem contratos existentes para reusar FKs — pulando testes de insert')
  } else {
    const { id_casa, id_user_role } = ref.rows[0]

    // 3. INSERT sem AFP → trigger deve preencher (cenário do bug)
    try {
      await c.query('begin')
      const r = await c.query(
        `insert into public.contratos (id_casa, id_user_role, afp, tipo_contrato, ativo)
         values ($1, $2, null, 'CPA', true) returning afp`, [id_casa, id_user_role])
      check('INSERT sem AFP gera código automaticamente', /^[A-Z0-9]{8}$/.test(r.rows[0].afp),
        `afp="${r.rows[0].afp}"`)
      await c.query('rollback')
    } catch (e) {
      await c.query('rollback')
      check('INSERT sem AFP gera código automaticamente', false, e.message)
    }

    // 4. INSERT com AFP customizado → trigger deve RESPEITAR o valor
    try {
      await c.query('begin')
      const custom = 'ZZTEST99'
      const r = await c.query(
        `insert into public.contratos (id_casa, id_user_role, afp, tipo_contrato, ativo)
         values ($1, $2, $3, 'CPA', true) returning afp`, [id_casa, id_user_role, custom])
      check('INSERT com AFP customizado preserva o valor', r.rows[0].afp === custom,
        `afp="${r.rows[0].afp}" (esperado "${custom}")`)
      await c.query('rollback')
    } catch (e) {
      await c.query('rollback')
      check('INSERT com AFP customizado preserva o valor', false, e.message)
    }
  }

  await c.end()
  console.log(`\n${pass} passou, ${fail} falhou`)
  process.exit(fail ? 1 : 0)
}

main().catch(e => { console.error(e); process.exit(1) })
