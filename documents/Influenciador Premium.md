# Influenciador Premium

Programa de retenção/fidelidade para premiar quem produz muito e com qualidade. É um status automático — não é cargo, não é contrato. Destrava 2 benefícios.

---

## Critérios de qualificação

Todos os 3 precisam ser atingidos simultaneamente. Configuráveis em `/admin/premium-config` (tabela `premium_qualification_config`):

| Critério | Padrão | O que significa |
|---|---|---|
| FTDs totais | ≥ 1.000 | Soma de FTDs do influenciador em todas as casas |
| Média de depósito | ≥ R$ 100 | `valor_depositado / qtd_depositantes` |
| Média de redepósitos | ≥ 3,0 | `qtd_depositantes / ftds` (quantas vezes cada FTD voltou a depositar) |

- Critério de CPA existia mas foi removido (`criteria.cpas = true` hardcoded em `usePremiumQualification.tsx:138`).
- A avaliação usa só a produção individual do influenciador — não conta rede de gerente/intermediário.
- Se a produção cair abaixo dos critérios, ele perde o status automaticamente (não é permanente).

---

## O que ele ganha (só 2 coisas)

Definido em `premiumBenefitsData.ts`:

1. **Liberação Quinzenal** — comissões liberadas a cada 15 dias em casas parceiras, em vez do ciclo mensal padrão.
2. **Suporte Prioritário** — canal de atendimento dedicado.

Sem bônus de %, sem CPA maior, sem nada financeiro além do fluxo de caixa mais rápido.

---

## Ciclos de recebimento

### Padrão (não-Premium) — Mensal
- Produção do mês inteiro fica como `PENDENTE_LIBERACAO`.
- Vira `LIBERADO_SAQUE` no início do mês seguinte, após a casa pagar a Blackbox.
- Na prática: recebe 1x por mês.

### Premium — Quinzenal (50/50)

| Data | O que libera |
|---|---|
| Dia 16 | 50% da produção da 1ª quinzena (dias 1–15) → vira `PARCIAL_LIBERADO` |
| Dia 1 (mês seguinte) | Os outros 50% da 1ª quinzena + 50% da 2ª quinzena |
| Dia 15 | Restante da 2ª quinzena |

Resultado: dinheiro caindo a cada 15 dias em vez de esperar o mês fechar.

### Restrições do ciclo quinzenal
- Só vale para casas que pagam a Blackbox quinzenalmente — depende do acordo comercial da casa.
- Casas que pagam mensalmente continuam mensais mesmo para Premium.
- Se a casa estiver com `em_auditoria = true`, nada libera até resolver.

> Tudo isso é configurável.

---

## Como funciona na prática

- Cálculo é client-side no hook `usePremiumQualification`, avaliado toda vez que o influenciador abre o painel.
- Quando bate os 3 critérios pela primeira vez → dispara `PremiumCelebrationModal`.
- Aparece `PremiumBadge` no perfil e cards `PremiumProgressCard` mostrando quanto falta para atingir/manter.
