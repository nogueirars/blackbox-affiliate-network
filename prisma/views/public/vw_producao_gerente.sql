SELECT
  c.id_contrato_pai AS id_contrato,
  vi.data,
  vi.id_casa,
  sum(vi.cadastros) AS cadastros,
  sum(vi.ftds) AS ftds,
  sum(vi.valor_depositos) AS valor_depositos,
  sum(vi.redepositos) AS redepositos,
  sum(vi.valor_redepositos) AS valor_redepositos,
  sum(vi.total_depositos) AS total_depositos,
  sum(vi.cpas) AS cpas,
  sum(vi.ngr) AS ngr,
  sum(vi.total_saques) AS total_saques,
  sum(vi.valor_saques) AS valor_saques,
  round(COALESCE(max(hc_ger.cpa_bruto), (0) :: numeric), 2) AS taxa_cpa_aplicada,
  round(
    COALESCE(max(hc_ger.revshare_percentual), (0) :: numeric),
    2
  ) AS taxa_revshare_aplicada,
  sum(vi.receita_cpa_calculada) AS repasse_pago_cpa,
  sum(vi.receita_revshare_calculada) AS repasse_pago_revshare,
  sum(vi.receita_total_calculada) AS repasse_pago_total,
  trunc(
    COALESCE(
      (
        (
          sum(vi.cpas) * COALESCE(max(hc_ger.cpa_bruto), (0) :: numeric)
        ) - sum(vi.receita_cpa_calculada)
      ),
      (0) :: numeric
    ),
    2
  ) AS lucro_liquido_cpa,
  trunc(
    COALESCE(
      (
        (
          sum(vi.ngr) * (
            COALESCE(max(hc_ger.revshare_percentual), (0) :: numeric) / 100.0
          )
        ) - sum(vi.receita_revshare_calculada)
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
            sum(vi.cpas) * COALESCE(max(hc_ger.cpa_bruto), (0) :: numeric)
          ) + (
            sum(vi.ngr) * (
              COALESCE(max(hc_ger.revshare_percentual), (0) :: numeric) / 100.0
            )
          )
        ) - sum(vi.receita_total_calculada)
      ),
      (0) :: numeric
    ),
    2
  ) AS lucro_liquido_total
FROM
  (
    (
      vw_producao_influencer vi
      JOIN contratos c ON ((vi.id_contrato = c.id))
    )
    JOIN historico_contratos hc_ger ON (
      (
        (hc_ger.id_contrato = c.id_contrato_pai)
        AND (vi.data >= hc_ger.data_inicio)
        AND (
          (hc_ger.data_fim IS NULL)
          OR (vi.data <= hc_ger.data_fim)
        )
      )
    )
  )
WHERE
  (c.id_contrato_pai IS NOT NULL)
GROUP BY
  vi.data,
  vi.id_casa,
  c.id_contrato_pai;