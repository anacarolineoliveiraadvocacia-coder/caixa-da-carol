import { db, syncGuard } from '../db.js'
import { formatDataBR, todayISO } from './format.js'

// Coleta todos os dados do app num único objeto (usado por backup e sincronização)
export async function coletarSnapshot() {
  const [
    transactions, fixedBills, billPayments, reserveMovements, settings,
    accounts, cards, categories, invoicePayments
  ] = await Promise.all([
    db.transactions.toArray(),
    db.fixedBills.toArray(),
    db.billPayments.toArray(),
    db.reserveMovements.toArray(),
    db.settings.toArray(),
    db.accounts.toArray(),
    db.cards.toArray(),
    db.categories.toArray(),
    db.invoicePayments.toArray()
  ])
  return {
    transactions, fixedBills, billPayments, reserveMovements, settings,
    accounts, cards, categories, invoicePayments
  }
}

// Verifica se um snapshot tem dados "de verdade" (não só categorias semeadas)
export function snapshotTemDados(d) {
  if (!d) return false
  return (
    (d.transactions?.length || 0) > 0 ||
    (d.accounts?.length || 0) > 0 ||
    (d.cards?.length || 0) > 0 ||
    (d.reserveMovements?.length || 0) > 0 ||
    (d.fixedBills?.length || 0) > 0
  )
}

// Aplica um snapshot ao banco local (substitui tudo).
// fromRemote=true evita que a aplicação dispare um novo "push" para a nuvem.
export async function aplicarSnapshot(d, { fromRemote = false } = {}) {
  if (!d) return
  if (fromRemote) syncGuard.applyingRemote = true
  try {
    await db.transaction(
      'rw',
      db.transactions, db.fixedBills, db.billPayments, db.reserveMovements,
      db.settings, db.accounts, db.cards, db.categories, db.invoicePayments,
      async () => {
        await Promise.all([
          db.transactions.clear(), db.fixedBills.clear(), db.billPayments.clear(),
          db.reserveMovements.clear(), db.settings.clear(), db.accounts.clear(),
          db.cards.clear(), db.categories.clear(), db.invoicePayments.clear()
        ])
        if (d.transactions?.length) await db.transactions.bulkAdd(d.transactions)
        if (d.fixedBills?.length) await db.fixedBills.bulkAdd(d.fixedBills)
        if (d.billPayments?.length) await db.billPayments.bulkAdd(d.billPayments)
        if (d.reserveMovements?.length) await db.reserveMovements.bulkAdd(d.reserveMovements)
        if (d.settings?.length) await db.settings.bulkPut(d.settings)
        if (d.accounts?.length) await db.accounts.bulkAdd(d.accounts)
        if (d.cards?.length) await db.cards.bulkAdd(d.cards)
        if (d.categories?.length) await db.categories.bulkAdd(d.categories)
        if (d.invoicePayments?.length) await db.invoicePayments.bulkAdd(d.invoicePayments)
      }
    )
  } finally {
    if (fromRemote) syncGuard.applyingRemote = false
  }
}

async function dumpAll() {
  return {
    app: 'caixa-da-carol',
    versao: 2,
    exportadoEm: new Date().toISOString(),
    dados: await coletarSnapshot()
  }
}

function baixarArquivo(conteudo, nome, tipo) {
  const blob = new Blob([conteudo], { type: tipo })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function exportarJSON() {
  const data = await dumpAll()
  baixarArquivo(
    JSON.stringify(data, null, 2),
    `caixa-da-carol-backup-${todayISO()}.json`,
    'application/json'
  )
}

function csvEscape(v) {
  const s = String(v ?? '')
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export async function exportarCSV() {
  const [txs, accounts, cards] = await Promise.all([
    db.transactions.orderBy('date').toArray(),
    db.accounts.toArray(),
    db.cards.toArray()
  ])
  const nomeConta = (id) => accounts.find((a) => a.id === id)?.name || ''
  const nomeCartao = (id) => cards.find((c) => c.id === id)?.name || ''
  const cabecalho = ['Data', 'Tipo', 'Escopo', 'Categoria', 'Subcategoria', 'Descricao', 'Forma de pagamento', 'Conta', 'Cartao', 'Parcela', 'Valor']
  const linhas = txs.map((t) => [
    formatDataBR(t.date),
    t.type === 'income' ? 'Entrada' : 'Saida',
    t.scope === 'escritorio' ? 'Escritorio' : 'Pessoal',
    t.category || '',
    t.subcategory || '',
    t.description || '',
    t.method || '',
    nomeConta(t.accountId),
    nomeCartao(t.cardId),
    t.parcelaTotal > 1 ? `${t.parcelaNum}/${t.parcelaTotal}` : '',
    (t.type === 'income' ? '' : '-') + Number(t.amount).toFixed(2).replace('.', ',')
  ])
  // BOM para o Excel reconhecer acentos + separador ; (padrao pt-BR)
  const conteudo =
    '﻿' +
    [cabecalho, ...linhas].map((l) => l.map(csvEscape).join(';')).join('\r\n')
  baixarArquivo(conteudo, `caixa-da-carol-lancamentos-${todayISO()}.csv`, 'text/csv;charset=utf-8')
}

export async function importarJSON(fileText) {
  const parsed = JSON.parse(fileText)
  if (parsed.app !== 'caixa-da-carol' || !parsed.dados) {
    throw new Error('Arquivo de backup invalido.')
  }
  // Importar de arquivo é uma mudança local real -> deixa os hooks dispararem
  // (se estiver logada, isso envia os dados importados para a nuvem também).
  await aplicarSnapshot(parsed.dados, { fromRemote: false })
}
