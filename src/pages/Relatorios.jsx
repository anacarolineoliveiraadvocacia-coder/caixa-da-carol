import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { db, escopoInfo } from '../db.js'
import { formatBRL, monthKey, monthKeyLabel, addMonthsToKey, todayISO, formatDataBR } from '../utils/format.js'
import { emojiCategoria, nomeCategoria } from '../utils/categorias.js'
import { EmptyState, ScopeFilter } from '../components/ui.jsx'

const PALETA = [
  '#0ea5e9', '#7c3aed', '#0f766e', '#f59e0b', '#ef4444', '#10b981',
  '#ec4899', '#6366f1', '#f97316', '#14b8a6', '#8b5cf6', '#84cc16',
  '#06b6d4', '#e11d48', '#64748b'
]

const PRESETS = [
  { id: 'mes', label: 'Mês', meses: 1 },
  { id: 'trimestre', label: 'Trimestre', meses: 3 },
  { id: 'semestre', label: 'Semestre', meses: 6 },
  { id: 'ano', label: 'Ano', meses: 12 },
  { id: 'custom', label: 'Personalizado', meses: 0 }
]

function primeiroDia(key) {
  return key + '-01'
}
function ultimoDia(key) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m, 0).getDate()
  return `${key}-${String(d).padStart(2, '0')}`
}

export default function Relatorios() {
  const [preset, setPreset] = useState('mes')
  const [mesRef, setMesRef] = useState(monthKey(new Date()))
  const [customIni, setCustomIni] = useState(monthKey(new Date()) + '-01')
  const [customFim, setCustomFim] = useState(todayISO())
  const [escopo, setEscopo] = useState('todos')
  const [catAberta, setCatAberta] = useState(null)

  const txs = useLiveQuery(() => db.transactions.toArray(), [], null)
  const categories = useLiveQuery(() => db.categories.toArray(), [], null)

  const periodo = useMemo(() => {
    if (preset === 'custom') {
      return { ini: customIni, fim: customFim, label: `${formatDataBR(customIni)} a ${formatDataBR(customFim)}` }
    }
    const p = PRESETS.find((x) => x.id === preset)
    const iniKey = addMonthsToKey(mesRef, -(p.meses - 1))
    if (preset === 'mes') {
      return { ini: primeiroDia(mesRef), fim: ultimoDia(mesRef), label: monthKeyLabel(mesRef) }
    }
    return {
      ini: primeiroDia(iniKey),
      fim: ultimoDia(mesRef),
      label: `${monthKeyLabel(iniKey)} → ${monthKeyLabel(mesRef)}`
    }
  }, [preset, mesRef, customIni, customFim])

  const dados = useMemo(() => {
    if (!txs || !categories) return null
    const dentro = txs.filter(
      (t) =>
        t.type === 'expense' &&
        !t.isFaturaPgto &&
        t.date >= periodo.ini &&
        t.date <= periodo.fim &&
        (escopo === 'todos' ? true : t.scope === escopo)
    )
    const total = dentro.reduce((a, t) => a + Number(t.amount || 0), 0)

    // agrupa por categoria
    const mapa = new Map()
    for (const t of dentro) {
      const key = t.categoryId ?? `nome:${t.category || 'Outros'}`
      if (!mapa.has(key)) {
        mapa.set(key, {
          key,
          categoryId: t.categoryId ?? null,
          nome: t.categoryId ? nomeCategoria(categories, t.categoryId, t.category) : (t.category || 'Outros'),
          scope: t.scope,
          valor: 0,
          itens: []
        })
      }
      const g = mapa.get(key)
      g.valor += Number(t.amount || 0)
      g.itens.push(t)
    }
    const grupos = [...mapa.values()].sort((a, b) => b.valor - a.valor)
    grupos.forEach((g, i) => (g.cor = PALETA[i % PALETA.length]))
    return { total, grupos, count: dentro.length }
  }, [txs, categories, periodo, escopo])

  if (!dados) return <div className="p-4 text-slate-400">Carregando...</div>

  const pizza = dados.grupos.filter((g) => g.valor > 0).map((g) => ({ name: g.nome, value: g.valor, color: g.cor }))
  const detalhe = catAberta ? dados.grupos.find((g) => g.key === catAberta) : null

  return (
    <div className="p-4 space-y-4">
      {/* Filtro de periodo */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPreset(p.id)}
            className={`chip whitespace-nowrap ${preset === p.id ? 'bg-marca text-white border-marca' : 'bg-white border-slate-200 text-slate-500'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === 'custom' ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">De</label>
            <input type="date" className="field-input" value={customIni} onChange={(e) => setCustomIni(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Até</label>
            <input type="date" className="field-input" value={customFim} onChange={(e) => setCustomFim(e.target.value)} />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => setMesRef(addMonthsToKey(mesRef, -1))} className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 text-slate-500 text-lg">‹</button>
          <span className="font-semibold text-slate-700 text-center flex-1 text-sm first-letter:uppercase">{periodo.label}</span>
          <button onClick={() => setMesRef(addMonthsToKey(mesRef, 1))} className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 text-slate-500 text-lg">›</button>
        </div>
      )}

      {/* Escopo */}
      <ScopeFilter value={escopo} onChange={setEscopo} />

      {/* Total */}
      <div className="card bg-gradient-to-br from-marca to-marca-dark text-white border-0 text-center">
        <p className="text-marca-soft/90 text-sm">Total gasto no período</p>
        <p className="text-3xl font-bold mt-1">{formatBRL(dados.total)}</p>
        <p className="text-marca-soft/80 text-xs mt-1">{dados.count} lançamento(s)</p>
      </div>

      {dados.grupos.length === 0 ? (
        <EmptyState icon="📊" title="Sem gastos neste período" />
      ) : (
        <>
          {/* Pizza */}
          <div className="card">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pizza} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {pizza.map((p) => (<Cell key={p.name} fill={p.color} />))}
                  </Pie>
                  <Tooltip formatter={(v) => formatBRL(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Lista por categoria (toque para detalhar) */}
          <div className="space-y-2.5">
            {dados.grupos.map((g) => {
              const pct = dados.total ? (g.valor / dados.total) * 100 : 0
              return (
                <button key={g.key} onClick={() => setCatAberta(g.key)} className="card w-full text-left active:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: g.cor + '22' }}>
                      {categories ? emojiCategoria(categories, g.categoryId) : '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-700 truncate">{g.nome}</span>
                        <span className="font-bold text-slate-700 ml-2">{formatBRL(g.valor)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-1.5">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: g.cor }} />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-slate-400">{escopo === 'todos' ? escopoInfo(g.scope).label : `${g.itens.length} itens`}</span>
                        <span className="text-xs text-slate-400">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <span className="text-slate-300">›</span>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Detalhe por subcategoria */}
      <DetalheCategoria grupo={detalhe} categories={categories} onClose={() => setCatAberta(null)} />
    </div>
  )
}

function DetalheCategoria({ grupo, categories, onClose }) {
  const subs = useMemo(() => {
    if (!grupo) return []
    const mapa = new Map()
    for (const t of grupo.itens) {
      const nome = t.subcategory || '(sem subcategoria)'
      mapa.set(nome, (mapa.get(nome) || 0) + Number(t.amount || 0))
    }
    return [...mapa.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor)
  }, [grupo])

  if (!grupo) return null
  const maxV = subs[0]?.valor || 1

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-slate-50 rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[85vh] flex flex-col fade-up">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>{categories ? emojiCategoria(categories, grupo.categoryId) : '📦'}</span>
            {grupo.nome}
          </h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 text-xl">×</button>
        </div>
        <div className="px-5 py-3 overflow-y-auto">
          <p className="text-sm text-slate-500 mb-3">Total: <strong className="text-slate-800">{formatBRL(grupo.valor)}</strong></p>
          <div className="space-y-3">
            {subs.map((s) => (
              <div key={s.nome}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{s.nome}</span>
                  <span className="font-semibold text-slate-700">{formatBRL(s.valor)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(s.valor / maxV) * 100}%`, background: grupo.cor }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="px-5 py-4 safe-bottom">
          <button onClick={onClose} className="btn btn-lg btn-ghost w-full">Fechar</button>
        </div>
      </div>
    </div>
  )
}
