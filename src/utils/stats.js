import { monthKey } from './format.js'
import { ESCOPOS } from '../db.js'

export function inMonth(tx, key) {
  return monthKey(tx.date) === key
}

export function sumBy(txs, pred) {
  return txs.filter(pred).reduce((acc, t) => acc + Number(t.amount || 0), 0)
}

export function resumoMes(txs, key) {
  // exclui pagamentos de fatura (transferencia, nao gasto novo)
  const doMes = txs.filter((t) => inMonth(t, key) && !t.isFaturaPgto)
  const entradas = sumBy(doMes, (t) => t.type === 'income')
  const saidas = sumBy(doMes, (t) => t.type === 'expense')

  // Totais por escopo (funciona com qualquer quantidade de escopos)
  const porEscopo = {}
  for (const e of ESCOPOS) {
    porEscopo[e.id] = {
      entradas: sumBy(doMes, (t) => t.type === 'income' && t.scope === e.id),
      saidas: sumBy(doMes, (t) => t.type === 'expense' && t.scope === e.id)
    }
  }

  return {
    entradas,
    saidas,
    saldo: entradas - saidas,
    porEscopo,
    total: doMes.length
  }
}

// Ranking de categorias (por saidas) no mes
export function rankingCategorias(txs, key, scope = null) {
  const doMes = txs.filter(
    (t) =>
      inMonth(t, key) &&
      t.type === 'expense' &&
      !t.isFaturaPgto &&
      (scope ? t.scope === scope : true)
  )
  const mapa = {}
  for (const t of doMes) {
    const chave = `${t.scope}||${t.category || 'Outros'}`
    mapa[chave] = (mapa[chave] || 0) + Number(t.amount || 0)
  }
  return Object.entries(mapa)
    .map(([chave, valor]) => {
      const [sc, cat] = chave.split('||')
      return { scope: sc, category: cat, valor }
    })
    .sort((a, b) => b.valor - a.valor)
}

export function variacao(atual, anterior) {
  if (anterior === 0) return atual === 0 ? 0 : 100
  return ((atual - anterior) / anterior) * 100
}
