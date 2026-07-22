import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, ESCOPOS } from '../db.js'
import { formatBRL, monthKey, monthKeyLabel } from '../utils/format.js'
import { resumoMes, rankingCategorias } from '../utils/stats.js'
import MonthSwitcher from '../components/MonthSwitcher.jsx'

export default function Relatorio() {
  const [mes, setMes] = useState(monthKey(new Date()))
  const txs = useLiveQuery(() => db.transactions.toArray(), [], null)

  const dados = useMemo(() => {
    if (!txs) return null
    const r = resumoMes(txs, mes)
    const porEscopo = ESCOPOS.map((e) => ({
      ...e,
      cats: rankingCategorias(txs, mes, e.id)
    }))
    return { r, porEscopo }
  }, [txs, mes])

  if (!dados) return <div className="p-4 text-slate-400">Carregando...</div>

  const { r, porEscopo } = dados

  return (
    <div className="p-4 space-y-4 print-page">
      <div className="no-print space-y-3">
        <MonthSwitcher value={mes} onChange={setMes} />
        <button onClick={() => window.print()} className="btn btn-lg btn-primary w-full">
          🖨️ Imprimir / Salvar PDF
        </button>
        <p className="text-xs text-slate-400 text-center">
          Toque acima e escolha "Salvar como PDF" no menu de impressão do celular.
        </p>
      </div>

      {/* Conteudo imprimivel */}
      <div className="card space-y-5">
        <div className="text-center border-b border-slate-100 pb-3">
          <h1 className="text-xl font-bold text-marca">Caixa da Carol</h1>
          <p className="text-slate-500 first-letter:uppercase">Relatório de {monthKeyLabel(mes)}</p>
        </div>

        {/* Resumo geral */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-emerald-50 rounded-xl p-3">
            <p className="text-xs text-slate-500">Entradas</p>
            <p className="font-bold text-emerald-600">{formatBRL(r.entradas)}</p>
          </div>
          <div className="bg-rose-50 rounded-xl p-3">
            <p className="text-xs text-slate-500">Saídas</p>
            <p className="font-bold text-rose-500">{formatBRL(r.saidas)}</p>
          </div>
          <div className="bg-slate-100 rounded-xl p-3">
            <p className="text-xs text-slate-500">Saldo</p>
            <p className={`font-bold ${r.saldo >= 0 ? 'text-slate-700' : 'text-rose-500'}`}>
              {formatBRL(r.saldo)}
            </p>
          </div>
        </div>

        {/* Comparativo Pessoal x Escritorio */}
        <div>
          <h2 className="font-bold text-slate-700 mb-2">
            {ESCOPOS.map((e) => e.label).join(' × ')}
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-left border-b border-slate-100">
                <th className="py-1.5 font-medium"></th>
                {ESCOPOS.map((e) => (
                  <th key={e.id} className="py-1.5 font-medium text-right" style={{ color: e.color }}>
                    {e.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-slate-600">
              <tr className="border-b border-slate-50">
                <td className="py-2">Entradas</td>
                {ESCOPOS.map((e) => (
                  <td key={e.id} className="py-2 text-right">{formatBRL(r.porEscopo[e.id].entradas)}</td>
                ))}
              </tr>
              <tr className="border-b border-slate-50">
                <td className="py-2">Saídas</td>
                {ESCOPOS.map((e) => (
                  <td key={e.id} className="py-2 text-right">{formatBRL(r.porEscopo[e.id].saidas)}</td>
                ))}
              </tr>
              <tr className="font-bold text-slate-800">
                <td className="py-2">Saldo</td>
                {ESCOPOS.map((e) => (
                  <td key={e.id} className="py-2 text-right">
                    {formatBRL(r.porEscopo[e.id].entradas - r.porEscopo[e.id].saidas)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Categorias por escopo */}
        <div className="grid grid-cols-1 gap-4">
          {porEscopo.map((e) => (
            <CatTable key={e.id} titulo={`Saídas · ${e.label}`} cor={e.color} cats={e.cats} />
          ))}
        </div>

        <div className="border-t border-slate-100 pt-3 text-xs text-slate-400 space-y-2">
          <div>
            <p className="font-semibold text-slate-500 mb-1">💡 Vale a pena separar as contas?</p>
            <p>
              Este mês, o escritório movimentou{' '}
              {formatBRL(r.porEscopo.escritorio.entradas + r.porEscopo.escritorio.saidas)} (entradas
              + saídas). Quando esse volume ficar alto e constante, considere abrir uma conta PJ
              (CNPJ) separada da conta pessoal (CPF) para organização e vantagens fiscais.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-500 mb-1">👶 Custo do filho no mês</p>
            <p>
              As saídas com o filho somaram {formatBRL(r.porEscopo.filho.saidas)}
              {r.saidas > 0 && ` — ${Math.round((r.porEscopo.filho.saidas / r.saidas) * 100)}% de tudo que saiu no mês`}.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function CatTable({ titulo, cor, cats }) {
  const total = cats.reduce((a, c) => a + c.valor, 0)
  return (
    <div>
      <h3 className="font-semibold mb-1.5" style={{ color: cor }}>
        {titulo} — {formatBRL(total)}
      </h3>
      {cats.length === 0 ? (
        <p className="text-sm text-slate-400">Sem saídas neste escopo.</p>
      ) : (
        <table className="w-full text-sm">
          <tbody className="text-slate-600">
            {cats.map((c) => (
              <tr key={c.category} className="border-b border-slate-50">
                <td className="py-1.5">{c.category}</td>
                <td className="py-1.5 text-right font-medium">{formatBRL(c.valor)}</td>
                <td className="py-1.5 text-right text-slate-400 w-12">
                  {total ? Math.round((c.valor / total) * 100) : 0}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
