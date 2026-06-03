CREATE OR REPLACE VIEW vw_producao_influencer AS
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

CREATE OR REPLACE VIEW vw_producao_gerente AS
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

CREATE OR REPLACE VIEW vw_producao_intermediario AS
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
