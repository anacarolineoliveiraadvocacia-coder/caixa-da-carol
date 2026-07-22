import { uid, METODOS_CONTA } from '../db.js'
import { addMonthsToDate } from './format.js'
import { faturaDaCompra } from './cartao.js'

// --- Contas bancarias ---

// Saldo atual = saldo inicial + entradas na conta - saidas da conta
export function saldoConta(account, txs) {
  let saldo = Number(account.saldoInicial) || 0
  for (const t of txs) {
    if (t.accountId !== account.id) continue
    const v = Number(t.amount) || 0
    saldo += t.type === 'income' ? v : -v
  }
  return saldo
}

export function saldoTotalContas(accounts, txs) {
  return accounts.reduce((acc, a) => acc + saldoConta(a, txs), 0)
}

// Metodo desconta de conta bancaria?
export function afetaConta(method) {
  return METODOS_CONTA.includes(method)
}

// --- Cartoes de credito ---

// Conjunto de faturas pagas: "cardId:monthKey"
export function paidSetFrom(invoicePayments) {
  return new Set((invoicePayments || []).map((p) => `${p.cardId}:${p.monthKey}`))
}

// Uso em aberto = usoInicial + parcelas de crédito cujas faturas NAO foram pagas
export function usoCartao(card, txs, paidSet) {
  let uso = Number(card.usoInicial) || 0
  for (const t of txs) {
    if (t.cardId !== card.id || t.type !== 'expense') continue
    const chave = `${card.id}:${t.invoiceMonth}`
    if (paidSet.has(chave)) continue
    uso += Number(t.amount) || 0
  }
  return uso
}

export function disponivelCartao(card, txs, paidSet) {
  return (Number(card.limiteTotal) || 0) - usoCartao(card, txs, paidSet)
}

// Total de uma fatura (cartao + mes)
export function faturaTotal(cardId, monthKey, txs) {
  return txs
    .filter((t) => t.cardId === cardId && t.invoiceMonth === monthKey && t.type === 'expense')
    .reduce((a, t) => a + (Number(t.amount) || 0), 0)
}

export function faturaItens(cardId, monthKey, txs) {
  return txs
    .filter((t) => t.cardId === cardId && t.invoiceMonth === monthKey && t.type === 'expense')
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

// Gera as transacoes de uma compra no credito (a vista ou parcelada)
export function gerarParcelas({
  card,
  dateISO,
  total,
  nParcelas,
  scope,
  categoryId,
  category,
  subcategoryId,
  subcategory,
  description
}) {
  const n = Math.max(1, Number(nParcelas) || 1)
  const centavos = Math.round((Number(total) || 0) * 100)
  const base = Math.floor(centavos / n)
  const resto = centavos - base * n
  const purchaseId = uid()
  const recs = []
  for (let i = 0; i < n; i++) {
    const valorCent = base + (i === n - 1 ? resto : 0)
    const dParc = addMonthsToDate(dateISO, i)
    const invoiceMonth = faturaDaCompra(dParc, card.diaFechamento)
    recs.push({
      type: 'expense',
      method: 'credito',
      cardId: card.id,
      accountId: null,
      amount: valorCent / 100,
      date: dParc,
      purchaseDate: dateISO,
      purchaseId,
      parcelaNum: i + 1,
      parcelaTotal: n,
      invoiceMonth,
      scope,
      categoryId,
      category,
      subcategoryId: subcategoryId || null,
      subcategory: subcategory || null,
      description: n > 1 ? `${description} (${i + 1}/${n})` : description,
      createdAt: new Date().toISOString()
    })
  }
  return recs
}
