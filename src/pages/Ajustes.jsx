import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getSettings, saveSettings } from '../db.js'
import { parseValor, formatNumberBR } from '../utils/format.js'
import { exportarCSV, exportarJSON, importarJSON } from '../utils/backup.js'
import SyncCard from '../components/SyncCard.jsx'

export default function Ajustes() {
  const settings = useLiveQuery(() => getSettings(), [], null)
  const [potes, setPotes] = useState({ salario: 60, escritorio: 20, reserva: 20 })
  const [meta, setMeta] = useState('')
  const [msg, setMsg] = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    if (settings) {
      setPotes(settings.potes)
      setMeta(formatNumberBR(settings.reservaMeta))
    }
  }, [settings])

  const somaPotes = Number(potes.salario) + Number(potes.escritorio) + Number(potes.reserva)

  async function salvarPotes() {
    if (somaPotes !== 100) {
      setMsg('⚠️ A soma dos potes precisa dar 100%.')
      return
    }
    await saveSettings({ potes: {
      salario: Number(potes.salario),
      escritorio: Number(potes.escritorio),
      reserva: Number(potes.reserva)
    }})
    flash('✓ Potes salvos.')
  }

  async function salvarMeta() {
    await saveSettings({ reservaMeta: parseValor(meta) })
    flash('✓ Meta salva.')
  }

  function flash(t) {
    setMsg(t)
    setTimeout(() => setMsg(''), 2500)
  }

  async function onImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!confirm('Importar backup substitui TODOS os dados atuais. Continuar?')) {
      e.target.value = ''
      return
    }
    try {
      const text = await file.text()
      await importarJSON(text)
      flash('✓ Backup restaurado com sucesso.')
    } catch (err) {
      alert('Erro ao importar: ' + err.message)
    }
    e.target.value = ''
  }

  if (!settings) return <div className="p-4 text-slate-400">Carregando...</div>

  return (
    <div className="p-4 space-y-4">
      {msg && (
        <div className="card bg-marca-soft border-marca/20 text-marca-dark text-sm font-medium">
          {msg}
        </div>
      )}

      {/* Sincronização na nuvem */}
      <SyncCard />

      {/* Regra dos potes */}
      <div className="card space-y-3">
        <div>
          <h3 className="font-bold text-slate-700">🫙 Regra dos potes</h3>
          <p className="text-xs text-slate-400">
            Como dividir cada entrada que você recebe.
          </p>
        </div>
        <PoteRow label="Meu salário" value={potes.salario} onChange={(v) => setPotes((p) => ({ ...p, salario: v }))} />
        <PoteRow label="Caixa do escritório" value={potes.escritorio} onChange={(v) => setPotes((p) => ({ ...p, escritorio: v }))} />
        <PoteRow label="Reserva de emergência" value={potes.reserva} onChange={(v) => setPotes((p) => ({ ...p, reserva: v }))} />
        <div className={`flex justify-between text-sm font-semibold ${somaPotes === 100 ? 'text-emerald-600' : 'text-rose-500'}`}>
          <span>Soma</span>
          <span>{somaPotes}%</span>
        </div>
        <button className="btn btn-lg btn-primary w-full" onClick={salvarPotes}>Salvar potes</button>
      </div>

      {/* Meta da reserva */}
      <div className="card space-y-3">
        <div>
          <h3 className="font-bold text-slate-700">🎯 Meta da reserva</h3>
          <p className="text-xs text-slate-400">Valor que você quer acumular na reserva.</p>
        </div>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">R$</span>
          <input inputMode="decimal" className="field-input pl-11 font-semibold"
            value={meta} onChange={(e) => setMeta(e.target.value)} />
        </div>
        <button className="btn btn-lg btn-primary w-full" onClick={salvarMeta}>Salvar meta</button>
      </div>

      {/* Backup */}
      <div className="card space-y-3">
        <div>
          <h3 className="font-bold text-slate-700">💾 Backup dos dados</h3>
          <p className="text-xs text-slate-400">
            Tudo fica só neste aparelho. Exporte com frequência para não perder nada.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button className="btn btn-lg btn-ghost" onClick={exportarJSON}>⬇️ Backup (JSON)</button>
          <button className="btn btn-lg btn-ghost" onClick={exportarCSV}>📄 Exportar CSV</button>
        </div>
        <button className="btn btn-lg btn-ghost w-full border border-dashed border-slate-300"
          onClick={() => fileRef.current?.click()}>
          ⬆️ Restaurar backup (JSON)
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImport} />
      </div>

      <p className="text-xs text-slate-400 text-center px-6">
        Caixa da Carol • Seus dados nunca saem do seu celular. Sem login, sem servidor.
      </p>
    </div>
  )
}

function PoteRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-600 flex-1">{label}</span>
      <div className="relative w-24">
        <input
          type="number"
          min="0"
          max="100"
          className="field-input text-right pr-7 py-2"
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
      </div>
    </div>
  )
}
