SELECT
  pd.id_contrato,
  pd.data,
  pd.id_casa,
  COALESCE(sum(pd.cadastros), (0) :: bigint) AS cadastros,
  COALESCE(sum(pd.ftds), (0) :: bigint) AS ftds,
  round(
    COALESCE(sum(pd.valor_depositos), (0) :: numeric),
    2
  ) AS valor_depositos,
  COALESCE(sum(pd.redepositos), (0) :: bigint) AS redepositos,
  round(
    COALESCE(sum(pd.valor_redepositos), (0) :: numeric),
    2
  ) AS valor_redepositos,
  COALESCE(sum(pd.total_depositos), (0) :: bigint) AS total_depositos,
  COALESCE(sum(pd.cpas), (0) :: bigint) AS cpas,
  round(COALESCE(sum(pd.ngr), (0) :: numeric), 2) AS ngr,
  COALESCE(sum(pd.total_saques), (0) :: bigint) AS total_saques,
  round(COALESCE(sum(pd.valor_saques), (0) :: numeric), 2) AS valor_saques,
  round(COALESCE(max(hc.cpa_bruto), (0) :: numeric), 2) AS taxa_cpa_aplicada,
  round(
    COALESCE(max(hc.revshare_percentual), (0) :: numeric),
    2
  ) AS taxa_revshare_aplicada,
  trunc(
    COALESCE(
      sum(
        (
          (pd.cpas) :: numeric * COALESCE(hc.cpa_bruto, (0) :: numeric)
        )
      ),
      (0) :: numeric
    ),
    2
  ) AS receita_cpa_calculada,
  trunc(
    COALESCE(
      sum(
        (
          pd.ngr * (
            COALESCE(hc.revshare_percentual, (0) :: numeric) / 100.0
          )
        )
      ),
      (0) :: numeric
    ),
    2
  ) AS receita_revshare_calculada,
  trunc(
    COALESCE(
      (
        sum(
          (
            (pd.cpas) :: numeric * COALESCE(hc.cpa_bruto, (0) :: numeric)
          )
        ) + sum(
          (
            pd.ngr * (
              COALESCE(hc.revshare_percentual, (0) :: numeric) / 100.0
            )
          )
        )
      ),
      (0) :: numeric
    ),
    2
  ) AS receita_total_calculada
FROM
  (
    (
      (
        producao_dados pd
        JOIN contratos c ON ((pd.id_contrato = c.id))
      )
      JOIN user_roles ur ON ((c.id_user_role = ur.id))
    )
    JOIN historico_contratos hc ON (
      (
        (hc.id_contrato = c.id)
        AND (pd.data >= hc.data_inicio)
        AND (
          (hc.data_fim IS NULL)
          OR (pd.data <= hc.data_fim)
        )
      )
    )
  )
WHERE
  (ur.role = 'AFILIADO' :: user_role)
GROUP BY
  pd.data,
  pd.id_casa,
  pd.id_contrato;