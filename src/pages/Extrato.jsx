import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db.js'
import { formatBRL, monthKey, formatDataCurta } from '../utils/format.js'
import { inMonth } from '../utils/stats.js'
import MonthSwitcher from '../components/MonthSwitcher.jsx'
import TransactionForm from '../components/TransactionForm.jsx'
import { EmptyState, ScopeBadge, ScopeFilter, methodEmoji } from '../components/ui.jsx'
import { escopoInfo } from '../db.js'

export default function Extrato() {
  const [mes, setMes] = useState(monthKey(new Date()))
  const [filtro, setFiltro] = useState('todos')
  const [editando, setEditando] = useState(null)
  const txs = useLiveQuery(() => db.transactions.toArray(), [], null)
  const accounts = useLiveQuery(() => db.accounts.toArray(), [], null)
  const cards = useLiveQuery(() => db.cards.toArray(), [], null)

  const nomeConta = (id) => accounts?.find((a) => a.id === id)?.name
  const nomeCartao = (id) => cards?.find((c) => c.id === id)?.name

  const grupos = useMemo(() => {
    if (!txs) return null
    const doMes = txs
      .filter((t) => inMonth(t, mes))
      .filter((t) => (filtro === 'todos' ? true : t.scope === filtro))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.id || 0) - (a.id || 0)))

    const porDia = {}
    for (const t of doMes) {
      ;(porDia[t.date] = porDia[t.date] || []).push(t)
    }
    return Object.entries(porDia).map(([data, itens]) => ({ data, itens }))
  }, [txs, mes, filtro])

  async function excluir(t) {
    if (confirm(`Excluir "${t.description || 'lançamento'}" de ${formatBRL(t.amount)}?`)) {
      await db.transactions.delete(t.id)
    }
  }

  if (!grupos) return <div className="p-4 text-slate-400">Carregando...</div>

  const total = grupos.reduce((acc, g) => acc + g.itens.length, 0)

  return (
    <div className="p-4 space-y-4">
      <MonthSwitcher value={mes} onChange={setMes} />

      <ScopeFilter value={filtro} onChange={setFiltro} />

      {total === 0 ? (
        <EmptyState
          icon="🧾"
          title="Nenhum lançamento neste mês"
          subtitle="Toque no + para adicionar o primeiro."
        />
      ) : (
        <div className="space-y-4">
          {grupos.map((g) => (
            <div key={g.data}>
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2 ml-1 capitalize">
                {formatDataCurta(g.data)}
              </p>
              <div className="card p-0 divide-y divide-slate-100">
                {g.itens.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setEditando(t)}
                    className="w-full flex items-center gap-3 p-3.5 text-left active:bg-slate-50"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                      style={{ background: escopoInfo(t.scope).soft }}
                    >
                      {methodEmoji(t.method)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-700 truncate">
                        {t.description || 'Lançamento'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xs text-slate-400">
                          {t.category}{t.subcategory ? ` · ${t.subcategory}` : ''}
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{
                            color: escopoInfo(t.scope).color,
                            background: escopoInfo(t.scope).soft
                          }}
                        >
                          {escopoInfo(t.scope).label}
                        </span>
                        {t.cardId && nomeCartao(t.cardId) && (
                          <span className="text-[10px] text-slate-400">💳 {nomeCartao(t.cardId)}{t.parcelaTotal > 1 ? ` ${t.parcelaNum}/${t.parcelaTotal}` : ''}</span>
                        )}
                        {t.accountId && nomeConta(t.accountId) && (
                          <span className="text-[10px] text-slate-400">🏦 {nomeConta(t.accountId)}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`font-bold ${
                          t.type === 'income' ? 'text-emerald-600' : 'text-slate-700'
                        }`}
                      >
                        {t.type === 'income' ? '+' : '-'}
                        {formatBRL(t.amount)}
                      </p>
                      <span
                        onClick={(e) => {
                          e.stopPropagation()
                          excluir(t)
                        }}
                        className="text-xs text-slate-300 hover:text-rose-500"
                      >
                        excluir
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <TransactionForm
        open={!!editando}
        initial={editando}
        onClose={() => setEditando(null)}
      />
    </div>
  )
}
