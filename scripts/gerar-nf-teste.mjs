/**
 * Gera um PDF de NF-e de teste que passa na validação do nf-validator.
 * Uso: node scripts/gerar-nf-teste.mjs [valor]
 * Exemplo: node scripts/gerar-nf-teste.mjs 1500.00
 */
import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Argumentos ────────────────────────────────────────────────────────────────
const valor = parseFloat(process.argv[2] ?? '1000.00')
if (isNaN(valor) || valor <= 0) {
  console.error('Uso: node scripts/gerar-nf-teste.mjs [valor]')
  process.exit(1)
}

// ── Dados fictícios mas estruturalmente válidos ───────────────────────────────

// CNPJ da Black Box Digital (real, dígitos verificadores corretos)
const CNPJ_EMITENTE = '42.118.015/0001-07'

// CNPJ fictício do tomador com dígitos verificadores válidos
const CNPJ_TOMADOR = '11.222.333/0001-81'

// Chave de acesso: 44 dígitos (formato real: cUF+AAMM+CNPJ+mod+serie+nNF+tpEmis+cNF+cDV)
const CHAVE = '35250542118015000107550010000000011000000015'

const now = new Date()
const dataEmissao = now.toLocaleDateString('pt-BR')
const horaEmissao = now.toLocaleTimeString('pt-BR')
const numeroNF = '000.000.001'
const serie = '001'

const valorFmt = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// ── Gerar PDF ─────────────────────────────────────────────────────────────────
const outPath = path.join(__dirname, `../nf-teste-${valor.toFixed(2).replace('.', '-')}.pdf`)
const doc = new PDFDocument({ size: 'A4', margin: 30 })
const stream = fs.createWriteStream(outPath)
doc.pipe(stream)

// Paleta
const ROXO   = '#6d28d9'
const CINZA  = '#6b7280'
const PRETO  = '#111827'

// ── Header ────────────────────────────────────────────────────────────────────
doc.rect(30, 30, 535, 60).fill(ROXO)
doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold')
  .text('DANFE', 40, 42)
doc.fontSize(9).font('Helvetica')
  .text('Documento Auxiliar da Nota Fiscal Eletrônica', 40, 64)

// Número e série à direita
doc.fontSize(10).font('Helvetica-Bold')
  .text(`NF-e Nº ${numeroNF}  Série ${serie}`, 350, 45, { width: 200, align: 'right' })
doc.fontSize(8).font('Helvetica')
  .text(`Emissão: ${dataEmissao} ${horaEmissao}`, 350, 62, { width: 200, align: 'right' })

doc.fillColor(PRETO)

// ── Chave de Acesso ───────────────────────────────────────────────────────────
doc.y = 105
doc.fontSize(8).font('Helvetica-Bold').fillColor(CINZA)
  .text('CHAVE DE ACESSO', 30)
doc.fontSize(9).font('Helvetica').fillColor(PRETO)
  .text(CHAVE, 30)

// ── Linha divisória ───────────────────────────────────────────────────────────
doc.moveTo(30, doc.y + 6).lineTo(565, doc.y + 6).stroke(CINZA)
doc.y += 14

// ── Emitente ──────────────────────────────────────────────────────────────────
doc.fontSize(8).font('Helvetica-Bold').fillColor(CINZA).text('EMITENTE', 30)
doc.fontSize(10).font('Helvetica-Bold').fillColor(PRETO)
  .text('Black Box Digital Ltda', 30)
doc.fontSize(9).font('Helvetica')
  .text(`CNPJ: ${CNPJ_EMITENTE}`, 30)
  .text('IE: Isento', 30)
  .text('Rua Exemplo, 123 — São Paulo / SP — CEP 01310-100', 30)

doc.y += 8
doc.moveTo(30, doc.y).lineTo(565, doc.y).stroke(CINZA)
doc.y += 10

// ── Tomador ───────────────────────────────────────────────────────────────────
doc.fontSize(8).font('Helvetica-Bold').fillColor(CINZA).text('TOMADOR DE SERVIÇOS', 30)
doc.fontSize(10).font('Helvetica-Bold').fillColor(PRETO)
  .text('Empresa Tomadora Ltda', 30)
doc.fontSize(9).font('Helvetica')
  .text(`CNPJ: ${CNPJ_TOMADOR}`, 30)
  .text('Rua do Tomador, 456 — Rio de Janeiro / RJ — CEP 20040-020', 30)

doc.y += 8
doc.moveTo(30, doc.y).lineTo(565, doc.y).stroke(CINZA)
doc.y += 10

// ── Discriminação do Serviço ──────────────────────────────────────────────────
doc.fontSize(8).font('Helvetica-Bold').fillColor(CINZA).text('DISCRIMINAÇÃO DO SERVIÇO', 30)
doc.fontSize(9).font('Helvetica').fillColor(PRETO)
  .text(
    'Prestação de serviços de marketing digital, gestão de campanhas de afiliados e ' +
    'consultoria em performance de mídia conforme contrato firmado entre as partes.',
    30, doc.y, { width: 535 }
  )

doc.y += 8
doc.moveTo(30, doc.y).lineTo(565, doc.y).stroke(CINZA)
doc.y += 10

// ── Valores ───────────────────────────────────────────────────────────────────
doc.fontSize(8).font('Helvetica-Bold').fillColor(CINZA).text('VALORES', 30)

const impostoISS  = valor * 0.05
const baseCalculo = valor

const linhas = [
  ['Valor dos Serviços (R$)',    valorFmt],
  ['Base de Cálculo (R$)',       baseCalculo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
  ['Alíquota ISS (%)',           '5,00'],
  ['Valor ISS (R$)',             impostoISS.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
]

linhas.forEach(([label, val]) => {
  const y = doc.y
  doc.fontSize(9).font('Helvetica').fillColor(CINZA).text(label, 30, y)
  doc.fontSize(9).font('Helvetica-Bold').fillColor(PRETO).text(val, 350, y, { width: 215, align: 'right' })
  doc.y += 14
})

// Total em destaque
doc.y += 4
doc.rect(30, doc.y, 535, 28).fill(ROXO)
doc.fontSize(11).font('Helvetica-Bold').fillColor('#ffffff')
  .text('VALOR TOTAL DA NOTA FISCAL', 40, doc.y + 8)
  .text(valorFmt, 40, doc.y + 8, { width: 515, align: 'right' })
doc.y += 36
doc.fillColor(PRETO)

// ── Natureza da Operação ──────────────────────────────────────────────────────
doc.y += 8
doc.fontSize(8).font('Helvetica-Bold').fillColor(CINZA).text('NATUREZA DA OPERAÇÃO', 30)
doc.fontSize(9).font('Helvetica').fillColor(PRETO)
  .text('Prestação de Serviços', 30)

doc.y += 4
doc.moveTo(30, doc.y).lineTo(565, doc.y).stroke(CINZA)
doc.y += 8

// ── Código de Verificação ─────────────────────────────────────────────────────
doc.fontSize(8).font('Helvetica-Bold').fillColor(CINZA)
  .text('CÓDIGO DE VERIFICAÇÃO / AUTENTICIDADE', 30)
doc.fontSize(8).font('Helvetica').fillColor(PRETO)
  .text(`Consulte a autenticidade desta NF-e em: https://nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx`, 30)
  .text(`Chave: ${CHAVE}`, 30)

// ── Rodapé ────────────────────────────────────────────────────────────────────
doc.fontSize(7).fillColor(CINZA)
  .text(
    `Nota Fiscal Eletrônica de Serviços — Gerada em ${dataEmissao} às ${horaEmissao} — Este documento é apenas para fins de teste.`,
    30, 780, { width: 535, align: 'center' }
  )

doc.end()

stream.on('finish', () => {
  console.log(`✓ PDF gerado: ${outPath}`)
  console.log(`  Valor: ${valorFmt}`)
  console.log(`  Chave: ${CHAVE}`)
  console.log(`  CNPJ emitente: ${CNPJ_EMITENTE}`)
})
