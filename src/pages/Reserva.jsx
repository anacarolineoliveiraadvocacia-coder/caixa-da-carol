import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getSettings, saveSettings } from '../db.js'
import { formatBRL, todayISO, parseValor, formatDataBR, monthKey, nomeMes } from '../utils/format.js'
import { EmptyState } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'

export default function Reserva() {
  const [movOpen, setMovOpen] = useState(false)
  const [tipoMov, setTipoMov] = useState('aporte')
  const [metaOpen, setMetaOpen] = useState(false)

  const settings = useLiveQuery(() => getSettings(), [], null)
  const movs = useLiveQuery(
    () => db.reserveMovements.orderBy('date').reverse().toArray(),
    [],
    null
  )

  const dados = useMemo(() => {
    if (!movs || !settings) return null
    let saldo = 0
    for (const m of movs) {
      saldo += m.type === 'aporte' ? Number(m.amount) : -Number(m.amount)
    }
    const meta = Number(settings.reservaMeta) || 0
    const pct = meta > 0 ? Math.min(100, (saldo / meta) * 100) : 0

    // Projecao: media de aporte liquido dos ultimos 6 meses
    const hoje = monthKey(new Date())
    const seisMesesAtras = new Date()
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 5)
    let liquidoRecente = 0
    let mesesComMov = new Set()
    for (const m of movs) {
      const d = new Date(m.date + 'T00:00:00')
      if (d >= new Date(seisMesesAtras.getFullYear(), seisMesesAtras.getMonth(), 1)) {
        liquidoRecente += m.type === 'aporte' ? Number(m.amount) : -Number(m.amount)
        mesesComMov.add(monthKey(m.date))
      }
    }
    const nMeses = Math.max(1, mesesComMov.size)
    const mediaMensal = liquidoRecente / nMeses
    const falta = Math.max(0, meta - saldo)

    let projecao = null
    if (saldo >= meta && meta > 0) {
      projecao = { atingida: true }
    } else if (mediaMensal > 0) {
      const mesesRestantes = Math.ceil(falta / mediaMensal)
      const alvo = new Date()
      alvo.setMonth(alvo.getMonth() + mesesRestantes)
      projecao = {
        atingida: false,
        mesesRestantes,
        mediaMensal,
        data: `${nomeMes(alvo.getMonth())} de ${alvo.getFullYear()}`
      }
    }

    return { saldo, meta, pct, falta, projecao }
  }, [movs, settings])

  async function excluirMov(m) {
    if (confirm('Excluir esta movimentação da reserva?')) {
      await db.reserveMovements.delete(m.id)
    }
  }

  if (!dados) return <div className="p-4 text-slate-400">Carregando...</div>

  return (
    <div className="p-4 space-y-4">
      {/* Card principal */}
      <div className="card bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
        <div className="flex justify-between items-center">
          <p className="text-emerald-50 text-sm">🛟 Reserva de emergência</p>
          <button onClick={() => setMetaOpen(true)} className="text-xs bg-white/20 px-2 py-1 rounded-lg">
            Meta: {formatBRL(dados.meta)}
          </button>
        </div>
        <p className="text-3xl font-bold mt-2">{formatBRL(dados.saldo)}</p>
        <div className="mt-3">
          <div className="h-3 bg-white/25 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${dados.pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-emerald-50 mt-1.5">
            <span>{dados.pct.toFixed(0)}% da meta</span>
            {dados.falta > 0 ? (
              <span>Faltam {formatBRL(dados.falta)}</span>
            ) : (
              <span>Meta atingida! 🎉</span>
            )}
          </div>
        </div>
      </div>

      {/* Projecao */}
      {dados.projecao && (
        <div className="card">
          {dados.projecao.atingida ? (
            <p className="text-sm text-emerald-600 font-semibold">
              🎉 Você já atingiu sua meta de reserva. Considere aumentar a meta.
            </p>
          ) : (
            <>
              <p className="text-xs text-slate-400">Projeção no ritmo atual</p>
              <p className="text-sm text-slate-600 mt-1">
                Aportando cerca de{' '}
                <strong className="text-slate-800">{formatBRL(dados.projecao.mediaMensal)}</strong> por
                mês, você atinge a meta em{' '}
                <strong className="text-marca first-letter:uppercase">{dados.projecao.data}</strong>{' '}
                (~{dados.projecao.mesesRestantes} {dados.projecao.mesesRestantes === 1 ? 'mês' : 'meses'}).
              </p>
            </>
          )}
        </div>
      )}
      {!dados.projecao && dados.meta > 0 && (
        <div className="card">
          <p className="text-sm text-slate-500">
            Registre aportes regularmente para ver a projeção de quando atingirá a meta.
          </p>
        </div>
      )}

      {/* Botoes */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => { setTipoMov('aporte'); setMovOpen(true) }}
          className="btn btn-lg bg-emerald-500 text-white"
        >
          + Aporte
        </button>
        <button
          onClick={() => { setTipoMov('retirada'); setMovOpen(true) }}
          className="btn btn-lg btn-ghost"
        >
          − Retirada
        </button>
      </div>

      {/* Historico */}
      <div>
        <h3 className="font-bold text-slate-700 mb-2 ml-1">Histórico</h3>
        {movs.length === 0 ? (
          <EmptyState icon="🐷" title="Nenhuma movimentação ainda" subtitle="Comece com um aporte." />
        ) : (
          <div className="card p-0 divide-y divide-slate-100">
            {movs.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3.5">
                <div>
                  <p className="font-semibold text-slate-700">
                    {m.type === 'aporte' ? 'Aporte' : 'Retirada'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDataBR(m.date)}
                    {m.note ? ` • ${m.note}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className={`font-bold ${m.type === 'aporte' ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {m.type === 'aporte' ? '+' : '−'}{formatBRL(m.amount)}
                  </p>
                  <button onClick={() => excluirMov(m)} className="text-xs text-slate-300">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MovForm open={movOpen} tipo={tipoMov} onClose={() => setMovOpen(false)} />
      <MetaForm open={metaOpen} meta={dados.meta} onClose={() => setMetaOpen(false)} />
    </div>
  )
}

function MovForm({ open, tipo, onClose }) {
  const [valor, setValor] = useState('')
  const [data, setData] = useState(todayISO())
  const [nota, setNota] = useState('')

  async function salvar() {
    const amount = parseValor(valor)
    if (amount <= 0) return alert('Informe um valor válido.')
    await db.reserveMovements.add({
      type: tipo,
      amount,
      date: data,
      note: nota.trim(),
      createdAt: new Date().toISOString()
    })
    setValor(''); setNota(''); setData(todayISO())
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tipo === 'aporte' ? '＋ Novo aporte' : '－ Nova retirada'}
      footer={<button className="btn btn-lg btn-primary w-full" onClick={salvar}>Salvar</button>}
    >
      <div className="space-y-4">
        <div>
          <label className="field-label">Valor</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">R$</span>
            <input
              inputMode="decimal"
              className="field-input pl-11 text-lg font-semibold"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <div>
          <label className="field-label">Data</label>
          <input type="date" className="field-input" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Observação (opcional)</label>
          <input className="field-input" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ex.: sobra do mês" />
        </div>
      </div>
    </Modal>
  )
}

function MetaForm({ open, meta, onClose }) {
  const [valor, setValor] = useState('')
  useMemoInit(open, () => setValor(meta ? String(meta).replace('.', ',') : ''))

  async function salvar() {
    const nova = parseValor(valor)
    await saveSettings({ reservaMeta: nova })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="🎯 Meta da reserva"
      footer={<button className="btn btn-lg btn-primary w-full" onClick={salvar}>Salvar meta</button>}
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-500">
          Uma reserva saudável costuma cobrir de 3 a 6 meses das suas despesas.
        </p>
        <div>
          <label className="field-label">Valor da meta</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">R$</span>
            <input
              inputMode="decimal"
              className="field-input pl-11 text-lg font-semibold"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}

// pequeno helper para reinicializar estado ao abrir um modal
function useMemoInit(open, fn) {
  useEffect(() => {
    if (open) fn()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
}
