const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})

export function formatBRL(value) {
  const n = Number(value) || 0
  return brl.format(n)
}

// Formata numero sem simbolo (para inputs): 1234.5 -> "1.234,50"
export function formatNumberBR(value) {
  const n = Number(value) || 0
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Converte texto digitado ("1.234,56" ou "1234.56" ou "1234,56") em number
export function parseValor(str) {
  if (typeof str === 'number') return str
  if (!str) return 0
  let s = String(str).trim().replace(/[^0-9.,-]/g, '')
  if (s === '') return 0
  const hasComma = s.includes(',')
  const hasDot = s.includes('.')
  if (hasComma && hasDot) {
    // Formato pt-BR: ponto separa milhar, virgula separa decimal
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (hasComma) {
    s = s.replace(',', '.')
  } else if (hasDot) {
    // So ponto: pode ser milhar (3.000 -> 3000) ou decimal (3.5 -> 3.5)
    // Se o padrao for grupos de 3 digitos (ex.: 3.000 / 1.250.000), e milhar.
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, '')
    }
  }
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
]
const MESES_CURTO = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez'
]

export function nomeMes(mesIndex) {
  return MESES[mesIndex] || ''
}
export function nomeMesCurto(mesIndex) {
  return MESES_CURTO[mesIndex] || ''
}

// Chave de mes YYYY-MM a partir de Date ou string ISO
export function monthKey(date) {
  const d = date instanceof Date ? date : new Date(date + 'T00:00:00')
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function monthKeyLabel(key) {
  const [y, m] = key.split('-')
  return `${nomeMes(Number(m) - 1)} de ${y}`
}

export function monthKeyShort(key) {
  const [y, m] = key.split('-')
  return `${nomeMesCurto(Number(m) - 1)}/${y.slice(2)}`
}

// Data de hoje em YYYY-MM-DD (local)
export function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatDataBR(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function formatDataCurta(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return `${String(d.getDate()).padStart(2, '0')} ${nomeMesCurto(d.getMonth())}`
}

// Adiciona meses a uma data ISO (YYYY-MM-DD), preservando o dia (com clamp no fim do mes)
export function addMonthsToDate(iso, delta) {
  const [y, m, d] = iso.split('-').map(Number)
  const alvo = new Date(y, m - 1 + delta, 1)
  const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate()
  const dia = Math.min(d, ultimoDia)
  const yy = alvo.getFullYear()
  const mm = String(alvo.getMonth() + 1).padStart(2, '0')
  const dd = String(dia).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

// Adiciona/subtrai meses a uma chave YYYY-MM
export function addMonthsToKey(key, delta) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return monthKey(d)
}

// Lista dos ultimos N meses (chaves), do mais antigo ao mais recente, terminando em endKey
export function lastNMonths(endKey, n) {
  const arr = []
  for (let i = n - 1; i >= 0; i--) {
    arr.push(addMonthsToKey(endKey, -i))
  }
  return arr
}
