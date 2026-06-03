/**
 * fix_rls.cjs — Apply RLS policies to protect sensitive columns
 * Fixes:
 *   1. casas_aposta: api_token exposed to anon
 *   2. public.users: cpf/cnpj/pix_key exposed to anon
 */
const { execSync } = require('child_process');

const SQL = `
-- ── casas_aposta ─────────────────────────────────────────────────────────────
-- Enable RLS (idempotent)
ALTER TABLE public.casas_aposta ENABLE ROW LEVEL SECURITY;

-- Drop existing permissive policies if any
DROP POLICY IF EXISTS "casas_aposta_public_read"   ON public.casas_aposta;
DROP POLICY IF EXISTS "casas_aposta_anon_read"     ON public.casas_aposta;
DROP POLICY IF EXISTS "Enable read access for all" ON public.casas_aposta;

-- Policy 1: Service role bypass (Supabase handles this automatically, but be explicit)
-- No policy needed for service_role — it bypasses RLS.

-- Policy 2: Authenticated admin users can read all columns
CREATE POLICY "casas_aposta_admin_all"
  ON public.casas_aposta
  FOR ALL
  TO authenticated
  USING (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- Policy 3: Public/anon can read non-sensitive columns only
-- We achieve this by: RLS ON with no anon SELECT policy = anon sees nothing.
-- The app only needs casas data server-side (admin), so anon access is not needed.
-- Anon = blocked entirely from casas_aposta.
-- (No policy for anon role = no access)

-- Revoke column-level access to sensitive columns from anon and authenticated non-admins
REVOKE SELECT (api_token, api_auth_type, api_url_base, postback_token, postback_slug, manual_csv_path)
  ON public.casas_aposta FROM anon;

-- ── public.users ─────────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_public_read"          ON public.users;
DROP POLICY IF EXISTS "Enable read access for all" ON public.users;
DROP POLICY IF EXISTS "users_anon_read"            ON public.users;

-- Users can read their own record
CREATE POLICY "users_read_own"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

-- Admins can read all users
CREATE POLICY "users_admin_read_all"
  ON public.users
  FOR ALL
  TO authenticated
  USING (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- Admins can also write
CREATE POLICY "users_admin_write"
  ON public.users
  FOR ALL
  TO authenticated
  USING (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- Revoke sensitive columns from anon entirely
REVOKE SELECT (cpf, cnpj, pix_key, pix_key_type, data_nascimento, telefone)
  ON public.users FROM anon;

-- ── producao_dados — verify RLS is on ────────────────────────────────────────
ALTER TABLE public.producao_dados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "producao_dados_admin_all" ON public.producao_dados;

-- Admins read all
CREATE POLICY "producao_dados_admin_all"
  ON public.producao_dados
  FOR ALL
  TO authenticated
  USING (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- Users read own data
CREATE POLICY "producao_dados_user_own"
  ON public.producao_dados
  FOR SELECT
  TO authenticated
  USING (id_usuario = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- ── contratos — verify RLS is on ─────────────────────────────────────────────
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contratos_admin_all" ON public.contratos;
DROP POLICY IF EXISTS "contratos_user_own"  ON public.contratos;

CREATE POLICY "contratos_admin_all"
  ON public.contratos FOR ALL TO authenticated
  USING ((SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "contratos_user_own"
  ON public.contratos FOR SELECT TO authenticated
  USING (id_usuario = (SELECT id FROM public.users WHERE auth_id = auth.uid()));
`;

const script = `
const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.tsavvhlrnvzzmxjgrkot:Blackbox%4033225640@aws-1-sa-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});
const sql = ${JSON.stringify(SQL)};
client.connect().then(async () => {
  try {
    await client.query(sql);
    process.stdout.write('RLS policies applied.\\n');
  } catch(e) {
    process.stderr.write('ERROR: ' + e.message + '\\n');
    process.exit(1);
  }
  await client.end();
}).catch(e => { process.stderr.write(e.message + '\\n'); process.exit(1); });
`;

require('fs').writeFileSync('C:/Users/kevin/Documents/BBOX2/Projeto-Orbit/_tmp_rls.cjs', script);
try {
  const out = execSync('node C:/Users/kevin/Documents/BBOX2/Projeto-Orbit/_tmp_rls.cjs', {
    cwd: 'C:/Users/kevin/Documents/BBOX2/Projeto-Orbit',
    encoding: 'utf8',
    timeout: 30000,
  });
  process.stdout.write(out);
} catch(e) {
  process.stderr.write(e.stdout + e.stderr);
} finally {
  require('fs').unlinkSync('C:/Users/kevin/Documents/BBOX2/Projeto-Orbit/_tmp_rls.cjs');
}
