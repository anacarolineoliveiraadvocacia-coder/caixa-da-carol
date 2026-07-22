import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis,
  Tooltip, Legend, CartesianGrid
} from 'recharts'
import { db, ESCOPOS, escopoInfo } from '../db.js'
import { formatBRL, monthKey, lastNMonths, monthKeyShort } from '../utils/format.js'
import { resumoMes, rankingCategorias, variacao } from '../utils/stats.js'
import { addMonthsToKey } from '../utils/format.js'
import { saldoTotalContas, disponivelCartao, paidSetFrom } from '../utils/finance.js'
import MonthSwitcher from '../components/MonthSwitcher.jsx'
import { EmptyState } from '../components/ui.jsx'

const COR_PESSOAL = '#0ea5e9'
const COR_ESCRITORIO = '#7c3aed'

export default function Dashboard() {
  const [mes, setMes] = useState(monthKey(new Date()))
  const txs = useLiveQuery(() => db.transactions.toArray(), [], null)
  const accounts = useLiveQuery(() => db.accounts.toArray(), [], null)
  const cards = useLiveQuery(() => db.cards.toArray(), [], null)
  const invoicePayments = useLiveQuery(() => db.invoicePayments.toArray(), [], null)

  const carteira = useMemo(() => {
    if (!txs || !accounts || !cards || !invoicePayments) return null
    const paidSet = paidSetFrom(invoicePayments)
    const saldoContas = saldoTotalContas(accounts, txs)
    const dispCartoes = cards.reduce((a, c) => a + disponivelCartao(c, txs, paidSet), 0)
    return { saldoContas, dispCartoes, temContas: accounts.length > 0, temCartoes: cards.length > 0 }
  }, [txs, accounts, cards, invoicePayments])

  const dados = useMemo(() => {
    if (!txs) return null
    const atual = resumoMes(txs, mes)
    const anterior = resumoMes(txs, addMonthsToKey(mes, -1))
    const ranking = rankingCategorias(txs, mes).slice(0, 6)

    const pizza = ESCOPOS
      .map((e) => ({ name: e.label, value: atual.porEscopo[e.id].saidas, color: e.color }))
      .filter((p) => p.value > 0)

    const meses = lastNMonths(mes, 12).map((k) => {
      const r = resumoMes(txs, k)
      const linha = { mes: monthKeyShort(k) }
      for (const e of ESCOPOS) linha[e.label] = Math.round(r.porEscopo[e.id].saidas)
      return linha
    })

    return { atual, anterior, ranking, pizza, meses }
  }, [txs, mes])

  if (!dados) {
    return <div className="p-4 text-slate-400">Carregando...</div>
  }

  const { atual, anterior, ranking, pizza, meses } = dados
  const varSaidas = variacao(atual.saidas, anterior.saidas)
  const varEntradas = variacao(atual.entradas, anterior.entradas)
  const maxRanking = ranking[0]?.valor || 1

  return (
    <div className="p-4 space-y-4 fade-up">
      <MonthSwitcher value={mes} onChange={setMes} />

      {/* Saldo em contas e limite em cartoes */}
      {carteira && (carteira.temContas || carteira.temCartoes) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card">
            <p className="text-xs text-slate-400">🏦 Saldo em contas</p>
            <p className={`text-lg font-bold ${carteira.saldoContas < 0 ? 'text-rose-500' : 'text-slate-700'}`}>
              {formatBRL(carteira.saldoContas)}
            </p>
          </div>
          <div className="card">
            <p className="text-xs text-slate-400">💳 Limite disponível</p>
            <p className="text-lg font-bold text-slate-700">{formatBRL(carteira.dispCartoes)}</p>
          </div>
        </div>
      )}

      {/* Saldo do mes */}
      <div className="card bg-gradient-to-br from-marca to-marca-dark text-white border-0">
        <p className="text-marca-soft/90 text-sm">Saldo do mês</p>
        <p className="text-3xl font-bold mt-1">{formatBRL(atual.saldo)}</p>
        <div className="flex gap-4 mt-3 text-sm">
          <div>
            <p className="text-marca-soft/80">Entradas</p>
            <p className="font-semibold">{formatBRL(atual.entradas)}</p>
          </div>
          <div>
            <p className="text-marca-soft/80">Saídas</p>
            <p className="font-semibold">{formatBRL(atual.saidas)}</p>
          </div>
        </div>
      </div>

      {/* Comparativo com mes anterior */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-xs text-slate-400">Saídas vs. mês anterior</p>
          <p className="text-lg font-bold text-slate-700">{formatBRL(atual.saidas)}</p>
          <Delta valor={varSaidas} invertido />
        </div>
        <div className="card">
          <p className="text-xs text-slate-400">Entradas vs. mês anterior</p>
          <p className="text-lg font-bold text-slate-700">{formatBRL(atual.entradas)}</p>
          <Delta valor={varEntradas} />
        </div>
      </div>

      {/* Pizza Pessoal x Escritorio */}
      <div className="card">
        <h3 className="font-bold text-slate-700 mb-1">Distribuição por escopo</h3>
        <p className="text-xs text-slate-400 mb-2">Saídas do mês: {ESCOPOS.map((e) => e.label).join(' × ')}</p>
        {pizza.length === 0 ? (
          <EmptyState icon="🥧" title="Sem saídas neste mês" />
        ) : (
          <div className="flex items-center">
            <div className="w-1/2 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pizza}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {pizza.map((p) => (
                      <Cell key={p.name} fill={p.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatBRL(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-3">
              {pizza.map((p) => {
                const total = pizza.reduce((a, b) => a + b.value, 0)
                const pct = total ? Math.round((p.value / total) * 100) : 0
                return (
                  <div key={p.name}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ background: p.color }}
                      />
                      <span className="text-sm font-medium text-slate-600">{p.name}</span>
                      <span className="text-xs text-slate-400">{pct}%</span>
                    </div>
                    <p className="text-sm font-bold text-slate-700 ml-5">
                      {formatBRL(p.value)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Barras 12 meses */}
      <div className="card">
        <h3 className="font-bold text-slate-700 mb-1">Últimos 12 meses</h3>
        <p className="text-xs text-slate-400 mb-2">Saídas por escopo</p>
        <div className="h-56 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={meses} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={0} angle={-35} textAnchor="end" height={40} />
              <Tooltip formatter={(v) => formatBRL(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {ESCOPOS.map((e, i) => (
                <Bar
                  key={e.id}
                  dataKey={e.label}
                  stackId="s"
                  fill={e.color}
                  radius={i === ESCOPOS.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ranking de categorias */}
      <div className="card">
        <h3 className="font-bold text-slate-700 mb-3">Onde você mais gastou</h3>
        {ranking.length === 0 ? (
          <EmptyState icon="📊" title="Sem gastos neste mês" />
        ) : (
          <div className="space-y-3">
            {ranking.map((r) => (
              <div key={`${r.scope}-${r.category}`}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-600">
                    {r.category}
                    <span className="ml-2 text-xs" style={{ color: escopoInfo(r.scope).color }}>
                      {escopoInfo(r.scope).label}
                    </span>
                  </span>
                  <span className="font-bold text-slate-700">{formatBRL(r.valor)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(r.valor / maxRanking) * 100}%`,
                      background: escopoInfo(r.scope).color
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Delta({ valor, invertido = false }) {
  const subiu = valor > 0
  const neutro = Math.abs(valor) < 0.5
  // Para saidas, subir e ruim (vermelho). Para entradas, subir e bom (verde).
  const bom = invertido ? !subiu : subiu
  const cor = neutro ? 'text-slate-400' : bom ? 'text-emerald-600' : 'text-rose-500'
  const seta = neutro ? '→' : subiu ? '↑' : '↓'
  return (
    <p className={`text-xs font-semibold mt-1 ${cor}`}>
      {seta} {Math.abs(valor).toFixed(0)}%
    </p>
  )
}
