# Sistema Blackbox — Acordos, Contratos, Cascata e Ganhos

Documento de referência consolidando o funcionamento do sistema de afiliados (acordos, contratos, hierarquia, cálculo de comissões, taxas e ganhos da Blackbox).

---

## 1. Hierarquia e Papéis

O sistema tem 4 papéis (roles):

- **Admin (Blackbox)** — opera o sistema, cria casas, contratos e usuários.
- **Intermediário** (nome interno no DB: `master` / `afiliado_master`) — topo da rede comercial. Pode ter Gerentes abaixo.
- **Gerente** (`gerente`) — fica entre Intermediário e Influenciador. Pode ter Influenciadores abaixo.
- **Influenciador** (nome interno no DB: `afiliado` / `sub`) — quem efetivamente divulga e gera produção.

> **Importante de nomenclatura:** na UI usa-se SEMPRE "Intermediário" e "Influenciador". No código/DB ainda aparece `master` e `sub-afiliado` por legado.

### Quem define o papel?
**O admin atribui o papel**, não o usuário. Quando alguém se cadastra em `/auth`, vira `profile` com `status = 'pendente'` e role default `influenciador`. O admin promove para Gerente ou Intermediário conforme necessário.

### Combinações de papéis permitidas
- ✅ `gerente + afiliado_master` (Gerente que também é Intermediário — dual-role)
- ❌ `afiliado + afiliado_master` (proibido — conflito de hierarquia)

---

## 2. As 3 Cadeias Possíveis

```
1) BLACKBOX → INTERMEDIÁRIO → GERENTE → INFLUENCIADOR    (cadeia completa, 4 níveis)
2) BLACKBOX → GERENTE → INFLUENCIADOR                    (sem intermediário)
3) BLACKBOX → INFLUENCIADOR                              (direto, sem rede)
```

Cada nível ganha a **margem** (diferença entre o que recebe e o que repassa). Quem está no topo da cadeia recebe direto da Blackbox.

---

## 3. Casas de Apostas — Campos-chave

Tabela `casas_apostas`:

| Campo | Significado |
|---|---|
| `valor_cpa_casa` | Quanto a CASA paga por CPA (FTD qualificado) para a Blackbox |
| `cpa_max_repasse` | Teto máximo de CPA que a Blackbox aceita repassar à rede |
| `revshare_house` | % de RevShare que a CASA paga à Blackbox |
| `revshare_max_repasse` | Teto máximo de RevShare que a Blackbox aceita repassar |
| `entidade_id` | Entidade faturadora (Black Box Digital ou Affiscale) |
| `em_auditoria` | Se true, produção fica retida (não libera) |
| `integration_type` | api / manual / hybrid |

A diferença entre `valor_cpa_casa` e o contrato do topo da rede é a **margem da Blackbox**.

---

## 4. Contratos (Tabelas no DB)

| Tabela | Quem assina |
|---|---|
| `contratos_afiliados` | Blackbox/Gerente/Intermediário ↔ Influenciador |
| `contratos_gerente` | Blackbox/Intermediário ↔ Gerente |
| `contratos_master` | Blackbox ↔ Intermediário (também recebe cópia automática quando Gerente é dual-role) |

Campos de todos:
- `tipo_comissao` (`CPA` ou `REVSHARE`)
- `valor_cpa` (R$ fixo por CPA)
- `percentual_revshare` (% sobre RevShare)
- `data_inicio` / `data_fim` (controle de versão temporal)

### Versionamento (CRÍTICO)
- **Nunca editar um contrato existente** — fecha o atual (`data_fim`) e cria novo (`data_inicio`).
- Contrato ativo = `data_fim IS NULL`.
- Cada produção é avaliada contra o contrato vigente na sua `data_referencia` (timestamped match).
- Se não houver match exato → fallback para o contrato mais recente.

### Trava de cascata (Commission Cascade Lock)
Subordinado **nunca** pode ter margem maior que seu superior direto. Validação ocorre na criação do contrato.

### Dual-role sync
Se usuário tem role `gerente + afiliado_master`, ao criar contrato de Intermediário o sistema **auto-copia** para `contratos_gerente` aplicando 95% do valor.

### Rate limit
Apenas **1 edição de contrato por dia por casa por usuário** (RPC validation).

---

## 5. Distribuição de Comissão (Cascata)

Quando um Influenciador gera 1 CPA + RevShare:

1. **API sincroniza** produção → `producao_afiliados` (status_financeiro = `PENDENTE_LIBERACAO`).
2. **Imposto da entidade** é aplicado primeiro sobre o RevShare (14,5% Black Box Digital, 0% Affiscale).
3. **Cascata calcula cada margem** baseada no contrato vigente naquela data:
   - Influenciador recebe o valor do seu contrato.
   - Gerente recebe (contrato_gerente − contrato_influenciador).
   - Intermediário recebe (contrato_intermediario − contrato_gerente).
   - Blackbox fica com (valor_casa − contrato_intermediario).

### Exemplo numérico
Casa Betano paga: **R$ 300 CPA + 40% RevShare**, entidade = Black Box Digital (14,5%)
Cadeia: Intermediário (R$ 280 + 35%) → Gerente (R$ 260 + 30%) → Influenciador (R$ 200 + 20%)

Para 1 CPA + R$ 1.000 RevShare (R$ 855 após imposto):

| Quem | CPA | RevShare | Total |
|---|---|---|---|
| Influenciador | R$ 200 | R$ 171 (20%) | R$ 371 |
| Gerente (margem) | R$ 60 | R$ 85,5 (10%) | R$ 145,5 |
| Intermediário (margem) | R$ 20 | R$ 42,75 (5%) | R$ 62,75 |
| **Blackbox (margem topo)** | **R$ 20** | **R$ 42,75 (5%)** | **R$ 62,75** |
| **Imposto Black Box Digital** | — | **R$ 145** | **R$ 145** |
| **TOTAL pago pela casa** | R$ 300 | R$ 400 | R$ 700 |

---

## 6. Ganho da Blackbox

Não existe "% fixa Blackbox". Os ganhos vêm de 3 fontes:

1. **Margem entre `valor_cpa_casa`/`revshare_house` e o contrato do topo da rede** — fonte principal.
2. **Imposto retido na entidade Black Box Digital (14,5%)** — só sobre RevShare, cobre PJ/operação.
3. **Quando não há topo (cadeia direta com Influenciador)** — toda a diferença vai para Blackbox.

### O que NÃO existe
- Nenhum % "Blackbox = X%" configurável na UI.
- Nenhuma linha de pagamento Blackbox em `pagamentos_afiliados`.
- Nenhum dashboard direto "Lucro Blackbox por casa".
- FTD/QFTD/Cadastros **NÃO** geram receita — são só métricas. Monetização vem apenas de **CPA** e **RevShare**.

---

## 7. Taxas da Entidade Faturadora

| Entidade | Taxa | Quando usar |
|---|---|---|
| **Black Box Digital** | **14,5%** | Padrão maioria das casas |
| **Affiscale** | **0%** | Casos sem retenção fiscal |

- Aplicada **antes** de qualquer divisão de margem.
- **Só incide sobre RevShare**, nunca sobre CPA.
- Se mudar `tax_rate` retroativamente → roda `recalculate-commissions`.

---

## 8. Status Financeiro (Liberação)

Cada item de produção tem `status_financeiro`:

| Status | Fator |
|---|---|
| `PENDENTE_LIBERACAO` | 0 (não saca) |
| `PARCIAL_LIBERADO` | 0,5 (50%) |
| `LIBERADO_SAQUE` | 1,0 (100%) |

### Regra de liberação quinzenal (50/50)
- Dia **16**: libera 50% do que foi produzido na 1ª quinzena.
- Dia **1º**: libera 50% do que foi produzido na 2ª quinzena anterior.
- Dia **15**: libera os 50% remanescentes.

### Default obrigatório
Toda produção nova entra como `PENDENTE_LIBERACAO`. Nunca pular esse status.

---

## 9. Contratos Retroativos

Quando edita um contrato e quer aplicar para produção **passada**:

1. Fecha o contrato atual (`data_fim`).
2. Cria novo com `data_inicio` antiga (no passado).
3. Roda edge function `recalculate-commissions`.
4. Sistema reprocessa cada `producao_afiliados` aplicando o contrato vigente em cada `data_referencia`.

UI: tela de **Acordos** → modal `AcorreReajusteModal`.

⚠️ Saldo já pago (`pagamentos_afiliados`) **não é estornado** — o recálculo só afeta produção `PENDENTE` ou `PARCIAL`. Para clawback total usa estorno manual.

---

## 10. Fluxo Operacional para Subir um Novo Influenciador

```
1. Admin cria Intermediário (se ainda não existe)  →  contrato Blackbox↔Intermediário
2. Admin cria Gerente sob esse Intermediário        →  contrato Intermediário↔Gerente
3. Admin cria Influenciador sob o Gerente           →  contrato Gerente↔Influenciador
4. Sistema cria vínculos em afiliados_master_sub + gerentes_masters
5. Gera affcustomid único                           →  influenciador começa a divulgar
6. API sincroniza produção diariamente              →  cascata calcula sozinha
7. Quinzenal libera 50% / 100%                      →  influenciador solicita saque
```

---

## 11. Saques

- Calculados via edge function `get-saldo-soberano` (única fonte da verdade).
- Isolamento estrito por **perfil + entidade faturadora**:
  - Influenciador e Intermediário têm saldos completamente separados.
  - Cada entidade (Black Box Digital, Affiscale) tem saldo próprio.
- Fórmula: `Saldo = Comissão Liberada − Total Pago − Saques Ativos`
- **1 saque ativo por perfil por entidade** (limit concorrência).
- Saldo negativo aparece como tal (sem flooring) e é compensado em saques futuros.

---

## 12. Casas em Auditoria

Quando casa entra em auditoria (`em_auditoria = true`):
- Toda produção dela fica **retida** (não libera).
- Aparece em card "Em auditoria" separado.
- **NÃO** é absorvida por outras casas saudáveis da mesma entidade.

---

## 13. Programas de Incentivo

Sistema paralelo de campanhas pontuais:
- Tabela: `programas_incentivo`, `programas_incentivo_participantes`, `producao_incentivo`.
- Tipos de gatilho: `FTD`, `CPA`, `REGISTRO`.
- Define comissões fixas: `comissao_influencer`, `comissao_gerente`, `comissao_intermediador`.
- Para casas manuais, cada participante recebe link/afp individual de tracking.

---

## 14. Convenções Críticas (NÃO esquecer)

- **Timezone**: sempre `America/Sao_Paulo`.
- **Contratos ativos**: filtrar `data_fim IS NULL`.
- **Edge Functions**: retornar HTTP 200 com `{success, error?}`.
- **Edge Functions com service_role**: `persistSession: false`, `autoRefreshToken: false`.
- **Queries não-admin**: usar `casas_apostas_public` (não `casas_apostas`) para evitar bloqueio RLS de api_token.
- **Paginação**: `fetchWithBatchedIn` para IN > 200 IDs.
- **Estorno**: reduz produção diretamente no DB; pode resultar em comissão negativa (prejuízo legítimo).
- **Recálculo**: rodar `recalculate-commissions` após import CSV ou edição retroativa.

---

## 15. Regras de Negócio — Contratos de Repasse (Gerente)

### Estrutura
- Gerente possui contratos diretos com as casas ("acordos") — somente admin edita esses.
- Gerente cria **sub-contratos de repasse** para cada influencer da sua rede, vinculados a um acordo.
- Influencer da rede = `public_users WHERE id_gerente = gerente.id AND role = INFLUENCER`.

### Tetos de repasse
- CPA do influencer ≤ CPA do gerente naquele acordo.
- RevShare do influencer ≤ RevShare do gerente naquele acordo.
- Validado no backend em toda operação de criação ou alteração.

### Data de vigência
- Obrigatória em toda alteração.
- Deve ser **a partir de amanhã** — hoje nunca é permitido.
- Motivo: o `data_fim` do histórico anterior é `data_inicio - 1 dia`; permitir hoje criaria um gap ou sobrescreveria o dia corrente.

### Criação de novo período (`historico_contratos`)
1. Fecha o histórico ativo atual: `ativo = false`, `data_fim = data_inicio - 1`.
2. Insere novo histórico: `ativo = true`, `data_inicio` = data escolhida, novos valores.

### Edição de período futuro (otimização)
- Se o histórico ativo tem `data_inicio > hoje` **E** `data_inicio == data_inicio enviada`:
  - Apenas atualiza os valores (CPA / RevShare) no registro existente.
  - Não cria novo registro, não mexe em `data_fim` do anterior.
- Caso contrário: fluxo normal de criação acima.

### Reajuste em Massa
- Gerente seleciona N influencers de um acordo.
- Define novos valores de CPA e/ou RevShare (campos opcionais — branco = mantém atual).
- Uma única data de vigência aplica-se a todos os selecionados.
- Mesma lógica de período futuro por influencer (update in-place se mesma data futura).
- Se um sub-contrato falhar, os demais continuam sendo processados (`afetados` retorna quantos foram bem-sucedidos).

---

## 16. Glossário Rápido

- **CPA**: Cost Per Action — valor fixo pago por FTD qualificado.
- **FTD**: First Time Deposit — primeiro depósito.
- **QFTD**: Qualified FTD — FTD que cumpriu meta (varia por casa).
- **RevShare**: % sobre receita líquida da casa (NGR).
- **NGR**: Net Gaming Revenue — depósitos − saques − bônus − impostos.
- **GGR**: Gross Gaming Revenue — apostas − prêmios.
- **affcustomid**: ID único do influenciador rastreado pela API da casa.
- **Cascata**: cadeia de repasses Blackbox → Intermediário → Gerente → Influenciador.
