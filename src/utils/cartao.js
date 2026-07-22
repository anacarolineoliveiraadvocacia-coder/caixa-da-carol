import { addMonthsToKey, monthKey } from './format.js'

// Dado a data da compra (ISO) e o dia de fechamento, retorna a chave YYYY-MM
// da fatura em que a compra cai. Compras apos o fechamento vao para a proxima fatura.
export function faturaDaCompra(dateISO, diaFechamento) {
  const d = new Date(dateISO + 'T00:00:00')
  const dia = d.getDate()
  const base = monthKey(d)
  if (dia > diaFechamento) {
    return addMonthsToKey(base, 1)
  }
  return base
}

// Datas de fechamento e vencimento de uma fatura (chave YYYY-MM)
export function datasFatura(chaveFatura, diaFechamento, diaVencimento) {
  const [y, m] = chaveFatura.split('-').map(Number)
  const fechamento = new Date(y, m - 1, diaFechamento)
  // Vencimento normalmente cai no mes seguinte ao fechamento
  let vy = y
  let vm = m // proximo mes (m e 1-based, entao mes seguinte = index m)
  const vencimento = new Date(vy, vm, diaVencimento)
  return { fechamento, vencimento }
}
