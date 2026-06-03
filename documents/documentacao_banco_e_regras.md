# 📊 Arquitetura do Banco de Dados e Regras de Negócio — Project Orbit

Este documento consolida a estrutura do banco de dados (`schema.prisma`) com as diretrizes e lógicas descritas no documento de regras de negócio (`regra-de-negocio.txt`). A ideia é ter uma visão unificada e completa de como os dados interagem com as lógicas comerciais da plataforma.

---

## 👥 1. Hierarquia de Usuários (A Nomenclatura Crítica)

O sistema possui quatro níveis de hierarquia. Contudo, **existe uma diferença fundamental entre a nomenclatura do banco de dados e a nomenclatura canônica usada na UI**. Essa diferença é um ponto sensível e fonte de bugs herdados:

| Nível Hierárquico | Nome na UI (Canônico) | Nome no Banco de Dados (`app_role` / Tabelas) | Descrição do Papel |
| :--- | :--- | :--- | :--- |
| **Nível 1** | Administrador | `admin` | Controle total, gerencia saques, entidades, pagamentos e auditorias. Pode impersonar contas. |
| **Nível 2** | Intermediário | `gerente` | Gerencia uma rede de gerentes (nível master real do sistema). |
| **Nível 3** | Gerente | `intermediario` (ou `master` em logs/pagamentos legados) | Gerencia influenciadores/sub-afiliados. Retém um lucro baseado em um spread do contrato. |
| **Nível 4** | Influenciador | `influencer` / `afiliado` | Sub-afiliado na ponta, que divulga o link, gera tráfego, cadastros e FTDs. |

> [!WARNING]
> Cuidado ao consumir dados de tabelas como `pagamentos_afiliados` e `saques`. Muitos registros legados foram salvos com o campo `tipo_perfil = 'master'`. Nas consultas para o perfil de Gerente, sempre faça `.in('tipo_perfil', ['gerente', 'master'])`.

---

## 🗄️ 2. Divisão de Schemas (`auth` vs `public`)

Para segurança e isolamento, o banco utiliza a arquitetura multischema do PostgreSQL / Supabase:

*   **Schema `auth`**: Focado estritamente na autenticação de acessos. Contém tabelas de suporte do Supabase como `users`, `identities`, MFA e Single Sign-On (SSO).
*   **Schema `public`**: Contém todo o domínio comercial da aplicação.

Existe um vínculo de `1:1` entre a tabela `auth.users` e `public.profiles`. A tabela `profiles` gerencia os status de aprovação, IDs dos masters (`gerente_id`), campanhas, links de redes sociais e flags de monitoramento de cada parceiro.

---

## 💰 3. Comissões e Estrutura de Contratos Multi-Nível

A plataforna permite comissionamentos de **CPA (Cost Per Acquisition)** e **Revenue Share**. A distribuição dos valores ocorre em cascata através de tabelas específicas de contrato (`contratos_afiliados`, `contratos_gerente`, `contratos_intermediario`, `contratos_sub_afiliados`).

### Fórmulas Base
- **CPA**: `Comissão = Qtd. CPAs × valor_cpa`
- **RevShare**: A casa de apostas possui uma `tax_rate` (ex: 14,5% de imposto retido). 
  - `Receita Líquida = receita_revshare_casa × (1 - tax_rate)`
  - `Comissão = Receita Líquida × (percentual_revshare / 100)`

> [!TIP]
> **Versionamento Rigoroso**: Os contratos possuem `data_inicio` e `data_fim`. Uma produção histórica utilizará o valor do contrato **vigente na data de referência** da produção, não sendo afetada caso o contrato atual seja alterado.

### O Fluxo "Cascade Lock" (Repasses em Cadeia)
Através da tabela `commission_ledger`, o valor unificado repassado pela casa de apostas é "fatiado":
1. O Influenciador ganha a comissão do seu sub-contrato.
2. O Gerente retém o spread (Lucro de Rede) deduzindo o que repassou ao influenciador.
3. O Intermediário possui uma trava: ele nunca repassa ao Gerente (Master) um valor superior ao que ele ganha da Casa de Apostas (`MIN(valorContratoMaster, valorContratoIntermedario)`).

---

## 📊 4. Produção, Liberação e Saldo Financeiro

A produção dos links (rastreados por `affiliate_links` e `link_clicks`) e as conversões são sincronizadas diariamente e caem na tabela `producao_afiliados`.

### Status Financeiro (A Regra do Fator Multiplicador)
Cada linha de produção tem um fator de liberação determinado pelos prazos acordados com a Casa de Apostas:
- `PENDENTE_LIBERACAO` (Fator 0.0) → Bloqueado
- `PARCIAL_LIBERADO` (Fator 0.5) → 50% somado ao saldo
- `LIBERADO_SAQUE` (Fator 1.0) → 100% somado ao saldo disponível

### Fórmulas do Saldo Disponível (Backend)

> [!IMPORTANT]
> O Backend é a **única fonte da verdade** para o saldo do usuário. Valores não devem ser repassados e cacheados pelo frontend durante o fluxo de saque.

- **Para o Influenciador:** 
  `Saldo = Comissões Liberadas - Pagamentos Recebidos - Estornos (Débitos de casas) - Saques Ativos`
- **Para o Gerente:**
  `Saldo = Comissões Próprias + (Produção da Rede - Repasse pago à Rede) + Bônus de Incentivo - Consumo - Saques Ativos`

*Nota sobre estornos*: Estornos são chargebacks. Eles não excluem pagamentos, eles **são somados aos débitos** (funcionam como um saque que reduz o saldo positivo futuro).

---

## 🏢 5. Multi-CNPJ (Isolamento por Entidades de Faturamento)

Devido ao aspecto *White Label* ou parcerias pulverizadas, uma única conta pode trabalhar com Casas de Apostas ligadas a **CNPJs distintos** (Tabela `entidades_faturamento`). 

**Regras estritas:**
- Uma carteira não contamina outra. Se a conta está negativa no CNPJ X por um alto índice de estornos, isso não impede que ela saque saldos do CNPJ Y.
- Saldo por Entidade: A fórmula de saldo é aplicada filtrando estritamente pela produção daquela entidade, deduzindo os saques e pagamentos atrelados àquela entidade (`entidade_id`).

---

## 🏦 6. O Fluxo de Saques e Bloqueios Financeiros

Quando o afiliado clica para sacar, um fluxo seguro é iniciado na tabela `saques`:
1. Validação do `entidade_id` (a qual CNPJ pertence o saque).
2. Servidor gera o saldo com `pg_advisory_xact_lock` no nível do banco ou API para evitar duplo gasto/race conditions.
3. Criação do saque reservando o valor. Os status passam por uma esteira: `pendente` → `aprovado` → `nf_pendente` → `nf_enviada` → `pago`.
4. Os pagamentos e estornos finais são salvos na tabela `pagamentos_afiliados`.

> [!CAUTION]
> **Casas em Auditoria:** Se uma casa possui `em_auditoria = true` na tabela `casas_apostas`, toda a produção da mesma fica estagnada e retida, não sendo contabilizada nos saldos livres de saque, a fim de proteger o fluxo de caixa.

---

## ⚙️ 7. Sincronização, Campanhas e Gamificação

*   **Sincronização (`sync_job_queue`, `postback_logs`)**: Jobs periódicos em lotes consumindo APIs de casas parceiras.
*   **Recálculo de Comissões**: Um RPC / endpoint pode reprocessar um bloco histórico, atualizando apenas os spreads em `commission_ledger` caso contratos retroativos entrem em vigor.
*   **Gamificação (`programas_incentivo`, `campanhas_promocionais`)**: Sistemas de metas onde, se o influenciador bater um threshold de FTDs, a aplicação gera uma produção extra na tabela separada de comissões de incentivo (`producao_incentivo`), influenciando também o saldo do gerente.

---

## 💡 Recomendações e Melhorias Essenciais Aplicadas na Arquitetura:
1. Ao atualizar o painel do gerente com pagamentos legados, usar a busca `.in('tipo_perfil', ['gerente', 'master'])` para evitar inflacionamento incorreto de saldos.
2. Na hora de calcular o `consumidoEntidade`, garantir que o valor reservado (`saques ativos` daquela entidade) também seja subtraído imediatamente no calculo pré-saque.
3. Nunca renomear enumerações ou strings hard-coded de perfis sem um migrator rodando em background para normalizar a base.
