# Blackbox Agency

Plataforma de gestão de afiliados multi-nível administrada pela Blackbox.

---

## Perfis de usuário

Existem dois painéis distintos: o **painel da Blackbox** (admin) e o **painel do usuário**.

### Painel do usuário

Um usuário pode acumular mais de um perfil ao mesmo tempo. Cada perfil dá acesso a funcionalidades e informações diferentes, então a separação visual no dashboard/sidebar deve mostrar apenas o que é relevante para cada perfil ativo.

- **Influenciador** — divulga o link de cadastro, gera tráfego e registros nas casas de apostas. Recebe comissão por RevShare, FTD, QFTD e registration.
- **Gerente** — indica e gerencia influenciadores. Ganha em cima da produção da rede de influenciadores que trouxe.
- **Intermediário** — traz gerentes para a plataforma. Está acima do gerente na cadeia, ganha em cima da produção da rede de gerentes que trouxe.

Um mesmo usuário pode ser influenciador, gerente e intermediário simultaneamente.

### Painel Admin (Blackbox)

O admin tem acesso completamente separado — não é um perfil que convive com os demais. É o painel de gestão geral da Blackbox: gerencia saques, usuários, casas de apostas, CNPJs, contratos e auditorias.

---

## Hierarquia (UI vs Banco de Dados)

A nomenclatura da UI **não bate** com o nome no banco — isso já causou bugs.

| Nível | Nome na UI | Nome no banco (`app_role`) |
|-------|-----------|---------------------------|
| 1 | Administrador | `admin` |
| 2 | Intermediário | `gerente` |
| 3 | Gerente | `intermediario` (legado: `master`) |
| 4 | Influenciador | `influencer` / `afiliado` |

Ao consultar dados do Gerente (nível 3), sempre usar `.in('tipo_perfil', ['gerente', 'master'])` por causa de registros legados.

---

## Casas de Apostas

Cada casa de apostas define seus próprios limiares e valores de recompensa. Os eventos que geram comissão são:

- **FTD** (First Time Deposit) — apostador que gastou acima do limiar da casa (ex: R$ 15)
- **QFTD** (Qualified FTD) — apostador que gastou acima de um limiar maior (ex: R$ 50)
- **Registration Share** — novo usuário registrado na casa
- **RevShare** — comissão percentual em cima do que o apostador perdeu (gasto na casa)

Cada casa configura:
1. O limiar de valor para cada evento (ex: FTD = R$15, QFTD = R$50)
2. O valor de recompensa para cada evento (ex: R$5 de bônus por FTD, R$3 por registration)

Quem recebe essas recompensas é o influenciador (e quem está acima dele na cadeia) — não o usuário da plataforma. O "usuário" aqui é o apostador que foi trazido pelo influenciador.

---

## Modelos de comissão

- **CPA** — valor fixo por FTD (primeiro depósito)
- **RevShare** — percentual da receita líquida da casa

---

## CNPJ e Faturamento

Cada casa de apostas é atrelada a um CNPJ para fins de faturamento. O CNPJ define a entidade financeira responsável por aquela casa.

- Relação **1:N** — um CNPJ pode estar em várias casas, mas cada casa tem apenas um CNPJ.
- O CNPJ determina o vínculo financeiro: qual entidade recebe e paga o faturamento daquela casa.
- É possível cadastrar novos CNPJs na plataforma.

---

## Financeiro do usuário

O saldo do usuário é separado por casa de apostas. Cada casa tem seu próprio saldo acumulado.

Na hora de sacar, o usuário vê o saldo discriminado por casa. Ele pode:
- Sacar de uma casa específica — mas o valor é sempre o saldo cheio daquela casa, não um valor parcial
- Sacar tudo de uma vez (todas as casas juntas)

O total exibido é a soma de todas as casas. Pode haver uma pequena diferença entre a soma individual das casas e o total, devido a ajustes de arredondamento ou compensações cruzadas.

Na solicitação de saque o usuário informa o CNPJ para recebimento.

Cada casa tem uma data específica de liberação de saque. Mesmo que o usuário tenha saldo disponível, ele só pode sacar daquela casa quando ela estiver apta — ou seja, quando a data de liberação for atingida.

---

## Notas adicionais

<!-- novas informações vão sendo adicionadas aqui -->
