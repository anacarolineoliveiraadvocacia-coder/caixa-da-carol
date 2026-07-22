import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getSettings } from '../db.js'
import { formatBRL, monthKey, monthKeyLabel, formatDataBR, formatDataCurta, addMonthsToKey } from '../utils/format.js'
import { datasFatura } from '../utils/cartao.js'
import MonthSwitcher from '../components/MonthSwitcher.jsx'
import { EmptyState, ScopeBadge } from '../components/ui.jsx'

export default function Fatura() {
  const [fatura, setFatura] = useState(monthKey(new Date()))
  const settings = useLiveQuery(() => getSettings(), [], null)
  const txs = useLiveQuery(
    () => db.transactions.where('invoiceMonth').equals(fatura).toArray(),
    [fatura],
    null
  )

  const dados = useMemo(() => {
    if (!txs || !settings) return null
    const itens = txs
      .filter((t) => t.type === 'expense')
      .sort((a, b) => (a.date < b.date ? -1 : 1))
    const total = itens.reduce((a, t) => a + Number(t.amount), 0)
    const pessoal = itens.filter((t) => t.scope === 'pessoal').reduce((a, t) => a + Number(t.amount), 0)
    const escritorio = total - pessoal
    const { fechamento, vencimento } = datasFatura(
      fatura,
      settings.cartao.diaFechamento,
      settings.cartao.diaVencimento
    )
    return { itens, total, pessoal, escritorio, fechamento, vencimento }
  }, [txs, settings, fatura])

  if (!dados) return <div className="p-4 text-slate-400">Carregando...</div>

  const isoData = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  return (
    <div className="p-4 space-y-4">
      <MonthSwitcher value={fatura} onChange={setFatura} />

      <div className="card bg-gradient-to-br from-slate-800 to-slate-900 text-white border-0">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-slate-300 text-sm">Fatura de {monthKeyLabel(fatura)}</p>
            <p className="text-3xl font-bold mt-1">{formatBRL(dados.total)}</p>
          </div>
          <span className="text-2xl">🧾</span>
        </div>
        <div className="flex gap-4 mt-4 text-sm">
          <div>
            <p className="text-slate-400 text-xs">Fechamento</p>
            <p className="font-semibold">{formatDataBR(isoData(dados.fechamento))}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Vencimento</p>
            <p className="font-semibold">{formatDataBR(isoData(dados.vencimento))}</p>
          </div>
        </div>
      </div>

      {dados.total > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card">
            <p className="text-xs text-slate-400">Pessoal na fatura</p>
            <p className="text-lg font-bold text-pessoal">{formatBRL(dados.pessoal)}</p>
          </div>
          <div className="card">
            <p className="text-xs text-slate-400">Escritório na fatura</p>
            <p className="text-lg font-bold text-escritorio">{formatBRL(dados.escritorio)}</p>
          </div>
        </div>
      )}

      {dados.itens.length === 0 ? (
        <EmptyState
          icon="💳"
          title="Sem compras no crédito nesta fatura"
          subtitle="Lançamentos com forma 'Crédito' aparecem aqui."
        />
      ) : (
        <div className="card p-0 divide-y divide-slate-100">
          {dados.itens.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3.5">
              <div className="min-w-0">
                <p className="font-semibold text-slate-700 truncate">
                  {t.description || 'Compra'}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-400">{formatDataCurta(t.date)}</span>
                  <ScopeBadge scope={t.scope} />
                </div>
              </div>
              <p className="font-bold text-slate-700 shrink-0">{formatBRL(t.amount)}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400 text-center px-4">
        Compras após o dia {settings.cartao.diaFechamento} entram na fatura do mês
        seguinte. Ajuste as datas em Configurações.
      </p>
    </div>
  )
}
