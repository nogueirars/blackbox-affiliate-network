/**
 * pagamentos.service.ts
 * Schema blackbox_influencers — sem tabela pagamentos_afiliados.
 * Retorna stubs até a lógica de pagamentos ser mapeada no novo schema.
 */

export async function getPagamentosByAfiliado(
  _afiliadoId: string,
  _opts: { tipoPerfil?: string; limit?: number } = {}
) {
  return []
}

export async function getPagamentosSumByAfiliado(
  _afiliadoId: string,
  _tipoPerfil: string
) {
  return 0
}
