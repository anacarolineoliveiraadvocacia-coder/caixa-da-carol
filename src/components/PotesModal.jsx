import { useState } from 'react'
import { db } from '../db.js'
import { formatBRL, todayISO } from '../utils/format.js'
import Modal from './Modal.jsx'

export default function PotesModal({ open, onClose, income, potes }) {
  const [registrado, setRegistrado] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!income) return null

  const valor = Number(income.amount) || 0
  const partes = [
    { key: 'salario', label: 'Meu salário', emoji: '🙋‍♀️', pct: potes.salario, color: 'text-sky-600 bg-sky-50' },
    { key: 'escritorio', label: 'Caixa do escritório', emoji: '⚖️', pct: potes.escritorio, color: 'text-violet-600 bg-violet-50' },
    { key: 'reserva', label: 'Reserva de emergência', emoji: '🛟', pct: potes.reserva, color: 'text-emerald-600 bg-emerald-50' }
  ].map((p) => ({ ...p, valor: (valor * p.pct) / 100 }))

  const reservaParte = partes.find((p) => p.key === 'reserva')

  async function registrarAporte() {
    if (!reservaParte || reservaParte.valor <= 0) return
    setSaving(true)
    try {
      await db.reserveMovements.add({
        date: todayISO(),
        type: 'aporte',
        amount: reservaParte.valor,
        note: `Regra dos potes (${reservaParte.pct}% de ${formatBRL(valor)})`,
        createdAt: new Date().toISOString()
      })
      setRegistrado(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="💰 Como dividir essa entrada?"
      footer={
        <div className="space-y-2">
          {reservaParte.valor > 0 && (
            <button
              className="btn btn-lg btn-primary w-full"
              onClick={registrarAporte}
              disabled={saving || registrado}
            >
              {registrado
                ? '✓ Aporte registrado na reserva'
                : `Registrar ${formatBRL(reservaParte.valor)} na reserva`}
            </button>
          )}
          <button className="btn btn-lg btn-ghost w-full" onClick={onClose}>
            {registrado ? 'Concluir' : 'Fechar sem registrar'}
          </button>
        </div>
      }
    >
      <p className="text-sm text-slate-500 mb-4">
        Você registrou uma entrada de{' '}
        <strong className="text-emerald-600">{formatBRL(valor)}</strong>. Sugestão de
        divisão conforme seus potes:
      </p>
      <div className="space-y-3">
        {partes.map((p) => (
          <div
            key={p.key}
            className="flex items-center justify-between bg-white rounded-xl border border-slate-100 p-3"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${p.color}`}>
                {p.emoji}
              </div>
              <div>
                <p className="font-semibold text-slate-700 leading-tight">{p.label}</p>
                <p className="text-xs text-slate-400">{p.pct}% da entrada</p>
              </div>
            </div>
            <p className="font-bold text-slate-800">{formatBRL(p.valor)}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-4">
        Os potes de salário e escritório são apenas orientação de quanto separar. O
        aporte na reserva pode ser lançado automaticamente no botão abaixo.
      </p>
    </Modal>
  )
}
