/**
 * nf-validator.ts
 * Server-side validation for Brazilian Nota Fiscal (NF-e / DANFE) PDFs.
 * Extracts text via pdf-parse and checks structural NF-e patterns.
 * Error messages include extracted data so the user understands exactly what failed.
 */
import { getDocumentProxy, extractText } from 'unpdf'

export type NFValidationResult =
  | { valid: true; diagnostics: NFDiagnostics }
  | { valid: false; reason: string; diagnostics: NFDiagnostics }

export type NFDiagnostics = {
  pages: number
  textLength: number
  keywordsFound: string[]
  chaveDeAcesso: string | null
  cnpjsFound: string[]
  valoresFound: number[]
}

/** Tolerância de valor: o total do PDF deve estar a ≤5% do montante do saque */
const VALOR_TOLERANCE = 0.05

const NF_KEYWORDS = [
  'DANFE',
  'NF-E',
  'NFS-E',
  'NOTA FISCAL ELETRÔNICA',
  'NOTA FISCAL DE SERVIÇO',
  'NOTA FISCAL DE SERVICO',
  'NOTA FISCAL',
  'CHAVE DE ACESSO',
  'DOCUMENTO AUXILIAR',
]

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function maskChave(chave: string) {
  // Show first 4 and last 4 digits only: 5225...8732
  return `${chave.slice(0, 4)}...${chave.slice(-4)}`
}

/**
 * Valida um File/Buffer como Nota Fiscal eletrônica brasileira (NF-e / DANFE).
 * Retorna diagnóstico completo com dados extraídos do PDF.
 */
export async function validateNotaFiscal(
  file: File | Buffer,
  expectedMontante: number,
): Promise<NFValidationResult> {
  const diag: NFDiagnostics = {
    pages: 0,
    textLength: 0,
    keywordsFound: [],
    chaveDeAcesso: null,
    cnpjsFound: [],
    valoresFound: [],
  }

  // ── 1. Extrair texto ───────────────────────────────────────────────────────
  let text: string
  try {
    const uint8 = file instanceof File
      ? new Uint8Array(await file.arrayBuffer())
      : new Uint8Array(file)
    const pdf = await getDocumentProxy(uint8)
    diag.pages = pdf.numPages
    const { text: extracted } = await extractText(pdf, { mergePages: true })
    text = extracted
    diag.textLength = text.trim().length
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return {
      valid: false,
      diagnostics: diag,
      reason: `Não foi possível ler o PDF — o arquivo pode estar corrompido ou protegido por senha. Detalhe técnico: "${detail}".`,
    }
  }

  if (!text || text.trim().length < 50) {
    return {
      valid: false,
      diagnostics: diag,
      reason:
        `O PDF tem ${diag.pages} página(s) mas contém apenas ${diag.textLength} caracteres de texto extraível. ` +
        'PDFs gerados por scanner (imagem) não funcionam — envie o arquivo PDF original emitido pela SEFAZ ou prefeitura, que contém texto selecionável.',
    }
  }

  const normalized = text.toUpperCase().replace(/\s+/g, ' ')

  // ── 2. Keywords de NF-e ────────────────────────────────────────────────────
  diag.keywordsFound = NF_KEYWORDS.filter(kw => normalized.includes(kw))

  if (diag.keywordsFound.length === 0) {
    // Try to guess what document type it might be
    const docType = guessDocumentType(normalized)
    return {
      valid: false,
      diagnostics: diag,
      reason:
        `O PDF não contém nenhuma das palavras-chave esperadas em uma Nota Fiscal ` +
        `(DANFE, NF-e, NFS-e, "Nota Fiscal Eletrônica", "Chave de Acesso", etc.)` +
        (docType ? ` — o documento parece ser um(a) ${docType}` : '') +
        '. Envie o DANFE ou NFS-e emitido pela SEFAZ/prefeitura.',
    }
  }

  // ── 3. Chave de Acesso (44 dígitos consecutivos) ───────────────────────────
  const digitStripped = text.replace(/[\s.\-]/g, '')
  const chaveMatch = digitStripped.match(/\d{44}/)

  if (chaveMatch) {
    diag.chaveDeAcesso = chaveMatch[0]
  } else {
    // Find longest digit run to give a hint
    const longestRun = (digitStripped.match(/\d+/g) ?? [])
      .reduce((a, b) => (b.length > a.length ? b : a), '')
    const hint = longestRun.length >= 10
      ? ` A maior sequência numérica encontrada tem ${longestRun.length} dígitos (esperado: 44).`
      : ''
    return {
      valid: false,
      diagnostics: diag,
      reason:
        `Chave de Acesso com 44 dígitos não encontrada no PDF.${hint} ` +
        'Verifique se o arquivo enviado é o DANFE completo (não apenas uma página) e não está truncado.',
    }
  }

  // ── 4. CNPJ presente e estruturalmente válido ──────────────────────────────
  const cnpjRaw = [...text.matchAll(/\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[\/\s]?\d{4}[-\s]?\d{2}/g)]
  const allCnpjs = cnpjRaw.map(m => m[0].replace(/\D/g, ''))
  const validCnpjs = allCnpjs.filter(isCnpjValid)
  const invalidCnpjs = allCnpjs.filter(c => !isCnpjValid(c))

  diag.cnpjsFound = validCnpjs

  if (validCnpjs.length === 0) {
    if (invalidCnpjs.length > 0) {
      const samples = invalidCnpjs.slice(0, 3).map(formatCnpj).join(', ')
      return {
        valid: false,
        diagnostics: diag,
        reason:
          `${invalidCnpjs.length} número(s) no formato CNPJ foram encontrados, mas nenhum passou na validação dos dígitos verificadores: ${samples}. ` +
          'O PDF pode estar com dados corrompidos ou ser um documento inválido.',
      }
    }
    return {
      valid: false,
      diagnostics: diag,
      reason:
        'Nenhum CNPJ foi encontrado no PDF. Uma Nota Fiscal válida deve conter ao menos o CNPJ do emitente. ' +
        'Verifique se o arquivo está completo.',
    }
  }

  // ── 5. Valor total aproximado ──────────────────────────────────────────────
  const valoresResult = extractValores(text)
  diag.valoresFound = valoresResult

  if (valoresResult.length > 0) {
    const tolerance = expectedMontante * VALOR_TOLERANCE
    const match = valoresResult.some(v => Math.abs(v - expectedMontante) <= tolerance)

    if (!match) {
      // Find the closest value to expected
      const closest = valoresResult.reduce((a, b) =>
        Math.abs(b - expectedMontante) < Math.abs(a - expectedMontante) ? b : a
      )
      const diff = closest - expectedMontante
      const diffStr = diff > 0
        ? `${fmt(Math.abs(diff))} a mais`
        : `${fmt(Math.abs(diff))} a menos`

      const allFmt = valoresResult
        .slice(0, 5)
        .sort((a, b) => b - a)
        .map(fmt)
        .join(', ')

      return {
        valid: false,
        diagnostics: diag,
        reason:
          `O valor do saque é ${fmt(expectedMontante)}, mas nenhum valor no PDF corresponde a esse montante (tolerância ±5%). ` +
          `Valor mais próximo encontrado: ${fmt(closest)} (${diffStr}). ` +
          `Todos os valores detectados no PDF: ${allFmt}. ` +
          'A NF deve ser emitida pelo valor exato do saque.',
      }
    }
  }

  return { valid: true, diagnostics: diag }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function isCnpjValid(digits: string): boolean {
  if (digits.length !== 14) return false
  if (/^(\d)\1+$/.test(digits)) return false

  const calc = (d: string, weights: number[]) =>
    weights.reduce((s, w, i) => s + parseInt(d[i]) * w, 0)

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const r1 = calc(digits, w1) % 11
  const d1 = r1 < 2 ? 0 : 11 - r1

  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const r2 = calc(digits, w2) % 11
  const d2 = r2 < 2 ? 0 : 11 - r2

  return parseInt(digits[12]) === d1 && parseInt(digits[13]) === d2
}

function formatCnpj(d: string): string {
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

function extractValores(text: string): number[] {
  const candidates: number[] = []

  // Brazilian format: 1.234,56
  for (const m of text.matchAll(/\b(\d{1,3}(?:\.\d{3})*),(\d{2})\b/g)) {
    const val = parseFloat(m[1].replace(/\./g, '') + '.' + m[2])
    if (!isNaN(val) && val > 0) candidates.push(val)
  }

  // US format fallback: 1234.56
  for (const m of text.matchAll(/\b(\d+)\.(\d{2})\b/g)) {
    const val = parseFloat(m[1] + '.' + m[2])
    if (!isNaN(val) && val > 0) candidates.push(val)
  }

  return [...new Set(candidates)]
}

function guessDocumentType(normalized: string): string | null {
  if (normalized.includes('BOLETO') || normalized.includes('CEDENTE')) return 'boleto bancário'
  if (normalized.includes('RECIBO')) return 'recibo'
  if (normalized.includes('CONTRATO')) return 'contrato'
  if (normalized.includes('PROPOSTA')) return 'proposta comercial'
  if (normalized.includes('COMPROVANTE')) return 'comprovante'
  if (normalized.includes('EXTRATO')) return 'extrato'
  if (normalized.includes('FATURA')) return 'fatura'
  if (normalized.includes('DECLARACAO') || normalized.includes('DECLARAÇÃO')) return 'declaração'
  return null
}

// Re-export maskChave for use in admin panels if needed
export { maskChave }
