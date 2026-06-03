SELECT
  c.id_contrato_pai AS id_contrato,
  vg.data,
  vg.id_casa,
  sum(vg.cadastros) AS cadastros,
  sum(vg.ftds) AS ftds,
  sum(vg.valor_depositos) AS valor_depositos,
  sum(vg.redepositos) AS redepositos,
  sum(vg.valor_redepositos) AS valor_redepositos,
  sum(vg.total_depositos) AS total_depositos,
  sum(vg.cpas) AS cpas,
  sum(vg.ngr) AS ngr,
  sum(vg.total_saques) AS total_saques,
  sum(vg.valor_saques) AS valor_saques,
  round(COALESCE(max(hc_int.cpa_bruto), (0) :: numeric), 2) AS taxa_cpa_aplicada,
  round(
    COALESCE(max(hc_int.revshare_percentual), (0) :: numeric),
    2
  ) AS taxa_revshare_aplicada,
  sum((vg.lucro_liquido_cpa + vg.repasse_pago_cpa)) AS custo_repassado_cpa,
  sum(
    (
      vg.lucro_liquido_revshare + vg.repasse_pago_revshare
    )
  ) AS custo_repassado_revshare,
  sum((vg.lucro_liquido_total + vg.repasse_pago_total)) AS custo_repassado_total,
  trunc(
    COALESCE(
      (
        (
          sum(vg.cpas) * COALESCE(max(hc_int.cpa_bruto), (0) :: numeric)
        ) - sum((vg.lucro_liquido_cpa + vg.repasse_pago_cpa))
      ),
      (0) :: numeric
    ),
    2
  ) AS lucro_liquido_cpa,
  trunc(
    COALESCE(
      (
        (
          sum(vg.ngr) * (
            COALESCE(max(hc_int.revshare_percentual), (0) :: numeric) / 100.0
          )
        ) - sum(
          (
            vg.lucro_liquido_revshare + vg.repasse_pago_revshare
          )
        )
      ),
      (0) :: numeric
    ),
    2
  ) AS lucro_liquido_revshare,
  trunc(
    COALESCE(
      (
        (
          (
            sum(vg.cpas) * COALESCE(max(hc_int.cpa_bruto), (0) :: numeric)
          ) + (
            sum(vg.ngr) * (
              COALESCE(max(hc_int.revshare_percentual), (0) :: numeric) / 100.0
            )
          )
        ) - sum((vg.lucro_liquido_total + vg.repasse_pago_total))
      ),
      (0) :: numeric
    ),
    2
  ) AS lucro_liquido_total
FROM
  (
    (
      vw_producao_gerente vg
      JOIN contratos c ON ((vg.id_contrato = c.id))
    )
    JOIN historico_contratos hc_int ON (
      (
        (hc_int.id_contrato = c.id_contrato_pai)
        AND (vg.data >= hc_int.data_inicio)
        AND (
          (hc_int.data_fim IS NULL)
          OR (vg.data <= hc_int.data_fim)
        )
      )
    )
  )
WHERE
  (c.id_contrato_pai IS NOT NULL)
GROUP BY
  vg.data,
  vg.id_casa,
  c.id_contrato_pai;